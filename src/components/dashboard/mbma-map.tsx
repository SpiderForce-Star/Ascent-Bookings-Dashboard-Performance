import { useEffect, useMemo, useRef, useState } from "react";
import {
  choroplethFill,
  formatMbmaActual,
  metricOf,
  type County,
  type QuarterKey,
} from "@/data/mbma";
import {
  fitViewBox,
  pathStats,
  pathToScreen,
  pointInRings,
  unionBBox,
} from "@/data/mbma/path-fit";
import type { MbmaGeo, MbmaGeoFeature } from "@/data/mbma/types";
import { cn } from "@/lib/utils";
import { useMbmaGeo } from "@/hooks/use-mbma-geo";

interface MbmaMapProps {
  counties: County[];
  metric: QuarterKey;
  selectedFips: string | null;
  onSelect: (fips: string) => void;
  isolatedLabel?: string | null;
}

export function MbmaMap({ counties, metric, selectedFips, onSelect, isolatedLabel }: MbmaMapProps) {
  const { geo, failed } = useMbmaGeo();
  const isolated = Boolean(isolatedLabel);

  if (failed) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] text-sm text-[var(--color-fg-muted)]">
        County map could not be loaded.
      </div>
    );
  }
  if (!geo) return <MapSkeleton isolated={isolated} />;

  const quarter = metric === "ytd" ? "YTD" : metric.toUpperCase();
  const kicker = isolated
    ? `${isolatedLabel} · county shipments · ${quarter}`
    : `600-mile radar · county shipments · ${quarter}`;

  return (
    <FittedChoropleth
      geo={geo}
      counties={counties}
      metric={metric}
      selectedFips={selectedFips}
      onSelect={onSelect}
      padPx={24}
      legendPx={22}
      minHeight={isolated ? 520 : 380}
      maxHeight={isolated ? 560 : 440}
      showLabels={isolated}
      showTooltip
      kicker={kicker}
      fittedNote={isolated ? "fitted to this state" : "fitted to counties in view"}
      ariaLabel={kicker}
    />
  );
}

export function FittedChoropleth({
  geo,
  counties,
  metric,
  selectedFips,
  onSelect,
  padPx,
  legendPx,
  minHeight,
  maxHeight,
  showLabels,
  showTooltip,
  kicker,
  fittedNote,
  ariaLabel,
  compact,
}: {
  geo: MbmaGeo;
  counties: County[];
  metric: QuarterKey;
  selectedFips?: string | null;
  onSelect?: (fips: string) => void;
  padPx: number;
  legendPx: number;
  minHeight: number;
  maxHeight: number;
  showLabels: boolean;
  showTooltip: boolean;
  kicker?: string;
  fittedNote?: string;
  ariaLabel: string;
  compact?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 640, h: minHeight });
  const [tip, setTip] = useState<{ x: number; y: number; county: County } | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r || r.width < 8) return;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth || 640, h: el.clientHeight || minHeight });
    return () => ro.disconnect();
  }, [minHeight]);

  const byFips = useMemo(() => {
    const m = new Map<string, County>();
    for (const c of counties) m.set(c.fips, c);
    return m;
  }, [counties]);

  const max = useMemo(
    () => counties.reduce((n, c) => Math.max(n, metricOf(c, metric)), 0),
    [counties, metric],
  );

  const visible = useMemo(() => {
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

  const bbox = useMemo(() => {
    const boxes = visible.map((f) => pathStats(f.fips, f.d).bbox);
    return unionBBox(boxes);
  }, [visible]);

  const aspectH = useMemo(() => {
    if (!bbox) return minHeight;
    const bw = Math.max(bbox.maxX - bbox.minX, 1);
    const bh = Math.max(bbox.maxY - bbox.minY, 1);
    const w = size.w || 640;
    const fitted = (w * bh) / bw + padPx + legendPx;
    const wide = bw / bh > 2.05;
    const floor = wide ? Math.min(minHeight, 360) : minHeight;
    return Math.min(maxHeight, Math.max(floor, fitted));
  }, [bbox, size.w, minHeight, maxHeight, padPx, legendPx]);

  const viewBox = useMemo(() => {
    if (!bbox) return "0 0 960 620";
    return fitViewBox(bbox, Math.max(size.w, 8), Math.max(size.h || aspectH, 8), padPx, legendPx);
  }, [bbox, size.w, size.h, aspectH, padPx, legendPx]);

  const labels = useMemo(() => {
    if (!showLabels || !bbox) return [];
    const featByFips = new Map(visible.map((f) => [f.fips, f]));
    const ranked = [...counties].sort((a, b) => metricOf(b, metric) - metricOf(a, metric));
    const svgH = size.h || aspectH;
    const collect = (requireInside: boolean) => {
      const picks: { fips: string; name: string; value: number; x: number; y: number }[] = [];
      const screens: { left: number; top: number }[] = [];
      for (const c of ranked) {
        if (picks.length >= 8) break;
        const feat = featByFips.get(c.fips);
        if (!feat) continue;
        const stats = pathStats(feat.fips, feat.d);
        if (requireInside && !pointInRings(stats.centroid.x, stats.centroid.y, stats.rings)) continue;
        const screen = pathToScreen(stats.centroid.x, stats.centroid.y, viewBox, size.w, svgH);
        if (screen.left < 8 || screen.top < 8 || screen.left > size.w - 8 || screen.top > svgH - 28) continue;
        if (screens.some((p) => Math.hypot(p.left - screen.left, p.top - screen.top) < 28)) continue;
        screens.push(screen);
        picks.push({
          fips: c.fips,
          name: c.name,
          value: metricOf(c, metric),
          x: stats.centroid.x,
          y: stats.centroid.y,
        });
      }
      return picks;
    };
    const inside = collect(true);
    return inside.length ? inside : collect(false);
  }, [showLabels, bbox, counties, metric, visible, viewBox, size.w, size.h, aspectH]);

  return (
    <div className="relative">
      {(kicker || fittedNote) && (
        <p className={cn("mb-2 text-xs text-[var(--color-fg-muted)]", compact && "mb-1")}>
          {kicker}
          {fittedNote ? (
            <span className="text-[var(--color-fg-subtle)]"> · {fittedNote}</span>
          ) : null}
        </p>
      )}
      <div
        ref={wrapRef}
        className="relative w-full overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-bg-elevated)]"
        style={{ minHeight, height: aspectH }}
      >
        <svg
          viewBox={viewBox}
          role="img"
          aria-label={ariaLabel}
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          onMouseLeave={() => setTip(null)}
        >
          {visible.map((f) => (
            <CountyPath
              key={f.fips}
              feature={f}
              county={byFips.get(f.fips)}
              metric={metric}
              max={max}
              selected={f.fips === selectedFips}
              onSelect={onSelect}
              onTip={
                showTooltip
                  ? (e, county) => placeTip(e, wrapRef.current, county, setTip)
                  : undefined
              }
            />
          ))}
        </svg>

        {showLabels &&
          labels.map((lb) => {
            const pos = pathToScreen(lb.x, lb.y, viewBox, size.w, size.h || aspectH);
            return (
              <div
                key={lb.fips}
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-sm bg-white/80 px-1 py-0.5 text-[10px] font-medium leading-tight text-[var(--color-fg)] shadow-sm"
                style={{ left: pos.left, top: pos.top }}
              >
                {lb.name} {formatMbmaActual(lb.value)}
              </div>
            );
          })}

        {showTooltip && tip && (
          <div
            className="pointer-events-none absolute z-20 min-w-[176px] max-w-[220px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-xs shadow-[var(--shadow-md)]"
            style={{
              left: Math.min(tip.x + 12, size.w - 200),
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
      </div>

      {!compact && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-fg-subtle)]">
          <span>Low</span>
          <span className="inline-flex h-2.5 w-28 overflow-hidden rounded-full">
            {[0, 0.15, 0.35, 0.55, 0.75, 1].map((t) => (
              <span
                key={t}
                className="h-full flex-1"
                style={{ background: t === 0 ? "#f3f4f6" : choroplethFill(t * (max || 1), max || 1) }}
              />
            ))}
          </span>
          <span className="tabular">High {max > 0 ? formatMbmaActual(max) : "—"}</span>
          <span className="text-[var(--color-fg-subtle)]">· this view</span>
        </div>
      )}
    </div>
  );
}

function CountyPath({
  feature,
  county,
  metric,
  max,
  selected,
  onSelect,
  onTip,
}: {
  feature: MbmaGeoFeature;
  county: County | undefined;
  metric: QuarterKey;
  max: number;
  selected: boolean;
  onSelect?: (fips: string) => void;
  onTip?: (e: { clientX: number; clientY: number }, county: County) => void;
}) {
  if (!county) return null;
  const value = metricOf(county, metric);
  return (
    <path
      d={feature.d}
      fill={choroplethFill(value, max)}
      stroke={selected ? "#c8102e" : "#9ca3af"}
      strokeWidth={selected ? 2 : 0.7}
      style={{ vectorEffect: "non-scaling-stroke" }}
      className={onSelect ? "cursor-pointer" : undefined}
      onMouseEnter={onTip ? (e) => onTip(e, county) : undefined}
      onMouseMove={onTip ? (e) => onTip(e, county) : undefined}
      onClick={onSelect ? () => onSelect(feature.fips) : undefined}
    >
      <title>
        {county.name} County, {county.state} · {feature.fips}
      </title>
    </path>
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

export function MapSkeleton({ isolated }: { isolated?: boolean }) {
  return (
    <div
      className="flex flex-col justify-end rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-4"
      style={{ minHeight: isolated ? 520 : 280 }}
      aria-hidden
    >
      <div className="mx-auto mb-8 h-[55%] w-[85%] animate-pulse rounded-[28%] bg-[var(--color-bg-muted)]" />
      <p className="text-xs text-[var(--color-fg-subtle)]">Loading county map…</p>
    </div>
  );
}
