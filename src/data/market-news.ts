/**
 * Construction / industrial investment news — types + curated offline fallback.
 * For internal sales awareness (VP Sales / field). Not investment advice.
 */

export type MarketNewsMode = "live" | "rss" | "demo";

export type MarketNewsTag =
  | "industrial"
  | "warehouse"
  | "manufacturing"
  | "logistics"
  | "southeast"
  | "capital-markets"
  | "pemb-relevant"
  | "construction"
  | "texas"
  | "tennessee"
  | "carolinas";

export interface MarketNewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  /** ISO 8601 */
  publishedAt: string;
  imageUrl?: string | null;
  tags: MarketNewsTag[];
  /** Short Ascent / PEMB / Div 13 sales angle when we can infer */
  whyItMatters?: string;
  mode: MarketNewsMode;
}

export interface MarketNewsResponse {
  fetchedAt: string;
  mode: MarketNewsMode;
  provider: string | null;
  items: MarketNewsItem[];
  message?: string;
}

/** Tag chips used in the UI filter bar */
export const NEWS_FILTER_TAGS = [
  "all",
  "industrial",
  "warehouse",
  "manufacturing",
  "southeast",
] as const;

export type NewsFilterId = (typeof NEWS_FILTER_TAGS)[number];

/**
 * Curated 2025–2026 market context for offline / demo mode.
 * Themes track public industrial investment narratives — labeled curated, not licensed wire copy.
 */
export const SAMPLE_MARKET_NEWS: MarketNewsItem[] = [
  {
    id: "demo-se-industrial-portfolio-01",
    title: "Southeast industrial portfolios stay liquid as logistics capital rotates south",
    summary:
      "Investors continue targeting SE warehouse and light industrial assets along major interstates, with portfolio trades highlighting multi-market platforms across TN, GA, SC, and NC.",
    url: "https://www.constructiondive.com/",
    source: "Market context (curated)",
    publishedAt: "2026-07-22T14:00:00.000Z",
    imageUrl: null,
    tags: ["industrial", "logistics", "southeast", "capital-markets", "pemb-relevant"],
    whyItMatters:
      "Portfolio liquidity supports repeat developer PEB packages — Ascent can win multi-building shells when platforms standardize metal building systems.",
    mode: "demo",
  },
  {
    id: "demo-dfw-spec-warehouse-02",
    title: "Spec and BTS warehouse pipelines remain deep in major logistics hubs",
    summary:
      "Large-scale logistics parks continue to advance speculative and build-to-suit warehouse programs at AllianceTexas-scale corridors and peer SE nodes, keeping structural packages in design/bid.",
    url: "https://www.areadevelopment.com/",
    source: "Market context (curated)",
    publishedAt: "2026-07-08T11:30:00.000Z",
    imageUrl: null,
    tags: ["warehouse", "logistics", "industrial", "pemb-relevant"],
    whyItMatters:
      "Spec warehouse = high clear-span PEMB / Div 13 demand. Lead with docks, clear height, and fab capacity from Portland, TN.",
    mode: "demo",
  },
  {
    id: "demo-tn-mfg-expansion-03",
    title: "Tennessee manufacturing expansions keep supplier buildings on the drawing board",
    summary:
      "Auto and advanced manufacturing suppliers in Middle and East Tennessee continue to announce plant expansions and support facilities that need clear-span industrial shells.",
    url: "https://www.areadevelopment.com/",
    source: "Market context (curated)",
    publishedAt: "2026-06-28T16:00:00.000Z",
    imageUrl: null,
    tags: ["manufacturing", "tennessee", "southeast", "pemb-relevant", "industrial"],
    whyItMatters:
      "Home-plant market: short freight, fast estimate cycles. Crane-ready industrial PEMB is a core Ascent product fit.",
    mode: "demo",
  },
  {
    id: "demo-ga-mfg-04",
    title: "Georgia industrial corridors add manufacturing and distribution capacity",
    summary:
      "Northwest Atlanta and I-75/I-85 industrial parks keep absorbing manufacturing and distribution demand, with multi-building campuses still active in design and bidding.",
    url: "https://www.constructiondive.com/",
    source: "Market context (curated)",
    publishedAt: "2026-06-15T13:00:00.000Z",
    imageUrl: null,
    tags: ["manufacturing", "warehouse", "southeast", "pemb-relevant"],
    whyItMatters:
      "Competitive SE bidders — win with response time and fab slot certainty on campus-phase metal building packages.",
    mode: "demo",
  },
  {
    id: "demo-ms-tx-mfg-05",
    title: "Mississippi and East Texas light industrial / energy-adjacent shops expand selectively",
    summary:
      "Ag processing support, light manufacturing, and energy services shops remain active in MS and East TX, with smaller but higher-velocity metal building opportunities.",
    url: "https://www.areadevelopment.com/",
    source: "Market context (curated)",
    publishedAt: "2026-05-30T12:00:00.000Z",
    imageUrl: null,
    tags: ["manufacturing", "industrial", "texas", "southeast", "pemb-relevant"],
    whyItMatters:
      "Extended territory: filter on margin vs freight. Strong fit for standard industrial and ag PEMB product.",
    mode: "demo",
  },
  {
    id: "demo-national-vacancy-06",
    title: "National industrial vacancy and under-construction trends still favor metal building demand",
    summary:
      "Even as national industrial vacancy normalizes from peak tightness, under-construction volumes and modernization of older stock continue to support new warehouse and manufacturing shells.",
    url: "https://www.constructiondive.com/",
    source: "Market context (curated)",
    publishedAt: "2026-05-12T15:45:00.000Z",
    imageUrl: null,
    tags: ["industrial", "warehouse", "construction", "pemb-relevant"],
    whyItMatters:
      "Soft landing ≠ zero starts — quote validity and steel path messaging matter when owners stretch bid cycles.",
    mode: "demo",
  },
  {
    id: "demo-i77-logistics-07",
    title: "Logistics parks along I-77 corridor keep Carolinas distribution active",
    summary:
      "I-77 industrial nodes in the Carolinas continue to see distribution and cross-dock facilities advance, supporting ongoing demand for clear-span warehouse packages.",
    url: "https://www.areadevelopment.com/",
    source: "Market context (curated)",
    publishedAt: "2026-04-28T10:00:00.000Z",
    imageUrl: null,
    tags: ["logistics", "warehouse", "carolinas", "southeast", "pemb-relevant"],
    whyItMatters:
      "NC/SC primary radius: large warehouse packages with freight sensitivity — confirm fab slots early.",
    mode: "demo",
  },
  {
    id: "demo-i40-i24-08",
    title: "I-40 / I-24 corridors link Mid-South manufacturing to SE distribution networks",
    summary:
      "Corridor logistics between Nashville, Memphis, and the Southeast continues to drive industrial and warehouse investment tied to manufacturing supply chains.",
    url: "https://www.constructiondive.com/",
    source: "Market context (curated)",
    publishedAt: "2026-04-10T14:20:00.000Z",
    imageUrl: null,
    tags: ["logistics", "manufacturing", "tennessee", "southeast", "pemb-relevant"],
    whyItMatters:
      "Portland plant sits on the Mid-South spine — cross-dock and supplier buildings are high-priority pursuits.",
    mode: "demo",
  },
  {
    id: "demo-self-storage-09",
    title: "Self-storage developers keep metal building campuses in the pipeline",
    summary:
      "Self-storage remains a resilient specialty product type with multi-building campuses that favor fast-turn metal building systems and repeat developer relationships.",
    url: "https://www.areadevelopment.com/",
    source: "Market context (curated)",
    publishedAt: "2026-03-22T09:00:00.000Z",
    imageUrl: null,
    tags: ["industrial", "pemb-relevant", "southeast"],
    whyItMatters:
      "Fast estimate cycles and standardized PEMB product — strong capacity fill for the plant between large industrial packages.",
    mode: "demo",
  },
  {
    id: "demo-capital-markets-10",
    title: "Industrial capital markets remain selective but open for quality SE product",
    summary:
      "Debt and equity remain available for well-located industrial and logistics assets in growth SE metros, though underwriting favors pre-leased and institutional-quality specs.",
    url: "https://www.constructiondive.com/",
    source: "Market context (curated)",
    publishedAt: "2026-03-05T17:00:00.000Z",
    imageUrl: null,
    tags: ["capital-markets", "industrial", "southeast", "warehouse"],
    whyItMatters:
      "When capital is selective, package pricing and schedule certainty win — reinforce Ascent fab reliability in proposals.",
    mode: "demo",
  },
  {
    id: "demo-ag-buildings-11",
    title: "Ag and equestrian metal buildings remain steady across the Mid-South",
    summary:
      "Agricultural processing support, equipment dealerships, and equestrian facilities continue as a stable PEMB segment across TN, KY, AR, and MS.",
    url: "https://www.areadevelopment.com/",
    source: "Market context (curated)",
    publishedAt: "2026-02-18T12:30:00.000Z",
    imageUrl: null,
    tags: ["manufacturing", "southeast", "pemb-relevant", "tennessee"],
    whyItMatters:
      "Core Ascent strength — clear-span ag buildings with short sales cycles and high product match.",
    mode: "demo",
  },
  {
    id: "demo-under-construction-12",
    title: "Industrial under-construction pipeline still supports mill and fab demand into 2027",
    summary:
      "Projects already in preconstruction and construction keep steel and metal building fabricators busy even as new starts moderate from 2022–23 peaks.",
    url: "https://www.constructiondive.com/",
    source: "Market context (curated)",
    publishedAt: "2026-02-01T15:00:00.000Z",
    imageUrl: null,
    tags: ["construction", "industrial", "pemb-relevant", "warehouse"],
    whyItMatters:
      "Balance backlog vs new bid conversion — use steel cost forecast tab when owners ask about price path into 2027.",
    mode: "demo",
  },
];

export function demoMarketNewsResponse(message?: string): MarketNewsResponse {
  return {
    fetchedAt: new Date().toISOString(),
    mode: "demo",
    provider: null,
    items: SAMPLE_MARKET_NEWS,
    message:
      message ??
      "Curated offline market intelligence (no news API key). Add NEWSDATA_API_KEY or CURRENTS_API_KEY for live headlines.",
  };
}

export function filterNewsByTag(items: MarketNewsItem[], filter: NewsFilterId): MarketNewsItem[] {
  if (filter === "all") return items;
  if (filter === "southeast") {
    return items.filter(
      (i) =>
        i.tags.includes("southeast") ||
        i.tags.includes("tennessee") ||
        i.tags.includes("carolinas") ||
        i.tags.includes("texas"),
    );
  }
  return items.filter((i) => i.tags.includes(filter));
}

/** Relative time for UI (e.g. "3d ago") */
export function formatNewsAge(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = Math.max(0, now - t);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 45) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
