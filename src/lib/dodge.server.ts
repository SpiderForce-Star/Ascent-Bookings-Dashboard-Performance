/**
 * Dodge Construction Network REST API client (server-only).
 *
 * Auth (never website username/password; never VITE_* / client-exposed):
 *   DODGE_API_BASE_URL     e.g. https://api.construction.com/v1
 *   DODGE_TOKEN_URL        optional OAuth token URL (default {base}/oauth/token)
 *   DODGE_CLIENT_ID
 *   DODGE_CLIENT_SECRET
 *   DODGE_ACCESS_TOKEN     optional long-lived bearer (skips client_credentials)
 *   DODGE_API_KEY          optional static API key header some tenants use
 *
 * Behavior:
 *   credentials configured → live fetch, mode "live"
 *   missing or API error   → DEMO_DODGE_PROJECTS, mode "demo", clear message
 *
 * Docs: https://www.construction.com/apis/
 */

import {
  DEMO_DODGE_COMPANIES,
  DEMO_DODGE_PROJECTS,
  DODGE_TERRITORY_STATES,
  PEMB_BUILDING_TYPES,
  inferProductLine,
  summarizeProjects,
  type DodgeBuildingType,
  type DodgeCompany,
  type DodgeConnectionStatus,
  type DodgeProject,
  type DodgeProjectStage,
  type DodgeProjectsResponse,
} from "@/data/dodge";

const DEFAULT_MAX_MILES = 600;
const DEFAULT_MIN_VALUATION = 1_000_000;
/** Brief in-memory cache for live responses (rate-limit friendly). */
const LIVE_CACHE_TTL_MS = 3 * 60 * 1000;
const FETCH_TIMEOUT_MS = 20_000;
const TOKEN_TIMEOUT_MS = 15_000;

function env(name: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export interface DodgeEnvConfig {
  baseUrl: string | null;
  tokenUrl: string | null;
  clientId: string | null;
  clientSecret: string | null;
  accessToken: string | null;
  apiKey: string | null;
  /** True when enough secrets exist to attempt a live call */
  configured: boolean;
}

export function getDodgeConfig(): DodgeEnvConfig {
  const baseUrl = env("DODGE_API_BASE_URL") ?? env("DODGE_BASE_URL") ?? null;
  const clientId = env("DODGE_CLIENT_ID") ?? null;
  const clientSecret = env("DODGE_CLIENT_SECRET") ?? null;
  const accessToken = env("DODGE_ACCESS_TOKEN") ?? env("DODGE_BEARER_TOKEN") ?? null;
  const apiKey = env("DODGE_API_KEY") ?? null;
  const tokenUrlExplicit = env("DODGE_TOKEN_URL") ?? null;

  const hasClientCreds = Boolean(baseUrl && clientId && clientSecret);
  const hasBearer = Boolean(baseUrl && (accessToken || apiKey));
  const configured = hasClientCreds || hasBearer;

  const tokenUrl =
    tokenUrlExplicit ??
    (baseUrl ? `${baseUrl.replace(/\/$/, "")}/oauth/token` : null);

  return {
    baseUrl,
    tokenUrl,
    clientId,
    clientSecret,
    accessToken,
    apiKey,
    configured,
  };
}

export function getDodgeConnectionStatus(message?: string): DodgeConnectionStatus {
  const c = getDodgeConfig();
  if (!c.configured) {
    return {
      configured: false,
      mode: "demo",
      message:
        message ??
        "Dodge API credentials not set. Showing demo SE pipeline. Set DODGE_API_BASE_URL + DODGE_CLIENT_ID/SECRET or DODGE_ACCESS_TOKEN on the server (Vercel env — never VITE_*).",
      baseUrl: c.baseUrl,
      hasClientId: Boolean(c.clientId),
      hasClientSecret: Boolean(c.clientSecret),
      hasAccessToken: Boolean(c.accessToken || c.apiKey),
    };
  }
  return {
    configured: true,
    mode: "live",
    message: message ?? "Dodge credentials configured — live API.",
    baseUrl: c.baseUrl,
    hasClientId: Boolean(c.clientId),
    hasClientSecret: Boolean(c.clientSecret),
    hasAccessToken: Boolean(c.accessToken || c.apiKey),
  };
}

/** Strip anything that might look like a secret from error strings returned to clients. */
function sanitizeErrorMessage(err: unknown): string {
  let msg = err instanceof Error ? err.message : String(err);
  const c = getDodgeConfig();
  for (const secret of [c.clientSecret, c.accessToken, c.apiKey, c.clientId]) {
    if (secret && secret.length > 4) {
      msg = msg.split(secret).join("[redacted]");
    }
  }
  // Truncate long provider bodies
  if (msg.length > 280) msg = `${msg.slice(0, 280)}…`;
  return msg;
}

// ── Token cache ─────────────────────────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null;

async function obtainAccessToken(): Promise<string | null> {
  const c = getDodgeConfig();
  if (c.accessToken) return c.accessToken;
  if (!c.tokenUrl || !c.clientId || !c.clientSecret) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: c.clientId,
    client_secret: c.clientSecret,
  });

  const res = await fetch(c.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "AscentBookingsDashboard/1.0 (Dodge integration)",
    },
    body,
    signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = (await res.text()).slice(0, 200);
    throw new Error(`Dodge OAuth failed HTTP ${res.status}: ${text}`);
  }

  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    token?: string;
  };
  const token = json.access_token ?? json.token;
  if (!token) throw new Error("Dodge OAuth response missing access_token");

  const expiresIn = Number(json.expires_in ?? 3600);
  cachedToken = { token, expiresAt: Date.now() + Math.max(expiresIn, 60) * 1000 };
  return token;
}

function authHeaders(token: string | null, apiKey: string | null): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "AscentBookingsDashboard/1.0 (Dodge integration; Ascent Buildings LLC)",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  if (apiKey) {
    h["X-API-Key"] = apiKey;
    h["x-api-key"] = apiKey;
  }
  return h;
}

// ── Mapping ─────────────────────────────────────────────────────────────────

function dig(
  raw: Record<string, unknown>,
  ...paths: string[]
): unknown {
  for (const path of paths) {
    const parts = path.split(".");
    let cur: unknown = raw;
    let ok = true;
    for (const p of parts) {
      if (cur && typeof cur === "object" && p in (cur as object)) {
        cur = (cur as Record<string, unknown>)[p];
      } else {
        ok = false;
        break;
      }
    }
    if (ok && cur != null && cur !== "") return cur;
  }
  return null;
}

function asStr(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

function asNum(...vals: unknown[]): number {
  for (const v of vals) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v.replace(/[$,]/g, "")))) {
      return Number(v.replace(/[$,]/g, ""));
    }
  }
  return 0;
}

/** Normalize heterogeneous Dodge/partner JSON shapes into our model. */
export function mapProject(raw: Record<string, unknown>, index: number): DodgeProject {
  const str = (...keys: string[]) => asStr(...keys.map((k) => dig(raw, k) ?? raw[k]));

  const stageRaw = (
    str("stage", "projectStage", "status", "project_status", "projectStatus", "lifeCycleStage") ??
    "unknown"
  ).toLowerCase();
  const stage = normalizeStage(stageRaw);

  const typeRaw = (
    str(
      "buildingType",
      "building_type",
      "category",
      "structureType",
      "structure_type",
      "primaryUse",
      "projectType",
    ) ?? "other"
  ).toLowerCase();
  const buildingType = normalizeBuildingType(typeRaw);

  const state = (
    str("state", "stateCode", "state_code", "address.state", "location.state", "projectState") ?? ""
  )
    .toUpperCase()
    .slice(0, 2);

  const city =
    str("city", "municipality", "locationCity", "address.city", "location.city", "projectCity") ??
    "—";

  let trades: string[] = [];
  if (Array.isArray(raw.trades)) trades = (raw.trades as unknown[]).map(String);
  else if (Array.isArray(raw.tradeNames)) trades = (raw.tradeNames as unknown[]).map(String);
  else {
    const t = str("trades", "tradeList");
    if (t) trades = t.split(/[,;]/).map((x) => x.trim()).filter(Boolean);
  }

  const owner =
    str("owner", "ownerName", "owner_name", "owner.name", "ownerCompany") ??
    asStr(dig(raw, "owner.name"), dig(raw, "owners.0.name"));
  const architect =
    str("architect", "architectName", "architect.name", "designFirm") ??
    asStr(dig(raw, "architect.name"), dig(raw, "firms.architect.name"));
  const gc =
    str("gc", "generalContractor", "general_contractor", "gcName", "contractor") ??
    asStr(dig(raw, "generalContractor.name"), dig(raw, "gc.name"));

  const id =
    str(
      "id",
      "projectId",
      "project_id",
      "dodgeReportNumber",
      "reportNumber",
      "dodgeNumber",
      "projectNumber",
    ) ?? `live-${index}`;

  return {
    id,
    title:
      str("title", "name", "projectName", "project_name", "projectTitle") ?? "Untitled project",
    stage,
    buildingType,
    productLine: inferProductLine(buildingType, trades),
    valuation: asNum(
      dig(raw, "valuation"),
      dig(raw, "value"),
      dig(raw, "estimatedValue"),
      dig(raw, "projectValue"),
      dig(raw, "constructionValue"),
      dig(raw, "valuationAmount"),
      raw.valuation,
      raw.value,
    ),
    city,
    state,
    milesFromPlant:
      asNum(dig(raw, "milesFromPlant"), dig(raw, "distanceMiles"), dig(raw, "distance")) ||
      estimateMiles(state, city),
    bidDate: str("bidDate", "bid_date", "bidDueDate", "bidDue", "targetBidDate"),
    startDate: str("startDate", "start_date", "constructionStart", "targetStartDate"),
    owner,
    architect,
    gc,
    trades,
    source: "dodge_live",
    notes: str("notes", "description", "summary", "scope") ?? "",
  };
}

function normalizeStage(s: string): DodgeProjectStage {
  if (s.includes("bid")) return "bidding";
  if (s.includes("precon") || s.includes("pre-con") || s.includes("pre_con")) return "preconstruction";
  if (s.includes("plan")) return "planning";
  if (s.includes("design") || s.includes("drawing") || s.includes("schematic")) return "design";
  if (s.includes("construct") || s.includes("build") || s.includes("active")) return "construction";
  if (s.includes("complete") || s.includes("finish")) return "completed";
  if (s.includes("hold") || s.includes("cancel") || s.includes("abandon")) return "on_hold";
  return "unknown";
}

function normalizeBuildingType(s: string): DodgeBuildingType {
  if (s.includes("ware") || s.includes("distribution") || s.includes("fulfill") || s.includes("cross-dock"))
    return "warehouse";
  if (s.includes("manufac") || s.includes("plant") || s.includes("factory") || s.includes("fab"))
    return "manufacturing";
  if (s.includes("indust") || s.includes("flex")) return "industrial";
  if (s.includes("agri") || s.includes("farm") || s.includes("poultry") || s.includes("equine"))
    return "agricultural";
  if (s.includes("self") && s.includes("stor")) return "self_storage";
  if (s.includes("stor") && !s.includes("history")) return "self_storage";
  if (s.includes("office")) return "office";
  if (s.includes("retail") || s.includes("store") || s.includes("strip")) return "retail";
  if (
    s.includes("school") ||
    s.includes("munic") ||
    s.includes("institut") ||
    s.includes("public") ||
    s.includes("government")
  )
    return "institutional";
  if (s.includes("commerc")) return "commercial";
  return "other";
}

/** Rough plant distance when API omits mileage (centroid-style defaults from Portland, TN). */
function estimateMiles(state: string, _city: string): number {
  const table: Record<string, number> = {
    TN: 40,
    KY: 120,
    AL: 180,
    GA: 250,
    MS: 280,
    AR: 320,
    MO: 340,
    IL: 360,
    IN: 300,
    OH: 380,
    WV: 420,
    PA: 520,
    VA: 450,
    NC: 400,
    SC: 380,
    FL: 550,
    TX: 580,
  };
  return table[state] ?? 500;
}

function extractArray(json: unknown): unknown[] {
  if (Array.isArray(json)) return json;
  if (json && typeof json === "object") {
    const o = json as Record<string, unknown>;
    for (const key of ["data", "projects", "results", "items", "value", "content", "records"]) {
      if (Array.isArray(o[key])) return o[key] as unknown[];
    }
    // Nested data.projects
    if (o.data && typeof o.data === "object") {
      const d = o.data as Record<string, unknown>;
      for (const key of ["projects", "results", "items", "records"]) {
        if (Array.isArray(d[key])) return d[key] as unknown[];
      }
    }
  }
  return [];
}

/** Prefer PEMB-friendly building types, then higher valuation. */
function preferPembThenValue(a: DodgeProject, b: DodgeProject): number {
  const ap = PEMB_BUILDING_TYPES.includes(a.buildingType) || a.productLine === "PEMB" ? 1 : 0;
  const bp = PEMB_BUILDING_TYPES.includes(b.buildingType) || b.productLine === "PEMB" ? 1 : 0;
  if (bp !== ap) return bp - ap;
  return b.valuation - a.valuation;
}

function applyTerritoryFilters(
  projects: DodgeProject[],
  maxMiles: number,
  minValuation: number,
): DodgeProject[] {
  const territory = new Set<string>(DODGE_TERRITORY_STATES as unknown as string[]);
  return projects
    .filter((p) => {
      if (p.milesFromPlant > maxMiles) return false;
      if (p.valuation > 0 && p.valuation < minValuation) return false;
      if (p.state && !territory.has(p.state) && p.milesFromPlant > maxMiles) return false;
      // Prefer in-territory states; allow unknown state if miles ok
      if (p.state && p.state.length === 2 && !territory.has(p.state) && p.milesFromPlant > 400) {
        return false;
      }
      return true;
    })
    .sort(preferPembThenValue);
}

// ── Live fetch ──────────────────────────────────────────────────────────────

async function fetchLiveProjects(options: {
  maxMiles: number;
  minValuation: number;
}): Promise<{ projects: DodgeProject[]; companies: DodgeCompany[]; detail: string }> {
  const c = getDodgeConfig();
  if (!c.baseUrl) {
    throw new Error("DODGE_API_BASE_URL is required for live mode");
  }

  const token = await obtainAccessToken();
  if (!token && !c.apiKey) {
    throw new Error("Unable to obtain Dodge access token (check CLIENT_ID/SECRET or ACCESS_TOKEN)");
  }

  const base = c.baseUrl.replace(/\/$/, "");
  const statesQ = DODGE_TERRITORY_STATES.join(",");
  const headers = authHeaders(token, c.apiKey);

  // Common enterprise path patterns — first success with a non-empty list wins.
  const getCandidates = [
    `${base}/projects?states=${statesQ}&limit=100&minValue=${options.minValuation}`,
    `${base}/projects?state=${statesQ}&limit=100`,
    `${base}/v1/projects?states=${statesQ}&limit=100`,
    `${base}/project?states=${statesQ}&limit=100`,
  ];

  let lastErr = "No Dodge endpoint returned projects";

  for (const url of getCandidates) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        lastErr = `GET ${url.replace(base, "{base}")} → HTTP ${res.status}`;
        console.error("[dodge]", lastErr);
        continue;
      }
      const json = (await res.json()) as unknown;
      const rows = extractArray(json);
      if (!rows.length) {
        lastErr = `GET {base}… → empty list`;
        continue;
      }
      const projects = rows.map((r, i) => mapProject(r as Record<string, unknown>, i));
      const companies = await fetchCompaniesOptional(base, headers);
      return {
        projects,
        companies,
        detail: `Live Dodge REST (${projects.length} projects mapped)`,
      };
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
      console.error("[dodge] GET candidate failed:", lastErr);
    }
  }

  // POST search variants
  const postBodies = [
    {
      url: `${base}/projects/search`,
      body: {
        states: [...DODGE_TERRITORY_STATES],
        minValue: options.minValuation,
        limit: 100,
      },
    },
    {
      url: `${base}/search/projects`,
      body: {
        filters: {
          states: [...DODGE_TERRITORY_STATES],
          minValuation: options.minValuation,
        },
        limit: 100,
      },
    },
  ];

  for (const { url, body } of postBodies) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        lastErr = `POST {base}/… → HTTP ${res.status}`;
        console.error("[dodge]", lastErr);
        continue;
      }
      const json = (await res.json()) as unknown;
      const rows = extractArray(json);
      if (!rows.length) {
        lastErr = `POST search → empty list`;
        continue;
      }
      const projects = rows.map((r, i) => mapProject(r as Record<string, unknown>, i));
      const companies = await fetchCompaniesOptional(base, headers);
      return {
        projects,
        companies,
        detail: `Live Dodge REST search (${projects.length} projects mapped)`,
      };
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
      console.error("[dodge] POST candidate failed:", lastErr);
    }
  }

  throw new Error(lastErr);
}

async function fetchCompaniesOptional(
  base: string,
  headers: Record<string, string>,
): Promise<DodgeCompany[]> {
  try {
    const coRes = await fetch(`${base}/companies?limit=50`, {
      headers,
      signal: AbortSignal.timeout(12_000),
    });
    if (!coRes.ok) return [];
    const coJson = await coRes.json();
    return extractArray(coJson).map((raw, i) => {
      const r = raw as Record<string, unknown>;
      return {
        id: String(r.id ?? r.companyId ?? `co-${i}`),
        name: String(r.name ?? r.companyName ?? "Company"),
        role: String(r.role ?? r.type ?? "Firm"),
        city: String(r.city ?? "—"),
        state: String(r.state ?? "")
          .toUpperCase()
          .slice(0, 2),
        phone: r.phone ? String(r.phone) : null,
        source: "dodge_live" as const,
      };
    });
  } catch {
    return [];
  }
}

// ── Response cache + public entry ───────────────────────────────────────────

let liveCache: {
  key: string;
  at: number;
  data: DodgeProjectsResponse;
} | null = null;

function demoResponse(
  maxMiles: number,
  minValuation: number,
  status: DodgeConnectionStatus,
): DodgeProjectsResponse {
  const projects = DEMO_DODGE_PROJECTS.filter(
    (p) => p.milesFromPlant <= maxMiles && p.valuation >= minValuation,
  ).sort(preferPembThenValue);
  return {
    fetchedAt: new Date().toISOString(),
    status,
    projects,
    companies: DEMO_DODGE_COMPANIES,
    summary: summarizeProjects(projects, maxMiles),
    filters: {
      states: [...DODGE_TERRITORY_STATES],
      maxMiles,
      minValuation,
    },
  };
}

/**
 * Fetch Dodge projects for the Ascent territory.
 * Live when env credentials are set; otherwise (or on error) demo pipeline.
 */
export async function fetchDodgeProjects(options?: {
  maxMiles?: number;
  minValuation?: number;
  bypassCache?: boolean;
}): Promise<DodgeProjectsResponse> {
  const maxMiles = options?.maxMiles ?? DEFAULT_MAX_MILES;
  const minValuation = options?.minValuation ?? DEFAULT_MIN_VALUATION;
  const filters = {
    states: [...DODGE_TERRITORY_STATES],
    maxMiles,
    minValuation,
  };
  const cacheKey = `${maxMiles}:${minValuation}`;
  const cfg = getDodgeConfig();

  if (!cfg.configured) {
    return demoResponse(maxMiles, minValuation, getDodgeConnectionStatus());
  }

  if (
    !options?.bypassCache &&
    liveCache &&
    liveCache.key === cacheKey &&
    Date.now() - liveCache.at < LIVE_CACHE_TTL_MS &&
    liveCache.data.status.mode === "live"
  ) {
    return {
      ...liveCache.data,
      status: {
        ...liveCache.data.status,
        message: `${liveCache.data.status.message} (cached ${Math.round((Date.now() - liveCache.at) / 1000)}s)`,
      },
    };
  }

  try {
    const live = await fetchLiveProjects({ maxMiles, minValuation });
    let projects = applyTerritoryFilters(live.projects, maxMiles, minValuation);

    // If filters wiped everything but API returned rows, surface top PEMB-preferring slice
    if (projects.length === 0 && live.projects.length > 0) {
      projects = [...live.projects].sort(preferPembThenValue).slice(0, 50);
    }

    const data: DodgeProjectsResponse = {
      fetchedAt: new Date().toISOString(),
      status: {
        ...getDodgeConnectionStatus(live.detail),
        mode: "live",
      },
      projects,
      companies: live.companies.length ? live.companies : DEMO_DODGE_COMPANIES,
      summary: summarizeProjects(projects, maxMiles),
      filters,
    };

    liveCache = { key: cacheKey, at: Date.now(), data };
    return data;
  } catch (err) {
    const safe = sanitizeErrorMessage(err);
    console.error("[dodge] live fetch failed:", safe);
    return demoResponse(maxMiles, minValuation, {
      configured: true,
      mode: "demo",
      message: `Live Dodge call failed (${safe}). Showing demo pipeline until credentials/paths are confirmed with Dodge.`,
      baseUrl: cfg.baseUrl,
      hasClientId: Boolean(cfg.clientId),
      hasClientSecret: Boolean(cfg.clientSecret),
      hasAccessToken: Boolean(cfg.accessToken || cfg.apiKey),
    });
  }
}
