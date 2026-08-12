import { useCallback, useEffect, useState } from "react";
import {
  DEMO_DODGE_COMPANIES,
  DEMO_DODGE_PROJECTS,
  summarizeProjects,
  type DodgeProjectsResponse,
} from "@/data/dodge";

const DEMO_MESSAGE =
  "Demo SE process board for territory workflow — not live Dodge Construction Network data.";

function localDemo(message: string): DodgeProjectsResponse {
  return {
    fetchedAt: new Date().toISOString(),
    status: {
      configured: false,
      mode: "demo",
      message,
      baseUrl: null,
      hasClientId: false,
      hasClientSecret: false,
      hasAccessToken: false,
    },
    projects: DEMO_DODGE_PROJECTS,
    companies: DEMO_DODGE_COMPANIES,
    summary: summarizeProjects(DEMO_DODGE_PROJECTS, 600),
    filters: {
      states: [],
      maxMiles: 600,
      minValuation: 1_000_000,
    },
  };
}

const fallback: DodgeProjectsResponse = {
  ...localDemo("Loading Dodge pipeline…"),
  fetchedAt: new Date(0).toISOString(),
};

/** Never hand the UI an empty demo board. Live empty lists stay empty (honest). */
function ensureDemoBoard(json: DodgeProjectsResponse): DodgeProjectsResponse {
  if (json.status?.mode === "live") return json;
  if (Array.isArray(json.projects) && json.projects.length > 0) return json;
  return {
    ...json,
    projects: DEMO_DODGE_PROJECTS,
    companies: json.companies?.length ? json.companies : DEMO_DODGE_COMPANIES,
    summary: summarizeProjects(DEMO_DODGE_PROJECTS, json.filters?.maxMiles ?? 600),
    status: {
      ...json.status,
      mode: "demo",
      message: json.status?.message || DEMO_MESSAGE,
    },
  };
}

export function useDodgeProjects(auto = true) {
  const [data, setData] = useState<DodgeProjectsResponse>(fallback);
  const [loading, setLoading] = useState(auto);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({
        maxMiles: "600",
        minValuation: "1000000",
      });
      if (force) q.set("refresh", "1");
      const res = await fetch(`/api/dodge/projects?${q}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as DodgeProjectsResponse;
      if (!json?.projects || !Array.isArray(json.projects)) {
        throw new Error("Invalid Dodge response shape");
      }
      setData(ensureDemoBoard(json));
      return json;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Keep a full demo board — do not blank the page. Soft-note only.
      setError(msg);
      setData(localDemo("Could not reach Dodge API route — using local demo pipeline."));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const load = useCallback(() => refresh(false), [refresh]);
  const hardRefresh = useCallback(() => refresh(true), [refresh]);

  useEffect(() => {
    if (!auto) return;
    void load();
  }, [auto, load]);

  return {
    data,
    loading,
    error,
    /** Force bypass of server live cache */
    refresh: hardRefresh,
    /** Soft load may use warm server cache */
    load,
  };
}
