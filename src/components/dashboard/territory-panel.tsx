import { useMemo, useState, type ComponentType } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { regionLabels } from "@/data/territory";
import {
  downloadTerritoryCsv,
  downloadTerritoryOverridesJson,
  useTerritory,
  type ManagedTerritoryState,
  type TerritoryRegion,
} from "@/lib/territory-store";
import { cn } from "@/lib/utils";
import {
  Download,
  Factory,
  MapPin,
  Navigation,
  Radius,
  RotateCcw,
  Search,
  Settings2,
} from "lucide-react";

const regionTone: Record<string, string> = {
  core: "bg-[var(--color-primary)] text-[var(--color-primary-fg)]",
  primary: "bg-[var(--color-ink)] text-white",
  extended: "bg-[var(--color-bg-muted)] text-[var(--color-fg-muted)]",
};

type RegionFilter = "all" | TerritoryRegion;
type SortKey = "demand" | "pipeline" | "miles" | "name";

export function TerritoryPanel() {
  const { states, totals, updateState, resetState, resetAll, plant } = useTerritory();
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("all");
  const [sort, setSort] = useState<SortKey>("demand");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = useMemo(() => {
    let list = [...states];
    if (regionFilter !== "all") list = list.filter((s) => s.region === regionFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => {
      if (sort === "demand") return b.demand - a.demand;
      if (sort === "pipeline") return b.pipeline - a.pipeline;
      if (sort === "miles") return a.milesFromPlant - b.milesFromPlant;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [states, regionFilter, sort, query]);

  const stateByCode = useMemo(() => {
    const m = new Map<string, ManagedTerritoryState>();
    for (const s of states) m.set(s.code, s);
    return m;
  }, [states]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[var(--color-primary)]">
            <Navigation className="size-3.5" />
            Territory management
          </div>
          <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Portland, TN service footprint
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-fg-muted)]">
            Manage the ~{plant.radiusMiles}-mile PEMB / CSI Division 13 footprint. Edits save in this
            browser and stay aligned with Sales Sheets. No login required.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="gap-1.5"
            onClick={() => downloadTerritoryCsv(states)}
          >
            <Download className="size-3.5" />
            Territory CSV
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="gap-1.5"
            onClick={() => downloadTerritoryOverridesJson()}
            disabled={totals.overriddenCount === 0}
          >
            <Download className="size-3.5" />
            Overrides JSON
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="gap-1.5"
            onClick={() => {
              if (window.confirm("Reset all territory overrides to seed defaults?")) resetAll();
            }}
            disabled={totals.overriddenCount === 0}
          >
            <RotateCcw className="size-3.5" />
            Reset all
          </Button>
        </div>
      </div>

      {/* Plant summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat icon={Factory} label="Plant" value="Portland, TN" />
        <Stat icon={Radius} label="Primary radius" value={`${plant.radiusMiles} mi`} />
        <Stat icon={MapPin} label="States" value={String(totals.stateCount)} />
        <Stat
          icon={Navigation}
          label="Core / Primary / Ext"
          value={`${totals.coreCount} / ${totals.primaryCount} / ${totals.extendedCount}`}
        />
        <Stat icon={Navigation} label="Avg demand" value={totals.avgDemand.toFixed(0)} />
        <Stat
          icon={Settings2}
          label="Overrides saved"
          value={String(totals.overriddenCount)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader>
            <CardTitle>Territory map</CardTitle>
            <CardDescription>Schematic of the ~600-mile commercial building market</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="relative aspect-square w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)]">
              <div className="absolute inset-[8%] rounded-full border border-dashed border-[var(--color-border-strong)]/60" />
              <div className="absolute inset-[22%] rounded-full border border-dashed border-[var(--color-primary)]/40" />
              <div className="absolute inset-[38%] rounded-full border border-[var(--color-primary)]/50 bg-[var(--color-primary-soft)]/30" />
              <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
                <div className="flex size-10 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-[var(--shadow-md)]">
                  <Factory className="size-5" />
                </div>
                <span className="mt-1 rounded-full bg-[var(--color-bg-elevated)] px-2 py-0.5 text-[10px] font-semibold shadow-sm">
                  Portland, TN
                </span>
              </div>
              {POSITIONS.map((p) => {
                const st = stateByCode.get(p.code);
                if (!st) return null;
                return (
                  <div
                    key={p.code}
                    className="absolute z-[5] -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    title={`${st.name} · ${st.milesFromPlant} mi · demand ${st.demand}`}
                  >
                    <span
                      className={cn(
                        "inline-flex min-w-8 items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold shadow-sm",
                        regionTone[st.region],
                      )}
                    >
                      {p.code}
                    </span>
                  </div>
                );
              })}
              <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-2 text-[10px] text-[var(--color-fg-subtle)]">
                <span className="inline-flex items-center gap-1">
                  <span className="size-2 rounded-sm bg-[var(--color-primary)]" /> Core
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-2 rounded-sm bg-[var(--color-ink)]" /> Primary
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-2 rounded-sm bg-[var(--color-bg-muted)]" /> Extended
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings2 className="size-4 text-[var(--color-primary)]" />
              Manage states
            </CardTitle>
            <CardDescription>
              Edit region tier, demand, pipeline, PEMB share, notes, and optional rep. Changes save
              automatically in this browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <label className="relative min-w-[160px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-fg-subtle)]" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search state…"
                  className="h-9 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] pl-8 pr-3 text-sm"
                />
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(["all", "core", "primary", "extended"] as const).map((r) => (
                  <Button
                    key={r}
                    type="button"
                    size="sm"
                    variant={regionFilter === r ? "default" : "secondary"}
                    className="h-8 rounded-full capitalize"
                    onClick={() => setRegionFilter(r)}
                  >
                    {r === "all" ? "All" : r}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="self-center text-xs text-[var(--color-fg-subtle)]">Sort</span>
                {(
                  [
                    ["demand", "Demand"],
                    ["pipeline", "Pipeline"],
                    ["miles", "Miles"],
                    ["name", "Name"],
                  ] as const
                ).map(([id, label]) => (
                  <Button
                    key={id}
                    type="button"
                    size="sm"
                    variant={sort === id ? "default" : "secondary"}
                    className="h-8 rounded-full"
                    onClick={() => setSort(id)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="max-h-[520px] overflow-auto rounded-[var(--radius-md)] border border-[var(--color-border)]">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead className="sticky top-0 z-[1] bg-[var(--color-bg-elevated)]">
                  <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-fg-subtle)]">
                    <th className="px-2 py-2 font-medium">State</th>
                    <th className="px-2 py-2 font-medium">Region</th>
                    <th className="px-2 py-2 text-right font-medium">Mi</th>
                    <th className="px-2 py-2 text-right font-medium">Demand</th>
                    <th className="px-2 py-2 text-right font-medium">Pipe</th>
                    <th className="px-2 py-2 text-right font-medium">PEMB%</th>
                    <th className="px-2 py-2 font-medium">Rep</th>
                    <th className="px-2 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((st) => (
                    <TerritoryRow
                      key={st.code}
                      state={st}
                      expanded={expanded === st.code}
                      onToggle={() => setExpanded((c) => (c === st.code ? null : st.code))}
                      onUpdate={(partial) => updateState(st.code, partial)}
                      onReset={() => resetState(st.code)}
                    />
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-10 text-center text-sm text-[var(--color-fg-muted)]">
                        No states match the current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)]/25">
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-sm font-semibold text-[var(--color-fg)]">Top demand markets</p>
            <p className="text-xs text-[var(--color-fg-muted)]">
              Highest relative commercial demand within the Ascent footprint (live config)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {totals.topMarkets.map((m, i) => (
              <Badge key={m.code} variant={i === 0 ? "default" : "secondary"} className="gap-1">
                {m.code}
                <span className="tabular opacity-80">{m.demand}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-[var(--color-fg-subtle)]">
        Avg pipeline index {totals.avgPipeline.toFixed(0)} · sum {totals.sumPipeline} · avg PEMB{" "}
        {(totals.avgPembShare * 100).toFixed(0)}%. Overrides stored locally as{" "}
        <code className="rounded bg-[var(--color-bg-subtle)] px-1">ascent-territory-overrides-v1</code>.
      </p>
    </div>
  );
}

function TerritoryRow({
  state: st,
  expanded,
  onToggle,
  onUpdate,
  onReset,
}: {
  state: ManagedTerritoryState;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (p: {
    region?: TerritoryRegion;
    demand?: number;
    pipeline?: number;
    pembShare?: number;
    notes?: string;
    milesFromPlant?: number;
    assignedRep?: string;
  }) => void;
  onReset: () => void;
}) {
  return (
    <>
      <tr
        className={cn(
          "border-b border-[var(--color-border)]/70 hover:bg-[var(--color-bg-subtle)]/40",
          expanded && "bg-[var(--color-bg-subtle)]/50",
        )}
      >
        <td className="px-2 py-2">
          <button type="button" onClick={onToggle} className="text-left">
            <span className="font-medium">{st.name}</span>
            <span className="ml-1.5 text-xs text-[var(--color-fg-subtle)]">{st.code}</span>
            {st.isOverridden && (
              <Badge variant="default" className="ml-1.5 text-[9px]">
                edited
              </Badge>
            )}
          </button>
        </td>
        <td className="px-2 py-2">
          <select
            className="h-8 max-w-[110px] rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-1.5 text-xs"
            value={st.region}
            onChange={(e) => onUpdate({ region: e.target.value as TerritoryRegion })}
            aria-label={`${st.code} region`}
          >
            <option value="core">Core</option>
            <option value="primary">Primary</option>
            <option value="extended">Extended</option>
          </select>
        </td>
        <td className="px-2 py-2 text-right">
          <input
            type="number"
            min={0}
            max={2000}
            className="h-8 w-16 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-1 text-right text-xs tabular"
            value={st.milesFromPlant}
            onChange={(e) => onUpdate({ milesFromPlant: Number(e.target.value) })}
            aria-label={`${st.code} miles`}
          />
        </td>
        <td className="px-2 py-2 text-right">
          <input
            type="number"
            min={0}
            max={100}
            className="h-8 w-14 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-1 text-right text-xs tabular"
            value={st.demand}
            onChange={(e) => onUpdate({ demand: Number(e.target.value) })}
            aria-label={`${st.code} demand`}
          />
        </td>
        <td className="px-2 py-2 text-right">
          <input
            type="number"
            min={0}
            max={200}
            className="h-8 w-14 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-1 text-right text-xs tabular"
            value={st.pipeline}
            onChange={(e) => onUpdate({ pipeline: Number(e.target.value) })}
            aria-label={`${st.code} pipeline`}
          />
        </td>
        <td className="px-2 py-2 text-right">
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            className="h-8 w-14 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-1 text-right text-xs tabular"
            value={Math.round(st.pembShare * 100)}
            onChange={(e) => onUpdate({ pembShare: Number(e.target.value) / 100 })}
            aria-label={`${st.code} PEMB share`}
          />
        </td>
        <td className="px-2 py-2">
          <input
            type="text"
            className="h-8 w-28 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-1.5 text-xs"
            value={st.assignedRep}
            placeholder="Assign rep…"
            onChange={(e) => onUpdate({ assignedRep: e.target.value })}
            aria-label={`${st.code} assigned rep`}
          />
        </td>
        <td className="px-2 py-2">
          <div className="flex gap-1">
            <Button type="button" size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={onToggle}>
              {expanded ? "Less" : "Notes"}
            </Button>
            {st.isOverridden && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 px-2 text-xs"
                onClick={onReset}
                title="Reset this state to defaults"
              >
                <RotateCcw className="size-3" />
              </Button>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/80">
          <td colSpan={8} className="px-3 py-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-[var(--color-fg-subtle)]">
                  Market notes
                  <textarea
                    className="mt-1 min-h-[72px] w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-2 py-1.5 text-sm"
                    value={st.notes}
                    onChange={(e) => onUpdate({ notes: e.target.value })}
                  />
                </label>
              </div>
              <div className="space-y-2 text-xs text-[var(--color-fg-muted)]">
                <p>
                  <span className="font-medium text-[var(--color-fg)]">Region: </span>
                  {regionLabels[st.region]}
                </p>
                <p>
                  <span className="font-medium text-[var(--color-fg)]">PEMB share: </span>
                  <span className="tabular">{(st.pembShare * 100).toFixed(0)}%</span>
                </p>
                <p className="text-[var(--color-fg-subtle)]">
                  Assigned rep is blank by default. Sales Sheets use the same value when filled.
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-bg-subtle)] text-[var(--color-primary)]">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-[var(--color-fg-subtle)]">{label}</p>
          <p className="truncate text-sm font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const POSITIONS: { code: string; x: number; y: number }[] = [
  { code: "TN", x: 50, y: 50 },
  { code: "KY", x: 52, y: 36 },
  { code: "AL", x: 48, y: 66 },
  { code: "GA", x: 60, y: 64 },
  { code: "MS", x: 38, y: 64 },
  { code: "AR", x: 32, y: 52 },
  { code: "MO", x: 36, y: 36 },
  { code: "IL", x: 44, y: 28 },
  { code: "IN", x: 54, y: 28 },
  { code: "OH", x: 62, y: 26 },
  { code: "WV", x: 68, y: 34 },
  { code: "PA", x: 74, y: 24 },
  { code: "VA", x: 72, y: 42 },
  { code: "NC", x: 70, y: 54 },
  { code: "SC", x: 66, y: 62 },
  { code: "FL", x: 62, y: 78 },
  { code: "TX", x: 18, y: 68 },
];
