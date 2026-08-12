import { useCallback, useEffect, useState } from "react";
import { fallbackIndustryBrief, type IndustryBriefResponse } from "@/data/industry-brief";

export function useIndustryBrief(auto = true) {
  const [data, setData] = useState<IndustryBriefResponse>(() =>
    fallbackIndustryBrief("Loading industry desk…"),
  );
  const [loading, setLoading] = useState(auto);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const q = force ? "?refresh=1" : "";
      const res = await fetch(`/api/industry-brief${q}`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as IndustryBriefResponse;
      if (!json || !Array.isArray(json.headlines) || !Array.isArray(json.associations)) {
        throw new Error("Invalid industry brief");
      }
      setData(json);
      return json;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setData(fallbackIndustryBrief(msg));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!auto) return;
    void refresh(false);
  }, [auto, refresh]);

  return { data, loading, error, refresh };
}
