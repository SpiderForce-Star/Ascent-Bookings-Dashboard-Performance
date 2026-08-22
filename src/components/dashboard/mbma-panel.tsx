import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, RotateCcw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  COUNTIES,
  DATA_AS_OF,
  DEFAULT_MBMA_FILTERS,
  DEFAULT_PIN_FIPS,
  MBMA_META,
  NATIONAL_YTD,
  QUARTER_LABELS,
  RADAR_PCT_OF_NATIONAL,
  RADAR_YTD,
  STATE_BY_CODE,
  STATE_RECORDS,
  filterCounties,
  formatMbmaActual,
  formatThousands,
  metricOf,
  toCountyRows,
  type MbmaFilters,
  type QuarterKey,
  type RadarStateCode,
} from "@/data/mbma";
import { cn } from "@/lib/utils";
import { MbmaMap } from "./mbma-map";

type TableSortKey = "rank" | "name" | "state" | "metricValue" | "q1" | "q2" | "q3" | "q4" | "pctOfState";

/**
 * TODO: Once internal bookings are tagged by state/county, overlay Ascent
 * volume vs MBMA industry volume.
 */
export function MbmaPanel() {
  const [filters, setFilters] = useState<MbmaFilters>(DEFAULT_MBMA_FILTERS);
  const [selectedFips, setSelectedFips] = useState<string>(DEFAULT_PIN_FIPS);
  const [sortKey, setSortKey] = useState<TableSortKey>("metricValue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const skipTableScroll = useRef(true);

  const filtered = useMemo(() => filterCounties(COUNTIES, filters), [filters]);
  const rows = useMemo(() => {
    const base = toCountyRows(filtered, filters.metric);
    const copy = [...base];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });
    return copy;
  }, [filtered, filters.metric, sortKey, sortDir]);

  const radarInView = useMemo(
    () => filtered.reduce((s, c) => s + metricOf(c, filters.metric), 0),
    [filtered, filters.metric],
  );
  const topCounty = rows[0] ?? null;
  const reporting = filtered.filter((c) => metricOf(c, filters.metric) > 0).length;

  const selectedCounty = useMemo(
    () => COUNTIES.find((c) => c.fips === selectedFips) ?? COUNTIES.find((c) => c.fips === DEFAULT_PIN_FIPS),
    [selectedFips],
  );

  const detailStateCode: RadarStateCode =
    filters.isolatedState ?? selectedCounty?.state ?? "TN";
  const detailState = STATE_BY_CODE[detailStateCode];
  const detailCounties = useMemo(
    () => toCountyRows(filtered.filter((c) => c.state === detailStateCode), filters.metric).slice(0, 12),
    [filtered, detailStateCode, filters.metric],
  );

  useEffect(() => {
    if (skipTableScroll.current) {
      skipTableScroll.current = false;
      return;
    }
    const el = document.getElementById(`mbma-county-${selectedFips}`);
    const wrap = el?.closest("[data-mbma-table]");
    el?.scrollIntoView({ block: "nearest" });
    wrap?.scrollIntoView({ block: "nearest" });
  }, [selectedFips]);

  function isolateState(code: RadarStateCode) {
    setFilters((prev) => {
      const next = prev.isolatedState === code ? null : code;
      return {
        ...prev,
        isolatedState: next,
        region: next && next !== "FL" ? "radar" : prev.region,
      };
    });
    if (selectedCounty?.state !== code) {
      const top = COUNTIES.filter((c) => c.state === code).sort((a, b) => b.ytd - a.ytd)[0];
      if (top) setSelectedFips(top.fips);
    }
  }

  function toggleSort(key: TableSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "state" ? "asc" : "desc");
    }
  }

  function reset() {
    setFilters(DEFAULT_MBMA_FILTERS);
    setSelectedFips(DEFAULT_PIN_FIPS);
    setSortKey("metricValue");
    setSortDir("desc");
  }

  const dirty =
    filters.metric !== "ytd" ||
    filters.region !== "radar" ||
    filters.isolatedState !== null ||
    filters.query.trim() !== "" ||
    selectedFips !== DEFAULT_PIN_FIPS;

  return (
    <div className="space-y-5 overflow-x-hidden">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--color-fg)] sm:text-4xl">
            MBMA
          </h1>
          <p className="mt-1 text-sm font-medium text-[var(--color-fg)] sm:text-base">
            Non-Agriculture Shipments — 600-mile radar (2025)
          </p>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-fg-muted)]">
            Industry-wide MBMA data. Not Ascent bookings. Internal use only.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Internal use only</Badge>
          <Badge variant="secondary">Not Ascent bookings</Badge>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {STATE_RECORDS.map((s) => (
          <StateCard
            key={s.code}
            state={s}
            metric={filters.metric}
            isolated={filters.isolatedState === s.code || (filters.region === "northFl" && s.code === "FL")}
            dimmed={
              (filters.isolatedState !== null && filters.isolatedState !== s.code) ||
              (filters.region === "northFl" && s.code !== "FL")
            }
            onToggle={() => isolateState(s.code)}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi
          label="Radar in view"
          value={formatMbmaActual(radarInView)}
          note={
            filters.metric === "ytd"
              ? `${((radarInView / NATIONAL_YTD) * 100).toFixed(2)}% of U.S.`
              : `${QUARTER_LABELS.find((q) => q.id === filters.metric)?.label} in current view`
          }
        />
        <Kpi
          label="Top county"
          value={topCounty ? formatMbmaActual(topCounty.metricValue) : "—"}
          note={topCounty ? `${topCounty.name} ${topCounty.state}` : "No counties in view"}
        />
        <Kpi label="Counties reporting" value={formatThousands(reporting)} note={`${formatThousands(filtered.length)} in current view`} />
        <Kpi
          label="National total"
          value={formatMbmaActual(NATIONAL_YTD)}
          note="U.S. MBMA non-ag YTD · context only"
        />
      </div>

      <Card>
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-fg-subtle)]">
              Quarter
            </span>
            {QUARTER_LABELS.map((q) => (
              <Button
                key={q.id}
                type="button"
                size="sm"
                variant={filters.metric === q.id ? "default" : "secondary"}
                className={cn(
                  "min-h-11 min-w-11 rounded-full px-4",
                  filters.metric !== q.id && "bg-[var(--color-bg-subtle)] border-transparent",
                )}
                aria-pressed={filters.metric === q.id}
                onClick={() => {
                  setFilters((p) => ({ ...p, metric: q.id }));
                  setSortKey("metricValue");
                  setSortDir("desc");
                }}
              >
                {q.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-fg-subtle)]">
              Region
            </span>
            {(
              [
                ["radar", "600-mile radar"],
                ["northFl", "N. Florida / panhandle"],
              ] as const
            ).map(([id, label]) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={filters.region === id ? "default" : "secondary"}
                className={cn(
                  "min-h-11 rounded-full px-4",
                  filters.region !== id && "bg-[var(--color-bg-subtle)] border-transparent",
                )}
                aria-pressed={filters.region === id}
                onClick={() => {
                  setFilters((p) => ({
                    ...p,
                    region: id,
                    isolatedState: id === "northFl" ? null : p.isolatedState,
                  }));
                  if (id === "northFl") {
                    const duval = COUNTIES.find((c) => c.fips === "12031");
                    if (duval) setSelectedFips(duval.fips);
                  }
                }}
              >
                {label}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="min-h-11 gap-1.5 rounded-full"
              onClick={reset}
              disabled={!dirty}
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          </div>

          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-fg-subtle)]" />
            <input
              type="search"
              value={filters.query}
              onChange={(e) => setFilters((p) => ({ ...p, query: e.target.value }))}
              placeholder="Search county or state"
              className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] pl-10 pr-3 text-sm text-[var(--color-fg)] outline-none placeholder:text-[var(--color-fg-subtle)] focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </label>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>County heat map</CardTitle>
            <CardDescription>
              600-mile radar only — no national map. Color ={" "}
              {QUARTER_LABELS.find((q) => q.id === filters.metric)?.label} shipment dollars. Florida is
              north / panhandle counties only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <EmptyState message="No counties match the current filters." />
            ) : (
              <MbmaMap
                counties={filtered}
                colored={filtered}
                metric={filters.metric}
                selectedFips={selectedFips}
                onSelect={(fips) => setSelectedFips(fips)}
              />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {detailState.shortLabel === detailState.postal
                ? detailState.name
                : `${detailState.shortLabel} · ${detailState.name}`}
            </CardTitle>
            <CardDescription>
              {detailState.northOnly
                ? "North / panhandle mix — not full-state Florida."
                : `National rank ${detailState.rank} · radar-adjusted volume.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-2xl font-semibold tabular tracking-tight">
              {formatMbmaActual(metricOf(detailState, filters.metric))}
            </p>
            <p className="text-xs text-[var(--color-fg-muted)]">
              {detailState.pctOfNational.toFixed(2)}% of U.S. YTD
              {detailState.northOnly ? " (north/panhandle share)" : ""} · Rank {detailState.rank}
              {detailState.northOnly ? " (full-state context)" : ""}
            </p>
            <QuarterMix state={detailState} active={filters.metric} />
            {detailCounties.length === 0 ? (
              <EmptyState message="No counties in this state for the current filters." />
            ) : (
              <ol className="space-y-1 text-sm">
                {detailCounties.map((c) => (
                  <li key={c.fips}>
                    <button
                      type="button"
                      className={cn(
                        "flex min-h-11 w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] px-2 text-left hover:bg-[var(--color-bg-subtle)]",
                        c.fips === selectedFips && "bg-[var(--color-primary-soft)]",
                      )}
                      onClick={() => setSelectedFips(c.fips)}
                    >
                      <span className="truncate">
                        <span className="tabular text-[var(--color-fg-subtle)]">{c.rank}.</span> {c.name}
                      </span>
                      <span className="shrink-0 tabular">{formatMbmaActual(c.metricValue)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top counties</CardTitle>
          <CardDescription>
            Ranked by {QUARTER_LABELS.find((q) => q.id === filters.metric)?.label} ·{" "}
            {formatThousands(rows.length)} counties in view
            {selectedCounty ? ` · pinned ${selectedCounty.name} ${selectedCounty.state}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {rows.length === 0 ? (
            <EmptyState message="No counties match the current filters." />
          ) : (
            <div data-mbma-table className="max-h-[min(70vh,560px)] overflow-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--color-bg-elevated)]">
                  <tr className="border-b border-[var(--color-border)] text-[11px] font-medium uppercase tracking-wide text-[var(--color-fg-subtle)]">
                    <Th k="rank" label="Rank" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                    <Th k="name" label="County" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                    <Th k="state" label="State" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                    <Th k="metricValue" label="Volume" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                    <Th k="q1" label="Q1" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                    <Th k="q2" label="Q2" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                    <Th k="q3" label="Q3" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                    <Th k="q4" label="Q4" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                    <Th k="pctOfState" label="% of state" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const selected = row.fips === selectedFips;
                    return (
                      <tr
                        key={row.fips}
                        id={`mbma-county-${row.fips}`}
                        className={cn(
                          "cursor-pointer border-b border-[var(--color-border)]/70 transition-colors hover:bg-[var(--color-primary-soft)]/40",
                          selected && "bg-[var(--color-primary-soft)]",
                        )}
                        onClick={() => setSelectedFips(row.fips)}
                      >
                        <td className="py-2.5 pr-3 tabular text-[var(--color-fg-muted)]">{row.rank}</td>
                        <td className="py-2.5 pr-3 font-medium">{row.name}</td>
                        <td className="py-2.5 pr-3 text-[var(--color-fg-muted)]">{row.state}</td>
                        <td className="py-2.5 pr-3 text-right tabular">{formatMbmaActual(row.metricValue)}</td>
                        <td className="py-2.5 pr-3 text-right tabular text-[var(--color-fg-muted)]">
                          {formatMbmaActual(row.q1)}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular text-[var(--color-fg-muted)]">
                          {formatMbmaActual(row.q2)}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular text-[var(--color-fg-muted)]">
                          {formatMbmaActual(row.q3)}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular text-[var(--color-fg-muted)]">
                          {formatMbmaActual(row.q4)}
                        </td>
                        <td className="py-2.5 text-right tabular">{(row.pctOfState * 100).toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-[var(--color-fg-subtle)]">
        Data as of: {DATA_AS_OF}. {MBMA_META.disclaimer} Figures are industry shipment dollars. Full radar{" "}
        {formatMbmaActual(RADAR_YTD)} ({RADAR_PCT_OF_NATIONAL.toFixed(2)}% of U.S.). Florida on this page is
        north / panhandle only.
      </p>
    </div>
  );
}

function StateCard({
  state,
  metric,
  isolated,
  dimmed,
  onToggle,
}: {
  state: (typeof STATE_RECORDS)[number];
  metric: QuarterKey;
  isolated: boolean;
  dimmed: boolean;
  onToggle: () => void;
}) {
  const quarters = [state.q1, state.q2, state.q3, state.q4];
  const max = Math.max(...quarters, 1);
  const labels: QuarterKey[] = ["q1", "q2", "q3", "q4"];
  const volume = metricOf(state, metric);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isolated}
      className={cn(
        "min-h-[44px] rounded-[var(--radius-md)] border bg-[var(--color-bg-elevated)] p-3 text-left shadow-[var(--shadow-sm)] transition-opacity",
        isolated
          ? "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]"
          : "border-[var(--color-border)]",
        dimmed && "opacity-45",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-xs font-semibold tracking-wide">{state.shortLabel}</span>
        <span className="text-[10px] tabular text-[var(--color-fg-subtle)]">Rank {state.rank}</span>
      </div>
      <p className="mt-0.5 truncate text-[11px] text-[var(--color-fg-muted)]">{state.name}</p>
      <p className="mt-1.5 text-base font-semibold tabular tracking-tight">{formatMbmaActual(volume)}</p>
      <p className="text-[10px] text-[var(--color-fg-subtle)]">{state.pctOfNational.toFixed(2)}% of U.S.</p>
      <div className="mt-2 flex h-7 items-end gap-0.5" aria-hidden>
        {quarters.map((v, i) => (
          <div
            key={labels[i]}
            className={cn(
              "flex-1 rounded-sm",
              labels[i] === metric ? "bg-[var(--color-primary)]" : "bg-[var(--color-primary)]/30",
            )}
            style={{ height: `${Math.max(3, (v / max) * 28)}px` }}
          />
        ))}
      </div>
    </button>
  );
}

function QuarterMix({
  state,
  active,
}: {
  state: (typeof STATE_RECORDS)[number];
  active: QuarterKey;
}) {
  const items: { id: QuarterKey; label: string; value: number }[] = [
    { id: "q1", label: "Q1", value: state.q1 },
    { id: "q2", label: "Q2", value: state.q2 },
    { id: "q3", label: "Q3", value: state.q3 },
    { id: "q4", label: "Q4", value: state.q4 },
  ];
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-1.5">
      {items.map((i) => (
        <div key={i.id} className="flex items-center gap-2 text-xs">
          <span className="w-6 text-[var(--color-fg-subtle)]">{i.label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-subtle)]">
            <div
              className={cn("h-full rounded-full", i.id === active ? "bg-[var(--color-primary)]" : "bg-[var(--color-ink)]/50")}
              style={{ width: `${(i.value / max) * 100}%` }}
            />
          </div>
          <span className="w-14 text-right tabular">{formatMbmaActual(i.value)}</span>
        </div>
      ))}
    </div>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2.5 shadow-[var(--shadow-sm)]">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-fg-subtle)]">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular tracking-tight">{value}</p>
      <p className="text-[11px] text-[var(--color-fg-subtle)]">{note}</p>
    </div>
  );
}

function Th({
  k,
  label,
  sortKey,
  sortDir,
  onSort,
  align,
}: {
  k: TableSortKey;
  label: string;
  sortKey: TableSortKey;
  sortDir: "asc" | "desc";
  onSort: (k: TableSortKey) => void;
  align?: "right";
}) {
  return (
    <th className={cn("py-2 pr-3 font-medium", align === "right" && "text-right")}>
      <button
        type="button"
        className={cn(
          "inline-flex min-h-11 items-center gap-1 hover:text-[var(--color-fg)]",
          align === "right" && "flex-row-reverse",
        )}
        onClick={() => onSort(k)}
      >
        {label}
        {sortKey !== k ? (
          <ArrowUpDown className="size-3 opacity-40" />
        ) : sortDir === "asc" ? (
          <ArrowUp className="size-3" />
        ) : (
          <ArrowDown className="size-3" />
        )}
      </button>
    </th>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] px-4 text-center text-sm text-[var(--color-fg-muted)]">
      {message}
    </div>
  );
}
