/**
 * Dodge Construction Network API client (server-only).
 *
 * Enterprise REST + OAuth 2.0 — access via https://www.construction.com/apis/
 * Env (any of these patterns work once Dodge issues credentials):
 *
 *   DODGE_API_BASE_URL     e.g. https://api.construction.com/v1
 *   DODGE_TOKEN_URL        OAuth token endpoint (optional; defaults to {base}/oauth/token)
 *   DODGE_CLIENT_ID
 *   DODGE_CLIENT_SECRET
 *   DODGE_ACCESS_TOKEN     optional pre-issued bearer (skips client-credentials grant)
 *   DODGE_API_KEY          optional alternate header key some tenants use
 *
 * Without credentials → demo SE pipeline (Portland, TN 600-mi footprint).
 */

import {
  DEMO_DODGE_COMPANIES,
  DEMO_DODGE_PROJECTS,
  DODGE_TERRITORY_STATES,
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

function env(name: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export function getDodgeConfig() {
  const baseUrl = env("DODGE_API_BASE_URL") ?? env("DODGE_BASE_URL") ?? null;
  const tokenUrl = env("DODGE_TOKEN_URL") ?? null;
  const clientId = env("DODGE_CLIENT_ID") ?? null;
  const clientSecret = env("DODGE_CLIENT_SECRET") ?? null;
  const accessToken = env("DODGE_ACCESS_TOKEN") ?? env("DODGE_BEARER_TOKEN") ?? null;
  const apiKey = env("DODGE_API_KEY") ?? null;

  const configured = Boolean(
    accessToken || apiKey || (baseUrl && clientId && clientSecret),
  );

  return {
    baseUrl,
    tokenUrl: tokenUrl ?? (baseUrl ? `${baseUrl.replace(/\/$/, "")}/oauth/token` : null),
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
        "Dodge credentials not set. Showing demo SE pipeline. Set DODGE_API_BASE_URL + OAuth client or DODGE_ACCESS_TOKEN for live data.",
      baseUrl: c.baseUrl,
      hasClientId: Boolean(c.clientId),
      hasClientSecret: Boolean(c.clientSecret),
      hasAccessToken: Boolean(c.accessToken || c.apiKey),
    };
  }
  return {
    configured: true,
    mode: "live",
    message: message ?? "Dodge credentials configured — attempting live API.",
    baseUrl: c.baseUrl,
    hasClientId: Boolean(c.clientId),
    hasClientSecret: Boolean(c.clientSecret),
    hasAccessToken: Boolean(c.accessToken || c.apiKey),
  };
}

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
    },
    body,
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Dodge OAuth failed HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    token?: string;
  };
  const token = json.access_token ?? json.token;
  if (!token) throw new Error("Dodge OAuth response missing access_token");

  const expiresIn = Number(json.expires_in ?? 3600);
  cachedToken = { token, expiresAt: Date.now() + expiresIn * 1000 };
  return token;
}

function authHeaders(token: string | null, apiKey: string | null): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "AscentBookingsDashboard/1.0 (Dodge integration)",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  if (apiKey) {
    h["X-API-Key"] = apiKey;
    h["x-api-key"] = apiKey;
  }
  return h;
}

/** Normalize heterogeneous Dodge/partner JSON shapes into our model. */
function mapProject(raw: Record<string, unknown>, index: number): DodgeProject {
  const str = (...keys: string[]) => {
    for (const k of keys) {
      const v = raw[k];
      if (typeof v === "string" && v.trim()) return v.trim();
      if (typeof v === "number") return String(v);
    }
    return null;
  };
  const num = (...keys: string[]) => {
    for (const k of keys) {
      const v = raw[k];
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v);
    }
    return 0;
  };

  const stageRaw = (str("stage", "projectStage", "status", "project_status") ?? "unknown").toLowerCase();
  const stage = normalizeStage(stageRaw);
  const typeRaw = (str("buildingType", "building_type", "category", "structureType") ?? "other").toLowerCase();

  const state = (str("state", "stateCode", "state_code", "region") ?? "").toUpperCase().slice(0, 2);
  const city = str("city", "municipality", "locationCity") ?? "—";
  const buildingType = normalizeBuildingType(typeRaw);
  const trades = Array.isArray(raw.trades)
    ? (raw.trades as unknown[]).map(String)
    : str("trades")
      ? str("trades")!.split(/[,;]/).map((t) => t.trim())
      : [];

  return {
    id: str("id", "projectId", "project_id", "dodgeReportNumber") ?? `live-${index}`,
    title: str("title", "name", "projectName", "project_name") ?? "Untitled project",
    stage,
    buildingType,
    productLine: inferProductLine(buildingType, trades),
    valuation: num("valuation", "value", "estimatedValue", "projectValue", "constructionValue"),
    city,
    state,
    milesFromPlant: num("milesFromPlant", "distanceMiles") || estimateMiles(state, city),
    bidDate: str("bidDate", "bid_date", "bidDueDate"),
    startDate: str("startDate", "start_date", "constructionStart"),
    owner: str("owner", "ownerName", "owner_name"),
    architect: str("architect", "architectName"),
    gc: str("gc", "generalContractor", "general_contractor"),
    trades,
    source: "dodge_live",
    notes: str("notes", "description", "summary") ?? "",
  };
}

function normalizeStage(s: string): DodgeProjectStage {
  if (s.includes("bid")) return "bidding";
  if (s.includes("plan")) return "planning";
  if (s.includes("design") || s.includes("drawing")) return "design";
  if (s.includes("precon") || s.includes("pre-con")) return "preconstruction";
  if (s.includes("construct") || s.includes("build")) return "construction";
  if (s.includes("complete") || s.includes("finish")) return "completed";
  if (s.includes("hold") || s.includes("cancel")) return "on_hold";
  return "unknown";
}

function normalizeBuildingType(s: string): DodgeBuildingType {
  if (s.includes("ware") || s.includes("distribution") || s.includes("fulfill")) return "warehouse";
  if (s.includes("manufac") || s.includes("plant") || s.includes("factory")) return "manufacturing";
  if (s.includes("indust")) return "industrial";
  if (s.includes("agri") || s.includes("farm") || s.includes("poultry")) return "agricultural";
  if (s.includes("stor")) return "self_storage";
  if (s.includes("office")) return "office";
  if (s.includes("retail") || s.includes("store")) return "retail";
  if (s.includes("school") || s.includes("munic") || s.includes("institut") || s.includes("public"))
    return "institutional";
  if (s.includes("commerc")) return "commercial";
  return "other";
}

/** Rough plant distance when API omits mileage (centroid-style defaults). */
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

async function fetchLiveProjects(): Promise<{
  projects: DodgeProject[];
  companies: DodgeCompany[];
  detail: string;
}> {
  const c = getDodgeConfig();
  if (!c.baseUrl) {
    throw new Error("DODGE_API_BASE_URL is required for live mode");
  }

  const token = await obtainAccessToken();
  if (!token && !c.apiKey) {
    throw new Error("Unable to obtain Dodge access token");
  }

  const base = c.baseUrl.replace(/\/$/, "");
  // Try common enterprise path patterns; first success wins.
  const candidates = [
    `${base}/projects?states=${DODGE_TERRITORY_STATES.join(",")}&limit=100`,
    `${base}/v1/projects?states=${DODGE_TERRITORY_STATES.join(",")}&limit=100`,
    `${base}/projects/search`,
  ];

  let lastErr = "No endpoint succeeded";
  for (const url of candidates) {
    try {
      const isSearch = url.endsWith("/search");
      const res = await fetch(url, {
        method: isSearch ? "POST" : "GET",
        headers: {
          ...authHeaders(token, c.apiKey),
          ...(isSearch ? { "Content-Type": "application/json" } : {}),
        },
        body: isSearch
          ? JSON.stringify({
              states: [...DODGE_TERRITORY_STATES],
              minValue: DEFAULT_MIN_VALUATION,
              limit: 100,
            })
          : undefined,
        signal: AbortSignal.timeout(20000),
      });

      if (!res.ok) {
        lastErr = `${url} → HTTP ${res.status}`;
        continue;
      }

      const json = (await res.json()) as unknown;
      const rows = extractArray(json);
      if (!rows.length) {
        lastErr = `${url} → empty list`;
        continue;
      }

      const projects = rows
        .map((r, i) => mapProject(r as Record<string, unknown>, i))
        .filter((p) => p.valuation >= DEFAULT_MIN_VALUATION || p.valuation === 0);

      // Optional companies endpoint
      let companies: DodgeCompany[] = [];
      try {
        const coRes = await fetch(`${base}/companies?limit=50`, {
          headers: authHeaders(token, c.apiKey),
          signal: AbortSignal.timeout(12000),
        });
        if (coRes.ok) {
          const coJson = await coRes.json();
          companies = extractArray(coJson).map((raw, i) => {
            const r = raw as Record<string, unknown>;
            return {
              id: String(r.id ?? r.companyId ?? `co-${i}`),
              name: String(r.name ?? r.companyName ?? "Company"),
              role: String(r.role ?? r.type ?? "Firm"),
              city: String(r.city ?? "—"),
              state: String(r.state ?? "").toUpperCase().slice(0, 2),
              phone: r.phone ? String(r.phone) : null,
              source: "dodge_live" as const,
            };
          });
        }
      } catch {
        // companies optional
      }

      return {
        projects,
        companies,
        detail: `Live from ${url} (${projects.length} projects)`,
      };
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
    }
  }

  throw new Error(lastErr);
}

function extractArray(json: unknown): unknown[] {
  if (Array.isArray(json)) return json;
  if (json && typeof json === "object") {
    const o = json as Record<string, unknown>;
    for (const key of ["data", "projects", "results", "items", "value"]) {
      if (Array.isArray(o[key])) return o[key] as unknown[];
    }
  }
  return [];
}

export async function fetchDodgeProjects(options?: {
  maxMiles?: number;
  minValuation?: number;
}): Promise<DodgeProjectsResponse> {
  const maxMiles = options?.maxMiles ?? DEFAULT_MAX_MILES;
  const minValuation = options?.minValuation ?? DEFAULT_MIN_VALUATION;
  const filters = {
    states: [...DODGE_TERRITORY_STATES],
    maxMiles,
    minValuation,
  };

  const cfg = getDodgeConfig();

  if (cfg.configured) {
    try {
      const live = await fetchLiveProjects();
      let projects = live.projects.filter(
        (p) => p.milesFromPlant <= maxMiles && (p.valuation === 0 || p.valuation >= minValuation),
      );
      // If API returned none after filter, still surface unfiltered live set (up to 50)
      if (projects.length === 0 && live.projects.length > 0) {
        projects = live.projects.slice(0, 50);
      }
      return {
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Fall through to demo with error message
      const projects = DEMO_DODGE_PROJECTS.filter(
        (p) => p.milesFromPlant <= maxMiles && p.valuation >= minValuation,
      );
      return {
        fetchedAt: new Date().toISOString(),
        status: {
          configured: true,
          mode: "demo",
          message: `Live Dodge call failed (${msg}). Showing demo pipeline until credentials/paths are confirmed with Dodge.`,
          baseUrl: cfg.baseUrl,
          hasClientId: Boolean(cfg.clientId),
          hasClientSecret: Boolean(cfg.clientSecret),
          hasAccessToken: Boolean(cfg.accessToken || cfg.apiKey),
        },
        projects,
        companies: DEMO_DODGE_COMPANIES,
        summary: summarizeProjects(projects, maxMiles),
        filters,
      };
    }
  }

  const projects = DEMO_DODGE_PROJECTS.filter(
    (p) => p.milesFromPlant <= maxMiles && p.valuation >= minValuation,
  );
  return {
    fetchedAt: new Date().toISOString(),
    status: getDodgeConnectionStatus(),
    projects,
    companies: DEMO_DODGE_COMPANIES,
    summary: summarizeProjects(projects, maxMiles),
    filters,
  };
}
