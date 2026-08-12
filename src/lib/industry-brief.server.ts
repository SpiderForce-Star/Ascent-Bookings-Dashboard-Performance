/**
 * Server-only industry headlines for Corporate summary.
 * Public RSS first; optional NEWS_API_KEY / NEWSDATA_API_KEY; association fallback.
 */

import {
  INDUSTRY_ASSOCIATIONS,
  fallbackIndustryBrief,
  type IndustryBriefResponse,
  type IndustryHeadline,
} from "@/data/industry-brief";

const CACHE_TTL_MS = 20 * 60 * 1000;
const FETCH_MS = 9_000;
const MAX_HEADLINES = 8;

const RSS_FEEDS = [
  { name: "Construction Dive", url: "https://www.constructiondive.com/feeds/news/" },
  { name: "ENR", url: "https://www.enr.com/rss/articles" },
  { name: "Metal Construction News", url: "https://www.metalconstructionnews.com/feed/" },
];

const RELEVANCE =
  /construction|steel|metal building|nonresidential|warehouse|industrial|manufacturing|pemb|pre-engineered|logistics/i;

let cache: { at: number; data: IndustryBriefResponse } | null = null;

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

function extractTag(block: string, tag: string): string {
  const cdata = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"));
  if (cdata?.[1]) return cdata[1].trim();
  const plain = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return plain?.[1]?.trim() ?? "";
}

function parseRss(xml: string, feedName: string): IndustryHeadline[] {
  const out: IndustryHeadline[] = [];
  const blocks = xml.split(/<item[\s>]/i).slice(1);
  const atom = blocks.length ? blocks : xml.split(/<entry[\s>]/i).slice(1);
  for (const raw of atom) {
    const block = raw.split(/<\/item>|<\/entry>/i)[0] ?? "";
    const title = stripHtml(extractTag(block, "title"));
    const link =
      stripHtml(extractTag(block, "link")) ||
      (block.match(/<link[^>]+href=["']([^"']+)/i)?.[1] ?? "") ||
      stripHtml(extractTag(block, "guid"));
    const pub =
      extractTag(block, "pubDate") ||
      extractTag(block, "published") ||
      extractTag(block, "updated") ||
      extractTag(block, "dc:date") ||
      new Date().toISOString();
    if (!title || !link) continue;
    if (!RELEVANCE.test(title) && !RELEVANCE.test(feedName)) continue;
    const parsed = new Date(pub);
    const publishedAt = Number.isFinite(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
    out.push({
      id: `${feedName}-${link}`.slice(0, 180),
      title: title.slice(0, 220),
      source: feedName,
      publishedAt,
      url: link,
    });
  }
  return out;
}

async function fetchOneRss(feed: { name: string; url: string }): Promise<IndustryHeadline[]> {
  const res = await fetch(feed.url, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml, */*",
      "User-Agent": "AscentBookingsDashboard/1.0 (+https://ascentbuildings.com)",
    },
    signal: AbortSignal.timeout(FETCH_MS),
  });
  if (!res.ok) throw new Error(`${feed.name} HTTP ${res.status}`);
  const xml = await res.text();
  return parseRss(xml, feed.name);
}

async function fetchOptionalNewsApi(): Promise<IndustryHeadline[]> {
  const key = env("NEWSDATA_API_KEY") || env("NEWS_API_KEY");
  if (!key) return [];
  try {
    const q = encodeURIComponent("construction OR steel OR warehouse OR industrial OR metal building");
    const res = await fetch(
      `https://newsdata.io/api/1/news?apikey=${encodeURIComponent(key)}&q=${q}&language=en&category=business`,
      {
        headers: { Accept: "application/json", "User-Agent": "AscentBookingsDashboard/1.0" },
        signal: AbortSignal.timeout(FETCH_MS),
      },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as {
      results?: Array<{ title?: string; link?: string; source_id?: string; pubDate?: string }>;
    };
    const items: IndustryHeadline[] = [];
    for (const r of json.results ?? []) {
      if (!r.title || !r.link) continue;
      if (!RELEVANCE.test(r.title)) continue;
      items.push({
        id: r.link.slice(0, 180),
        title: r.title.slice(0, 220),
        source: r.source_id || "News",
        publishedAt: r.pubDate ? new Date(r.pubDate).toISOString() : new Date().toISOString(),
        url: r.link,
      });
    }
    return items;
  } catch {
    return [];
  }
}

function dedupe(items: IndustryHeadline[]): IndustryHeadline[] {
  const seen = new Set<string>();
  const out: IndustryHeadline[] = [];
  for (const h of items) {
    const key = h.title.toLowerCase().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(h);
  }
  return out.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, MAX_HEADLINES);
}

export async function fetchIndustryBrief(options?: { bypassCache?: boolean }): Promise<IndustryBriefResponse> {
  if (!options?.bypassCache && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.data;
  }

  const collected: IndustryHeadline[] = [];
  const errors: string[] = [];

  await Promise.all(
    RSS_FEEDS.map(async (feed) => {
      try {
        collected.push(...(await fetchOneRss(feed)));
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }),
  );

  if (collected.length < 4) {
    collected.push(...(await fetchOptionalNewsApi()));
  }

  const headlines = dedupe(collected);
  const data: IndustryBriefResponse =
    headlines.length > 0
      ? {
          fetchedAt: new Date().toISOString(),
          mode: errors.length ? "rss" : "rss",
          message: errors.length
            ? `Industry headlines (partial). ${errors.slice(0, 2).join("; ")}`
            : "Public industry RSS. Not MBMA shipment statistics.",
          headlines,
          associations: INDUSTRY_ASSOCIATIONS,
        }
      : fallbackIndustryBrief(
          errors.length
            ? `RSS unavailable (${errors.slice(0, 2).join("; ")}). Association links below.`
            : undefined,
        );

  cache = { at: Date.now(), data };
  return data;
}
