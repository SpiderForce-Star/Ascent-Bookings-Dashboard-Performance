import { useCallback, useEffect, useState } from "react";
import {
  DEMO_DODGE_COMPANIES,
  DEMO_DODGE_PROJECTS,
  summarizeProjects,
  type DodgeProjectsResponse,
} from "@/data/dodge";

const fallback: DodgeProjectsResponse = {
  fetchedAt: new Date(0).toISOString(),
  status: {
    configured: false,
    mode: "demo",
    message: "Loading Dodge pipeline…",
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
      // Route always returns a board shape; if not, fall back to demo
      if (!json?.projects || !Array.isArray(json.projects)) {
        throw new Error("Invalid Dodge response shape");
      }
      setData(json);
      return json;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setData({
        fetchedAt: new Date().toISOString(),
        status: {
          configured: false,
          mode: "demo",
          message: "Could not reach Dodge API route — using local demo pipeline.",
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
      });
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
