/**
 * Server-only market news aggregation for construction / industrial investment.
 * Provider order: NewsData → Currents → NewsAPI → RSS → curated SAMPLE_MARKET_NEWS.
 * API keys never leave the server.
 */

import {
  SAMPLE_MARKET_NEWS,
  demoMarketNewsResponse,
  type MarketNewsItem,
  type MarketNewsMode,
  type MarketNewsResponse,
  type MarketNewsTag,
} from "@/data/market-news";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ITEMS = 16;

const KEYWORDS =
  'industrial warehouse OR manufacturing OR "metal building" OR "pre-engineered" OR logistics park OR "distribution center"';

const RELEVANCE_TERMS = [
  "industrial",
  "warehouse",
  "manufacturing",
  "logistics",
  "distribution",
  "construction",
  "metal building",
  "pre-engineered",
  "peb",
  "pemb",
  "spec industrial",
  "build-to-suit",
  "fulfillment",
  "cross-dock",
  "plant expansion",
  "self-storage",
  "southeast",
  "tennessee",
  "georgia",
  "carolina",
  "texas",
  "mississippi",
  "alabama",
  "kentucky",
];

const NOISE_TERMS = [
  "crypto",
  "celebrity",
  "sports score",
  "recipe",
  "horoscope",
  "dating",
  "lottery",
];

/** In-memory cache (per server instance / serverless warm start) */
let cache: { at: number; data: MarketNewsResponse } | null = null;

function env(name: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function hashId(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  return `n-${Math.abs(h).toString(36)}`;
}

function scoreRelevance(title: string, summary: string): number {
  const blob = `${title} ${summary}`.toLowerCase();
  if (NOISE_TERMS.some((t) => blob.includes(t))) return -100;
  let score = 0;
  for (const t of RELEVANCE_TERMS) {
    if (blob.includes(t)) score += t.length > 8 ? 3 : 2;
  }
  if (blob.includes("metal building") || blob.includes("pre-engineered") || blob.includes("peb")) {
    score += 8;
  }
  return score;
}

function inferTags(title: string, summary: string): MarketNewsTag[] {
  const blob = `${title} ${summary}`.toLowerCase();
  const tags = new Set<MarketNewsTag>();
  if (/warehouse|distribution|fulfillment|cross-?dock|spec\b/.test(blob)) tags.add("warehouse");
  if (/manufactur|plant expansion|factory|oem|supplier/.test(blob)) tags.add("manufacturing");
  if (/logistic|freight|intermodal|supply chain/.test(blob)) tags.add("logistics");
  if (/industrial|flex industrial|light industrial/.test(blob)) tags.add("industrial");
  if (/construction|under.?construction|groundbreak/.test(blob)) tags.add("construction");
  if (/reit|portfolio|acquisition|capital|investor|fund/.test(blob)) tags.add("capital-markets");
  if (/southeast|south.?east|\bse\b|carolina|georgia|alabama|tennessee|kentucky|mississippi|arkansas/.test(blob)) {
    tags.add("southeast");
  }
  if (/\btexas\b|\bdfw\b|dallas|houston|longview/.test(blob)) {
    tags.add("texas");
    tags.add("southeast");
  }
  if (/\btennessee\b|\bnashville\b|memphis|portland/.test(blob)) tags.add("tennessee");
  if (/carolina|charlotte|greenville|raleigh/.test(blob)) tags.add("carolinas");
  if (/metal building|pre-engineered|peb|pemb|self-?storage|clear.?span/.test(blob)) {
    tags.add("pemb-relevant");
  }
  if (tags.has("warehouse") || tags.has("manufacturing") || tags.has("industrial")) {
    tags.add("pemb-relevant");
  }
  if (tags.size === 0) tags.add("industrial");
  return [...tags];
}

function whyItMatters(title: string, summary: string, tags: MarketNewsTag[]): string | undefined {
  if (tags.includes("warehouse") || /warehouse|distribution/.test(`${title} ${summary}`.toLowerCase())) {
    return "Warehouse / distribution shells are core PEMB / Div 13 opportunities — track bid timing vs fab capacity.";
  }
  if (tags.includes("manufacturing")) {
    return "Manufacturing expansions often need crane-ready industrial metal buildings — strong Ascent product fit.";
  }
  if (tags.includes("southeast") || tags.includes("tennessee")) {
    return "Within or near the Portland, TN ~600-mi footprint — prioritize relationship GCs and package speed.";
  }
  if (tags.includes("capital-markets")) {
    return "Capital conditions shape developer start timing — reinforce schedule certainty in proposals.";
  }
  if (tags.includes("pemb-relevant")) {
    return "Relevant to metal building systems demand — useful context for VP Sales / rep conversations.";
  }
  return undefined;
}

function normalizeItem(
  raw: {
    title: string;
    summary?: string;
    url: string;
    source: string;
    publishedAt: string;
    imageUrl?: string | null;
  },
  mode: MarketNewsMode,
): MarketNewsItem | null {
  const title = stripHtml(raw.title || "").slice(0, 240);
  if (!title || !raw.url) return null;
  const summary = stripHtml(raw.summary || "").slice(0, 420);
  if (scoreRelevance(title, summary) < 2 && mode !== "demo") return null;
  const tags = inferTags(title, summary);
  let publishedAt = raw.publishedAt;
  const t = new Date(publishedAt).getTime();
  if (!Number.isFinite(t)) publishedAt = new Date().toISOString();
  else publishedAt = new Date(t).toISOString();

  return {
    id: hashId(`${raw.url}|${title}`),
    title,
    summary: summary || title,
    url: raw.url,
    source: raw.source || "News",
    publishedAt,
    imageUrl: raw.imageUrl ?? null,
    tags,
    whyItMatters: whyItMatters(title, summary, tags),
    mode,
  };
}

function rankAndCap(items: MarketNewsItem[], mode: MarketNewsMode, provider: string | null, message?: string): MarketNewsResponse {
  const seen = new Set<string>();
  const ranked = items
    .filter((i) => {
      const k = i.url || i.id;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((i) => ({
      item: i,
      score: scoreRelevance(i.title, i.summary) + (i.tags.includes("pemb-relevant") ? 2 : 0),
    }))
    .filter((x) => x.score >= 2 || mode === "demo")
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.item.publishedAt).getTime() - new Date(a.item.publishedAt).getTime();
    })
    .slice(0, MAX_ITEMS)
    .map((x) => x.item);

  if (ranked.length === 0) {
    return demoMarketNewsResponse(message ?? "No relevant headlines from provider — showing curated offline intel.");
  }

  return {
    fetchedAt: new Date().toISOString(),
    mode,
    provider,
    items: ranked,
    message,
  };
}

// ── NewsData.io ─────────────────────────────────────────────────────────────

async function fetchNewsData(apiKey: string): Promise<MarketNewsResponse> {
  const params = new URLSearchParams({
    apikey: apiKey,
    q: KEYWORDS,
    country: "us",
    language: "en",
    category: "business",
    size: "20",
  });
  const res = await fetch(`https://newsdata.io/api/1/news?${params}`, {
    headers: { Accept: "application/json", "User-Agent": "AscentBookingsDashboard/1.0" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`NewsData HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const json = (await res.json()) as {
    status?: string;
    results?: Array<{
      title?: string;
      description?: string;
      content?: string;
      link?: string;
      source_id?: string;
      source_name?: string;
      pubDate?: string;
      image_url?: string;
    }>;
    message?: string;
  };
  if (json.status && json.status !== "success") {
    throw new Error(json.message || `NewsData status ${json.status}`);
  }
  const items: MarketNewsItem[] = [];
  for (const r of json.results ?? []) {
    const n = normalizeItem(
      {
        title: r.title ?? "",
        summary: r.description || r.content || "",
        url: r.link ?? "",
        source: r.source_name || r.source_id || "NewsData",
        publishedAt: r.pubDate ?? new Date().toISOString(),
        imageUrl: r.image_url ?? null,
      },
      "live",
    );
    if (n) items.push(n);
  }
  return rankAndCap(items, "live", "newsdata.io", "Live headlines via NewsData.io");
}

// ── Currents API ────────────────────────────────────────────────────────────

async function fetchCurrents(apiKey: string): Promise<MarketNewsResponse> {
  const params = new URLSearchParams({
    keywords: "industrial warehouse manufacturing logistics construction",
    language: "en",
    apiKey,
  });
  const res = await fetch(`https://api.currentsapi.services/v1/search?${params}`, {
    headers: { Accept: "application/json", "User-Agent": "AscentBookingsDashboard/1.0" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Currents HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const json = (await res.json()) as {
    status?: string;
    news?: Array<{
      title?: string;
      description?: string;
      url?: string;
      author?: string;
      published?: string;
      image?: string;
    }>;
  };
  const items: MarketNewsItem[] = [];
  for (const r of json.news ?? []) {
    const n = normalizeItem(
      {
        title: r.title ?? "",
        summary: r.description ?? "",
        url: r.url ?? "",
        source: r.author || "Currents",
        publishedAt: r.published ?? new Date().toISOString(),
        imageUrl: r.image ?? null,
      },
      "live",
    );
    if (n) items.push(n);
  }
  return rankAndCap(items, "live", "currentsapi.services", "Live headlines via Currents API");
}

// ── NewsAPI.org (optional; free tier often localhost-only) ───────────────────

async function fetchNewsApi(apiKey: string): Promise<MarketNewsResponse> {
  const params = new URLSearchParams({
    q: '(industrial OR warehouse OR manufacturing OR logistics) AND (construction OR development OR plant)',
    language: "en",
    sortBy: "publishedAt",
    pageSize: "20",
    apiKey,
  });
  const res = await fetch(`https://newsapi.org/v2/everything?${params}`, {
    headers: { Accept: "application/json", "User-Agent": "AscentBookingsDashboard/1.0" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`NewsAPI HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const json = (await res.json()) as {
    status?: string;
    articles?: Array<{
      title?: string;
      description?: string;
      url?: string;
      source?: { name?: string };
      publishedAt?: string;
      urlToImage?: string;
    }>;
    message?: string;
  };
  if (json.status === "error") throw new Error(json.message || "NewsAPI error");
  const items: MarketNewsItem[] = [];
  for (const r of json.articles ?? []) {
    const n = normalizeItem(
      {
        title: r.title ?? "",
        summary: r.description ?? "",
        url: r.url ?? "",
        source: r.source?.name || "NewsAPI",
        publishedAt: r.publishedAt ?? new Date().toISOString(),
        imageUrl: r.urlToImage ?? null,
      },
      "live",
    );
    if (n) items.push(n);
  }
  return rankAndCap(
    items,
    "live",
    "newsapi.org",
    "Live headlines via NewsAPI.org (free tier is often localhost-only; use paid key in production)",
  );
}

// ── RSS (no key) ────────────────────────────────────────────────────────────

const RSS_FEEDS = [
  {
    name: "Construction Dive",
    url: "https://www.constructiondive.com/feeds/news/",
  },
  {
    name: "Area Development",
    url: "https://www.areadevelopment.com/rss/rss.xml",
  },
];

function extractTag(block: string, tag: string): string {
  const cdata = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"));
  if (cdata?.[1]) return cdata[1].trim();
  const plain = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return plain?.[1]?.trim() ?? "";
}

function parseRssItems(xml: string, feedName: string): MarketNewsItem[] {
  const items: MarketNewsItem[] = [];
  const blocks = xml.split(/<item[\s>]/i).slice(1);
  for (const raw of blocks) {
    const block = raw.split(/<\/item>/i)[0] ?? "";
    const title = stripHtml(extractTag(block, "title"));
    const link = stripHtml(extractTag(block, "link")) || stripHtml(extractTag(block, "guid"));
    const desc = stripHtml(extractTag(block, "description"));
    const pub =
      extractTag(block, "pubDate") ||
      extractTag(block, "dc:date") ||
      extractTag(block, "published") ||
      new Date().toISOString();
    const n = normalizeItem(
      {
        title,
        summary: desc,
        url: link,
        source: feedName,
        publishedAt: pub,
      },
      "rss",
    );
    if (n) items.push(n);
  }
  return items;
}

async function fetchRss(): Promise<MarketNewsResponse> {
  const collected: MarketNewsItem[] = [];
  const errors: string[] = [];

  await Promise.all(
    RSS_FEEDS.map(async (feed) => {
      try {
        const res = await fetch(feed.url, {
          headers: {
            Accept: "application/rss+xml, application/xml, text/xml, */*",
            "User-Agent": "AscentBookingsDashboard/1.0 (+https://ascentbuildings.com)",
          },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) {
          errors.push(`${feed.name} HTTP ${res.status}`);
          return;
        }
        const xml = await res.text();
        if (!xml.includes("<item") && !xml.includes("<entry")) {
          errors.push(`${feed.name} no items`);
          return;
        }
        collected.push(...parseRssItems(xml, feed.name));
      } catch (err) {
        errors.push(`${feed.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }),
  );

  if (collected.length === 0) {
    throw new Error(errors.join("; ") || "RSS feeds returned no items");
  }

  return rankAndCap(
    collected,
    "rss",
    "rss",
    errors.length
      ? `RSS headlines (partial: ${errors.join("; ")})`
      : "Headlines from public industry RSS (no API key)",
  );
}

// ── Orchestrator ────────────────────────────────────────────────────────────

function preferredProvider(): "newsdata" | "currents" | "newsapi" | "auto" {
  const p = (env("NEWS_API_PROVIDER") || env("MARKET_NEWS_PROVIDER") || "auto").toLowerCase();
  if (p === "newsdata" || p === "currents" || p === "newsapi") return p;
  return "auto";
}

async function fetchLiveProviders(): Promise<MarketNewsResponse | null> {
  const newsdataKey = env("NEWSDATA_API_KEY") || env("NEWS_API_KEY");
  const currentsKey = env("CURRENTS_API_KEY");
  const newsapiKey = env("NEWSAPI_API_KEY");
  const pref = preferredProvider();

  const attempts: Array<{ name: string; run: () => Promise<MarketNewsResponse> }> = [];

  const pushNewsdata = () => {
    if (newsdataKey) attempts.push({ name: "newsdata", run: () => fetchNewsData(newsdataKey) });
  };
  const pushCurrents = () => {
    if (currentsKey) attempts.push({ name: "currents", run: () => fetchCurrents(currentsKey) });
  };
  const pushNewsapi = () => {
    if (newsapiKey) attempts.push({ name: "newsapi", run: () => fetchNewsApi(newsapiKey) });
  };

  if (pref === "newsdata") {
    pushNewsdata();
    pushCurrents();
    pushNewsapi();
  } else if (pref === "currents") {
    pushCurrents();
    pushNewsdata();
    pushNewsapi();
  } else if (pref === "newsapi") {
    pushNewsapi();
    pushNewsdata();
    pushCurrents();
  } else {
    pushNewsdata();
    pushCurrents();
    pushNewsapi();
  }

  for (const a of attempts) {
    try {
      const data = await a.run();
      if (data.items.length > 0 && data.mode === "live") return data;
    } catch (err) {
      console.error(`[market-news] provider ${a.name} failed:`, err);
    }
  }
  return null;
}

/**
 * Fetch market news with cache + provider cascade + demo fallback.
 * Never returns an empty forever-failed payload without SAMPLE_MARKET_NEWS.
 */
export async function fetchMarketNews(options?: { bypassCache?: boolean }): Promise<MarketNewsResponse> {
  if (!options?.bypassCache && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return {
      ...cache.data,
      message: cache.data.message
        ? `${cache.data.message} (cached)`
        : `Cached ${Math.round((Date.now() - cache.at) / 1000)}s ago`,
    };
  }

  try {
    const live = await fetchLiveProviders();
    if (live && live.items.length > 0) {
      cache = { at: Date.now(), data: live };
      return live;
    }
  } catch (err) {
    console.error("[market-news] live providers:", err);
  }

  try {
    const rss = await fetchRss();
    if (rss.items.length > 0) {
      cache = { at: Date.now(), data: rss };
      return rss;
    }
  } catch (err) {
    console.error("[market-news] rss:", err);
  }

  // Always succeed with curated offline intel
  const demo = demoMarketNewsResponse();
  // Cache demo briefly so we don't hammer failed providers on every request
  cache = { at: Date.now(), data: demo };
  return demo;
}

/** Expose sample for tests / warm start */
export function getSampleMarketNews(): MarketNewsResponse {
  return {
    fetchedAt: new Date().toISOString(),
    mode: "demo",
    provider: null,
    items: SAMPLE_MARKET_NEWS,
    message: "Curated offline market intelligence",
  };
}
