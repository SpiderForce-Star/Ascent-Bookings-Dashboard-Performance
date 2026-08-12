import { useCallback, useEffect, useState } from "react";
import {
  SAMPLE_MARKET_NEWS,
  demoMarketNewsResponse,
  type MarketNewsResponse,
} from "@/data/market-news";

interface State {
  data: MarketNewsResponse;
  loading: boolean;
  error: string | null;
  lastRefresh: string | null;
}

const INITIAL: MarketNewsResponse = {
  fetchedAt: new Date().toISOString(),
  mode: "demo",
  provider: null,
  items: SAMPLE_MARKET_NEWS,
  message: "Loading market intelligence…",
};

export function useMarketNews(auto = true) {
  const [state, setState] = useState<State>({
    data: INITIAL,
    loading: auto,
    error: null,
    lastRefresh: null,
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch("/api/market-news?refresh=1", {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as MarketNewsResponse;
      setState({
        data: data.items?.length ? data : demoMarketNewsResponse("Empty response — curated offline intel."),
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
        data: s.data.items.length ? s.data : demoMarketNewsResponse(),
      }));
      return null;
    }
  }, []);

  useEffect(() => {
    if (!auto) return;
    // Initial load without forced cache bypass (server may still serve warm cache)
    void (async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch("/api/market-news", {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as MarketNewsResponse;
        setState({
          data: data.items?.length ? data : demoMarketNewsResponse(),
          loading: false,
          error: null,
          lastRefresh: new Date().toISOString(),
        });
      } catch (err) {
        setState({
          data: demoMarketNewsResponse(),
          loading: false,
          error: err instanceof Error ? err.message : String(err),
          lastRefresh: null,
        });
      }
    })();
  }, [auto]);

  return { ...state, refresh };
}
