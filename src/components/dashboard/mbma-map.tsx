import { useEffect, useMemo, useRef, useState } from "react";
import {
  choroplethFill,
  formatMbmaActual,
  metricOf,
  type County,
  type QuarterKey,
} from "@/data/mbma";
import type { MbmaGeo } from "@/data/mbma/types";

interface MbmaMapProps {
  counties: County[];
  colored: County[];
  metric: QuarterKey;
  selectedFips: string | null;
  onSelect: (fips: string) => void;
}

export function MbmaMap({ counties, colored, metric, selectedFips, onSelect }: MbmaMapProps) {
  const [geo, setGeo] = useState<MbmaGeo | null>(null);
  const [failed, setFailed] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; county: County } | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("@/data/mbma/geo.json")
      .then((mod) => {
        if (!cancelled) setGeo(mod.default as MbmaGeo);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byFips = useMemo(() => {
    const m = new Map<string, County>();
    for (const c of counties) m.set(c.fips, c);
    return m;
  }, [counties]);

  const coloredFips = useMemo(() => new Set(colored.map((c) => c.fips)), [colored]);
  const max = useMemo(
    () => colored.reduce((n, c) => Math.max(n, metricOf(c, metric)), 0),
    [colored, metric],
  );

  const features = useMemo(() => {
    if (!geo) return [];
    const wanted = new Set(counties.map((c) => c.fips));
    const list = geo.features.filter((f) => wanted.has(f.fips));
    if (!selectedFips) return list;
    const i = list.findIndex((f) => f.fips === selectedFips);
    if (i < 0) return list;
    const copy = [...list];
    const [sel] = copy.splice(i, 1);
    copy.push(sel);
    return copy;
  }, [geo, counties, selectedFips]);

  if (failed) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] text-sm text-[var(--color-fg-muted)]">
        County map could not be loaded.
      </div>
    );
  }

  if (!geo) return <MapSkeleton />;

  return (
    <div ref={wrapRef} className="relative">
      <svg
        viewBox={geo.viewBox}
        role="img"
        aria-label="MBMA county shipment choropleth for the 600-mile radar"
        className="h-auto w-full max-w-full overflow-visible rounded-[var(--radius-lg)] bg-[var(--color-bg)]"
        onMouseLeave={() => setTip(null)}
      >
        {features.map((f) => {
          const county = byFips.get(f.fips);
          if (!county) return null;
          const active = coloredFips.has(f.fips);
          const value = metricOf(county, metric);
          const selected = f.fips === selectedFips;
          return (
            <path
              key={f.fips}
              d={f.d}
              fill={active ? choroplethFill(value, max) : "var(--color-bg-subtle)"}
              fillOpacity={active ? 1 : 0.4}
              stroke={selected ? "var(--color-ink)" : "var(--color-bg-elevated)"}
              strokeWidth={selected ? 1.8 : 0.35}
              className="cursor-pointer transition-[fill,stroke-width] duration-150"
              onMouseEnter={(e) => placeTip(e, wrapRef.current, county, setTip)}
              onMouseMove={(e) => placeTip(e, wrapRef.current, county, setTip)}
              onClick={() => onSelect(f.fips)}
            >
              <title>
                {county.name} County, {county.state} · {county.fips}
              </title>
            </path>
          );
        })}
      </svg>

      {tip && (
        <div
          className="pointer-events-none absolute z-20 min-w-[176px] max-w-[220px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-xs shadow-[var(--shadow-md)]"
          style={{
            left: Math.min(tip.x + 12, (wrapRef.current?.clientWidth ?? 320) - 200),
            top: Math.max(8, tip.y - 96),
          }}
        >
          <p className="font-semibold text-[var(--color-fg)]">
            {tip.county.name} County, {tip.county.state}
          </p>
          <p className="text-[var(--color-fg-subtle)]">FIPS {tip.county.fips}</p>
          <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 tabular text-[var(--color-fg-muted)]">
            {(["q1", "q2", "q3", "q4", "ytd"] as const).map((k) => (
              <span key={k} className="contents">
                <dt className={k === "ytd" ? "font-medium text-[var(--color-fg)]" : undefined}>
                  {k.toUpperCase()}
                </dt>
                <dd
                  className={
                    k === "ytd"
                      ? "text-right font-semibold text-[var(--color-fg)]"
                      : "text-right text-[var(--color-fg)]"
                  }
                >
                  {formatMbmaActual(tip.county[k])}
                </dd>
              </span>
            ))}
          </dl>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-fg-subtle)]">
        <span>Shipment $</span>
        <span className="inline-flex h-2.5 w-28 overflow-hidden rounded-full">
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => (
            <span
              key={t}
              className="h-full flex-1"
              style={{
                background: t === 0 ? "var(--color-bg-muted)" : choroplethFill(t * (max || 1), max || 1),
              }}
            />
          ))}
        </span>
        <span>Low</span>
        <span className="tabular">High {max > 0 ? formatMbmaActual(max) : "—"}</span>
      </div>
    </div>
  );
}

function placeTip(
  e: { clientX: number; clientY: number },
  el: HTMLDivElement | null,
  county: County,
  setTip: (t: { x: number; y: number; county: County }) => void,
) {
  const rect = el?.getBoundingClientRect();
  if (!rect) return;
  setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, county });
}

export function MapSkeleton() {
  return (
    <div
      className="flex min-h-[280px] flex-col justify-end rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-4 sm:min-h-[420px]"
      aria-hidden
    >
      <div className="mx-auto mb-8 h-[55%] w-[85%] animate-pulse rounded-[40%] bg-[var(--color-bg-muted)]" />
      <div className="flex gap-2">
        <div className="h-2 w-28 animate-pulse rounded-full bg-[var(--color-bg-muted)]" />
        <div className="h-2 w-16 animate-pulse rounded-full bg-[var(--color-bg-muted)]" />
      </div>
      <p className="mt-2 text-xs text-[var(--color-fg-subtle)]">Loading county map…</p>
    </div>
  );
}
