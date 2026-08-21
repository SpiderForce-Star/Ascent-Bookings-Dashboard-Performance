import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, MapPinned, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  COUNTY_SHIPMENTS,
  DATA_AS_OF,
  DEFAULT_MBMA_FILTERS,
  FOCUS_PCT_OF_NATIONAL,
  FOCUS_STATE_CODES,
  FOCUS_STATES,
  FOCUS_YTD,
  MBMA_META,
  QUARTER_LABELS,
  filterCounties,
  formatMbmaActual,
  formatMbmaDollars,
  formatThousands,
  toCountyRows,
  type FocusStateCode,
  type MbmaFilters,
  type QuarterKey,
} from "@/data/mbma";
import { cn } from "@/lib/utils";
import { MbmaMap } from "./mbma-map";

type TableSortKey = "rank" | "name" | "state" | "ytd" | "q1" | "q2" | "q3" | "q4" | "pctOfState";

/**
 * TODO: Once internal bookings are tagged by state/county, add a comparison
 * layer (Ascent volume vs MBMA industry volume).
 */
export function MbmaPanel() {
  const [filters, setFilters] = useState<MbmaFilters>(DEFAULT_MBMA_FILTERS);
  const [selectedFips, setSelectedFips] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<TableSortKey>("ytd");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const selectedStates = useMemo(
    () => FOCUS_STATES.filter((s) => filters.states.includes(s.code)),
    [filters.states],
  );

  const mapCounties = useMemo(
    () => COUNTY_SHIPMENTS.filter((c) => filters.states.includes(c.state)),
    [filters.states],
  );

  const filtered = useMemo(() => filterCounties(COUNTY_SHIPMENTS, filters), [filters]);
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

  function toggleState(code: FocusStateCode) {
    setFilters((prev) => {
      const has = prev.states.includes(code);
      const next = has ? prev.states.filter((s) => s !== code) : [...prev.states, code];
      return { ...prev, states: next.length ? next : prev.states };
    });
  }

  function toggleSort(key: TableSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "state" ? "asc" : "desc");
    }
  }

  useEffect(() => {
    if (!selectedFips) return;
    document.getElementById(`mbma-county-${selectedFips}`)?.scrollIntoView({ block: "nearest" });
  }, [selectedFips]);

  function reset() {
    setFilters(DEFAULT_MBMA_FILTERS);
    setSelectedFips(null);
    setSortKey("ytd");
    setSortDir("desc");
  }

  const dirty =
    filters.states.length !== FOCUS_STATE_CODES.length ||
    filters.metric !== "ytd" ||
    filters.eastTexas ||
    filters.northernFlorida ||
    selectedFips !== null;

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--color-fg)] sm:text-4xl">
            MBMA
          </h1>
          <p className="mt-1 text-sm font-medium text-[var(--color-fg)] sm:text-base">
            Non-Agriculture Shipments — Target Territory (2025)
          </p>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-fg-muted)]">
            Industry-wide MBMA data. Not Ascent bookings. Internal use only.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Internal use only</Badge>
          <Badge variant="secondary">Values in $000s</Badge>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryStat
          label="Focus territory YTD"
          value={formatMbmaActual(FOCUS_YTD)}
          note={`${formatMbmaDollars(FOCUS_YTD)} in $000s`}
        />
        <SummaryStat
          label="Share of national"
          value={`${FOCUS_PCT_OF_NATIONAL.toFixed(0)}%`}
          note="Six-state target territory"
        />
        <SummaryStat
          label="States in view"
          value={String(selectedStates.length)}
          note={`${formatThousands(filtered.length)} counties`}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Filters</CardTitle>
          <CardDescription>Focus territory only — Texas, Florida, Ohio, Indiana, Missouri, Illinois.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-fg-subtle)]">
              States
            </span>
            {FOCUS_STATES.map((s) => {
              const on = filters.states.includes(s.code);
              return (
                <Button
                  key={s.code}
                  type="button"
                  size="sm"
                  variant={on ? "default" : "secondary"}
                  className={cn("h-8 rounded-full px-3", !on && "bg-[var(--color-bg-subtle)] border-transparent")}
                  aria-pressed={on}
                  onClick={() => toggleState(s.code)}
                >
                  {s.name}
                </Button>
              );
            })}
          </div>

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
                  "h-8 rounded-full px-3",
                  filters.metric !== q.id && "bg-[var(--color-bg-subtle)] border-transparent",
                )}
                aria-pressed={filters.metric === q.id}
                onClick={() => {
                  setFilters((p) => ({ ...p, metric: q.id }));
                  setSortKey(q.id === "ytd" ? "ytd" : q.id);
                  setSortDir("desc");
                }}
              >
                {q.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-fg-subtle)]">
              Clusters
            </span>
            <Button
              type="button"
              size="sm"
              variant={filters.eastTexas ? "default" : "secondary"}
              className={cn("h-8 rounded-full px-3", !filters.eastTexas && "bg-[var(--color-bg-subtle)] border-transparent")}
              aria-pressed={filters.eastTexas}
              onClick={() => setFilters((p) => ({ ...p, eastTexas: !p.eastTexas }))}
            >
              East Texas (Houston cluster)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={filters.northernFlorida ? "default" : "secondary"}
              className={cn(
                "h-8 rounded-full px-3",
                !filters.northernFlorida && "bg-[var(--color-bg-subtle)] border-transparent",
              )}
              aria-pressed={filters.northernFlorida}
              onClick={() => setFilters((p) => ({ ...p, northernFlorida: !p.northernFlorida }))}
            >
              Northern Florida
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="ml-auto h-8 gap-1.5 rounded-full"
              onClick={reset}
              disabled={!dirty}
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {selectedStates.map((s) => (
          <StateCard key={s.code} state={s} active={filters.metric} />
        ))}
        {selectedStates.length === 0 && (
          <p className="col-span-full text-sm text-[var(--color-fg-muted)]">Select at least one focus state.</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPinned className="size-4 text-[var(--color-primary)]" />
            County heat map
          </CardTitle>
          <CardDescription>
            Choropleth of the six-state focus territory. Color = {QUARTER_LABELS.find((q) => q.id === filters.metric)?.label}{" "}
            shipment dollars. Hover or click a county; table rows highlight the same county.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mapCounties.length === 0 ? (
            <EmptyState message="No states selected." />
          ) : (
            <MbmaMap
              counties={mapCounties}
              colored={filtered}
              metric={filters.metric}
              selectedFips={selectedFips}
              onSelect={(fips) => setSelectedFips((cur) => (cur === fips ? null : fips))}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Top counties</CardTitle>
            <CardDescription>
              Ranked by {QUARTER_LABELS.find((q) => q.id === filters.metric)?.label} · {formatThousands(rows.length)}{" "}
              counties in view
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {rows.length === 0 ? (
            <EmptyState message="No counties match the current filters." />
          ) : (
            <div className="max-h-[min(70vh,560px)] overflow-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--color-bg-elevated)]">
                  <tr className="border-b border-[var(--color-border)] text-[11px] font-medium uppercase tracking-wide text-[var(--color-fg-subtle)]">
                    <Th k="rank" label="Rank" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                    <Th k="name" label="County" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                    <Th k="state" label="State" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                    <Th k="ytd" label="YTD $" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
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
                        onClick={() => setSelectedFips((cur) => (cur === row.fips ? null : row.fips))}
                      >
                        <td className="py-2 pr-3 tabular text-[var(--color-fg-muted)]">{row.rank}</td>
                        <td className="py-2 pr-3 font-medium">{row.name}</td>
                        <td className="py-2 pr-3 text-[var(--color-fg-muted)]">{row.state}</td>
                        <td className="py-2 pr-3 text-right tabular">{formatThousands(row.ytd)}</td>
                        <td className="py-2 pr-3 text-right tabular text-[var(--color-fg-muted)]">
                          {formatThousands(row.q1)}
                        </td>
                        <td className="py-2 pr-3 text-right tabular text-[var(--color-fg-muted)]">
                          {formatThousands(row.q2)}
                        </td>
                        <td className="py-2 pr-3 text-right tabular text-[var(--color-fg-muted)]">
                          {formatThousands(row.q3)}
                        </td>
                        <td className="py-2 pr-3 text-right tabular text-[var(--color-fg-muted)]">
                          {formatThousands(row.q4)}
                        </td>
                        <td className="py-2 text-right tabular">{(row.pctOfState * 100).toFixed(1)}%</td>
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
        Data as of: {DATA_AS_OF}. {MBMA_META.disclaimer} Figures are industry shipment dollars in thousands — not Ascent
        booked revenue.
      </p>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  note,
  className,
}: {
  label: string;
  value: string;
  note: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2.5 shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-fg-subtle)]">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular tracking-tight">{value}</p>
      <p className="text-[11px] text-[var(--color-fg-subtle)]">{note}</p>
    </div>
  );
}

function StateCard({
  state,
  active,
}: {
  state: (typeof FOCUS_STATES)[number];
  active: QuarterKey;
}) {
  const quarters = [state.q1, state.q2, state.q3, state.q4];
  const max = Math.max(...quarters, 1);
  const labels: QuarterKey[] = ["q1", "q2", "q3", "q4"];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-display text-base font-semibold">{state.name}</p>
            <p className="text-[11px] text-[var(--color-fg-subtle)]">National rank {state.rank}</p>
          </div>
          <Badge variant={state.rank <= 3 ? "default" : "secondary"}>Rank {state.rank}</Badge>
        </div>
        <p className="mt-3 text-2xl font-semibold tabular tracking-tight">{formatMbmaDollars(state.ytd)}</p>
        <p className="text-xs text-[var(--color-fg-muted)]">
          YTD $ (000s) · {state.pctOfNational.toFixed(2)}% of national · ≈ {formatMbmaActual(state.ytd)}
        </p>
        <div className="mt-3 flex items-end gap-1.5" aria-hidden>
          {quarters.map((v, i) => (
            <div key={labels[i]} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  "w-full rounded-sm",
                  labels[i] === active ? "bg-[var(--color-primary)]" : "bg-[var(--color-primary)]/35",
                )}
                style={{ height: `${Math.max(4, (v / max) * 36)}px` }}
                title={`${labels[i].toUpperCase()} ${formatMbmaDollars(v)}`}
              />
              <span className="text-[10px] uppercase text-[var(--color-fg-subtle)]">{labels[i]}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
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
          "inline-flex items-center gap-1 hover:text-[var(--color-fg)]",
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
    <div className="flex h-40 items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] text-sm text-[var(--color-fg-muted)]">
      {message}
    </div>
  );
}
