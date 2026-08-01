/**
 * Server-only fetchers for live construction market data.
 * Sources: FRED (CSV export, no key) + BLS Public API v2.
 */
import {
  CACHED_FEEDS,
  computeMarketSignal,
  type ConstructionFeedsResponse,
  type FeedPoint,
  type FeedSeries,
  type FeedStatus,
} from "@/data/construction-feeds";

const FRED_SERIES: {
  id: string;
  label: string;
  unit: string;
  description: string;
  relevance: FeedSeries["relevance"];
}[] = [
  {
    id: "TLNRESCONS",
    label: "Private nonresidential construction",
    unit: "$ millions SAAR",
    description: "Total private nonresidential construction put in place (FRED TLNRESCONS)",
    relevance: "high",
  },
  {
    id: "PNRESCONS",
    label: "Private nonresidential (detail)",
    unit: "$ millions SAAR",
    description: "Private nonresidential construction spending (FRED PNRESCONS)",
    relevance: "high",
  },
  {
    id: "TTLCONS",
    label: "Total construction spending",
    unit: "$ millions SAAR",
    description: "Total construction put in place (FRED TTLCONS)",
    relevance: "medium",
  },
  {
    id: "PERMIT",
    label: "Building permits",
    unit: "thousands SAAR",
    description: "New private housing units authorized (FRED PERMIT)",
    relevance: "context",
  },
];

const BLS_SERIES: {
  id: string;
  label: string;
  unit: string;
  description: string;
  relevance: FeedSeries["relevance"];
}[] = [
  {
    id: "CES2000000001",
    label: "Construction employment",
    unit: "thousands",
    description: "All employees, construction — seasonally adjusted (BLS CES2000000001)",
    relevance: "high",
  },
  {
    id: "PCU236211236211",
    label: "Industrial building PPI",
    unit: "index",
    description: "Producer price index — industrial building construction",
    relevance: "medium",
  },
  {
    id: "WPU081",
    label: "Lumber & wood PPI",
    unit: "index",
    description: "Producer price index — lumber and wood products",
    relevance: "medium",
  },
];

function pctChange(latest: number, prior: number): number {
  if (!prior || !Number.isFinite(prior) || !Number.isFinite(latest)) return 0;
  return ((latest - prior) / Math.abs(prior)) * 100;
}

function parseFredCsv(text: string): FeedPoint[] {
  // Reject HTML error pages
  if (text.trimStart().startsWith("<") || text.includes("<!DOCTYPE")) {
    throw new Error("FRED returned HTML instead of CSV");
  }
  const lines = text.trim().split(/\r?\n/);
  const points: FeedPoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;
    const [date, raw] = line.split(",");
    if (!date || raw == null || raw === "." || raw === "") continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;
    points.push({ date, value });
  }
  return points;
}

async function fetchFredSeries(meta: (typeof FRED_SERIES)[0]): Promise<FeedSeries> {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(meta.id)}`;
  const res = await fetch(url, {
    headers: { Accept: "text/csv,*/*", "User-Agent": "AscentBookingsDashboard/1.0" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`FRED ${meta.id} HTTP ${res.status}`);
  const text = await res.text();
  const history = parseFredCsv(text).slice(-18);
  if (history.length < 2) throw new Error(`FRED ${meta.id} insufficient points`);
  const latest = history[history.length - 1]!;
  const prior = history[history.length - 2]!;
  const yoy = history.length >= 13 ? history[history.length - 13]! : null;
  return {
    id: meta.id,
    source: "fred",
    label: meta.label,
    unit: meta.unit,
    description: meta.description,
    relevance: meta.relevance,
    latest,
    prior,
    momPct: pctChange(latest.value, prior.value),
    yoyPct: yoy ? pctChange(latest.value, yoy.value) : null,
    history,
    status: "live",
  };
}

async function fetchBlsSeries(): Promise<FeedSeries[]> {
  const year = new Date().getUTCFullYear();
  const body = {
    seriesid: BLS_SERIES.map((s) => s.id),
    startyear: String(year - 2),
    endyear: String(year),
  };
  const res = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`BLS HTTP ${res.status}`);
  const json = (await res.json()) as {
    status: string;
    message?: string[];
    Results?: {
      series: Array<{
        seriesID: string;
        data: Array<{ year: string; period: string; periodName: string; value: string }>;
      }>;
    };
  };
  if (json.status !== "REQUEST_SUCCEEDED") {
    throw new Error(`BLS status ${json.status}: ${(json.message ?? []).join("; ")}`);
  }

  const out: FeedSeries[] = [];
  for (const meta of BLS_SERIES) {
    const row = json.Results?.series.find((s) => s.seriesID === meta.id);
    if (!row?.data?.length) {
      out.push({
        id: meta.id,
        source: "bls",
        label: meta.label,
        unit: meta.unit,
        description: meta.description,
        relevance: meta.relevance,
        latest: null,
        prior: null,
        momPct: null,
        yoyPct: null,
        history: [],
        status: "error",
        error: "No data returned",
      });
      continue;
    }
    // BLS returns newest first
    const sorted = [...row.data]
      .filter((d) => d.period.startsWith("M") && d.value !== "-")
      .map((d) => ({
        date: `${d.year}-${d.period.replace("M", "").padStart(2, "0")}`,
        value: Number(d.value),
        year: Number(d.year),
        month: Number(d.period.replace("M", "")),
      }))
      .filter((d) => Number.isFinite(d.value))
      .sort((a, b) => a.year - b.year || a.month - b.month);

    const history: FeedPoint[] = sorted.slice(-18).map((d) => ({ date: d.date, value: d.value }));
    const latest = history[history.length - 1] ?? null;
    const prior = history[history.length - 2] ?? null;
    const yoy = history.length >= 13 ? history[history.length - 13]! : null;

    out.push({
      id: meta.id,
      source: "bls",
      label: meta.label,
      unit: meta.unit,
      description: meta.description,
      relevance: meta.relevance,
      latest,
      prior,
      momPct: latest && prior ? pctChange(latest.value, prior.value) : null,
      yoyPct: latest && yoy ? pctChange(latest.value, yoy.value) : null,
      history,
      status: "live",
    });
  }
  return out;
}

function mergeWithCache(live: FeedSeries[], cached: FeedSeries[]): FeedSeries[] {
  const byId = new Map(live.map((s) => [s.id, s]));
  return cached.map((c) => {
    const l = byId.get(c.id);
    if (l && l.status === "live" && l.latest) return l;
    return { ...c, status: "cached" as const };
  });
}

export async function fetchConstructionFeeds(): Promise<ConstructionFeedsResponse> {
  const sources: ConstructionFeedsResponse["sources"] = [];
  const liveSeries: FeedSeries[] = [];

  // FRED — parallel
  const fredResults = await Promise.allSettled(FRED_SERIES.map((m) => fetchFredSeries(m)));
  let fredOk = 0;
  fredResults.forEach((r, i) => {
    const meta = FRED_SERIES[i]!;
    if (r.status === "fulfilled") {
      liveSeries.push(r.value);
      fredOk++;
    } else {
      liveSeries.push({
        id: meta.id,
        source: "fred",
        label: meta.label,
        unit: meta.unit,
        description: meta.description,
        relevance: meta.relevance,
        latest: null,
        prior: null,
        momPct: null,
        yoyPct: null,
        history: [],
        status: "error",
        error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      });
    }
  });
  sources.push({
    name: "FRED (St. Louis Fed)",
    ok: fredOk > 0,
    detail: fredOk > 0 ? `${fredOk}/${FRED_SERIES.length} series live` : "All FRED series failed — using cache",
  });

  // BLS
  try {
    const bls = await fetchBlsSeries();
    const ok = bls.filter((s) => s.status === "live").length;
    liveSeries.push(...bls);
    sources.push({
      name: "BLS Public API",
      ok: ok > 0,
      detail: ok > 0 ? `${ok}/${BLS_SERIES.length} series live` : "BLS partial/empty",
    });
  } catch (err) {
    sources.push({
      name: "BLS Public API",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  const series = mergeWithCache(liveSeries, CACHED_FEEDS.series);
  const liveCount = series.filter((s) => s.status === "live").length;
  const status: FeedStatus =
    liveCount === series.length ? "live" : liveCount > 0 ? "partial" : "cached";

  const signal = computeMarketSignal(series);

  return {
    fetchedAt: new Date().toISOString(),
    status,
    sources,
    series,
    signal,
    live: liveCount > 0,
  };
}
