import { useCallback, useEffect, useState } from "react";
import {
  CACHED_FEEDS,
  type ConstructionFeedsResponse,
} from "@/data/construction-feeds";

interface State {
  data: ConstructionFeedsResponse;
  loading: boolean;
  error: string | null;
  lastRefresh: string | null;
}

export function useConstructionFeeds(auto = true) {
  const [state, setState] = useState<State>({
    data: CACHED_FEEDS,
    loading: auto,
    error: null,
    lastRefresh: null,
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch("/api/construction-feeds", {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ConstructionFeedsResponse;
      setState({
        data,
        loading: false,
        error: null,
        lastRefresh: new Date().toISOString(),
      });
      return data;
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : String(err),
        data: s.data.live ? s.data : CACHED_FEEDS,
      }));
      return null;
    }
  }, []);

  useEffect(() => {
    if (!auto) return;
    void refresh();
  }, [auto, refresh]);

  return { ...state, refresh };
}
