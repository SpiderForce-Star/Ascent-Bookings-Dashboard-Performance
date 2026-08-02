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

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dodge/projects?maxMiles=600&minValuation=1000000", {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as DodgeProjectsResponse;
      setData(json);
      return json;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setData((prev) => ({
        ...prev,
        status: {
          ...prev.status,
          message: "Could not reach Dodge API route — using local demo pipeline.",
          mode: "demo",
        },
      }));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!auto) return;
    void refresh();
  }, [auto, refresh]);

  return { data, loading, error, refresh };
}
