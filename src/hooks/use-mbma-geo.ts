import { useEffect, useState } from "react";
import type { MbmaGeo } from "@/data/mbma/types";

let geoPromise: Promise<MbmaGeo> | null = null;

function loadGeo(): Promise<MbmaGeo> {
  if (!geoPromise) {
    geoPromise = import("@/data/mbma/geo.json").then((mod) => mod.default as MbmaGeo);
  }
  return geoPromise;
}

export function useMbmaGeo() {
  const [geo, setGeo] = useState<MbmaGeo | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadGeo()
      .then((g) => {
        if (!cancelled) setGeo(g);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { geo, failed };
}
