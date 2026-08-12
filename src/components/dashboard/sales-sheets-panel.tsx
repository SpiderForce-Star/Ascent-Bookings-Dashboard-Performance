import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PRODUCT_LINE_LABEL,
  sheetForCode,
  type StateSalesSheet,
} from "@/data/sales-sheets";
import { regionLabels, type TerritoryState } from "@/data/territory";
import { BUILDING_LABEL, STAGE_LABEL } from "@/data/dodge";
import { useTerritory, type ManagedTerritoryState } from "@/lib/territory-store";
import { formatCurrency, cn } from "@/lib/utils";
import {
  ArrowLeft,
  ClipboardList,
  Download,
  Factory,
  MapPin,
  Phone,
  Printer,
  User,
} from "lucide-react";

type RegionFilter = "all" | TerritoryState["region"];
type SortKey = "demand" | "pipeline" | "miles" | "name";

interface SheetOverrides {
  /** Sheet-local only when not using territory assignedRep; kept for vpNotes/quota */
  salesperson?: string;
  vpNotes: string;
  quotaTarget: number;
}

export function SalesSheetsPanel() {
  const { states: territoryList, updateState, plant } = useTerritory();
  const [selected, setSelected] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("all");
  const [sort, setSort] = useState<SortKey>("demand");
  const [overrides, setOverrides] = useState<Record<string, SheetOverrides>>({});

  const rows = useMemo(() => {
    const built: Array<{ state: ManagedTerritoryState; sheet: StateSalesSheet }> = [];
    for (const st of territoryList) {
      try {
        const sheet = sheetForCode(st.code);
        const ov = overrides[st.code];
        const rep = (st.assignedRep ?? ov?.salesperson ?? sheet?.salesperson ?? "").toString().trim();
        built.push({
          state: st,
          sheet: {
            ...sheet,
            salesperson: rep,
            marketNotes: st.notes || sheet.marketNotes,
            pembShare: Number.isFinite(st.pembShare) ? st.pembShare : sheet.pembShare,
            vpNotes: ov?.vpNotes ?? sheet.vpNotes,
            quotaTarget: ov?.quotaTarget ?? sheet.quotaTarget,
            opportunities: Array.isArray(sheet.opportunities) ? sheet.opportunities : [],
            callList: Array.isArray(sheet.callList) ? sheet.callList : [],
            topBuildingTypes: Array.isArray(sheet.topBuildingTypes) ? sheet.topBuildingTypes : [],
          },
        });
      } catch {
        // One bad state must not white-screen the tab
      }
    }
    let list = built;
    if (regionFilter !== "all") {
      list = list.filter((r) => r.state.region === regionFilter);
    }
    list.sort((a, b) => {
      if (sort === "demand") return b.state.demand - a.state.demand;
      if (sort === "pipeline") return b.state.pipeline - a.state.pipeline;
      if (sort === "miles") return a.state.milesFromPlant - b.state.milesFromPlant;
      return a.state.name.localeCompare(b.state.name);
    });
    return list;
  }, [territoryList, regionFilter, sort, overrides]);

  const selectedRow = selected ? rows.find((r) => r.state.code === selected) ?? null : null;

  function patchSheet(code: string, patch: Partial<SheetOverrides & { salesperson: string }>) {
    if (patch.salesperson !== undefined) {
      // Keep Territory + Sales Sheets in sync
      updateState(code, { assignedRep: patch.salesperson });
    }
    setOverrides((prev) => {
      const seed = sheetForCode(code);
      const base = prev[code] ?? {
        vpNotes: seed.vpNotes,
        quotaTarget: seed.quotaTarget,
      };
      const next = { ...base, ...patch };
      delete (next as { salesperson?: string }).salesperson;
      return { ...prev, [code]: next };
    });
  }

  function downloadCsvPack() {
    const header = [
      "State",
      "Code",
      "Region",
      "Miles",
      "Salesperson",
      "Demand",
      "PipelineIndex",
      "Pipeline$",
      "DesignBidding$",
      "ActiveProjects",
      "PEMBShare%",
      "Bids30",
      "Bids60",
      "Bids90",
      "QuotaTarget$",
      "TopBuildingTypes",
      "MarketNotes",
      "VPNotes",
    ];
    const lines = [header.join(",")];
    // Full footprint (not UI filter) so export matches Territory CSV scope
    const exportRows: Array<{ state: ManagedTerritoryState; sheet: StateSalesSheet }> = [];
    for (const st of territoryList) {
      try {
        const base = sheetForCode(st.code);
        const ov = overrides[st.code];
        exportRows.push({
          state: st,
          sheet: {
            ...base,
            salesperson: (st.assignedRep ?? ov?.salesperson ?? base.salesperson ?? "").toString().trim(),
            marketNotes: st.notes || base.marketNotes,
            pembShare: Number.isFinite(st.pembShare) ? st.pembShare : base.pembShare,
            vpNotes: ov?.vpNotes ?? base.vpNotes,
            quotaTarget: ov?.quotaTarget ?? base.quotaTarget,
          },
        });
      } catch {
        /* skip one bad state */
      }
    }
    for (const { state, sheet } of exportRows) {
      const cells = [
        state.name,
        state.code,
        state.region,
        String(state.milesFromPlant),
        (sheet.salesperson ?? "").toString().trim(),
        String(state.demand),
        String(state.pipeline),
        String(sheet.pipelineDollars),
        String(sheet.designBiddingValue),
        String(sheet.activeProjects),
        (sheet.pembShare * 100).toFixed(1),
        String(sheet.bidsDue30),
        String(sheet.bidsDue60),
        String(sheet.bidsDue90),
        String(sheet.quotaTarget),
        sheet.topBuildingTypes.join("; "),
        sheet.marketNotes,
        sheet.vpNotes,
      ].map(csvEscape);
      lines.push(cells.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ascent-state-sales-sheets.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function printStateSheet() {
    window.print();
  }

  if (selectedRow) {
    return (
      <StateSheetDetail
        state={selectedRow.state}
        sheet={selectedRow.sheet}
        onBack={() => setSelected(null)}
        onPatch={(patch) => patchSheet(selectedRow.state.code, patch)}
        onPrint={printStateSheet}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[var(--color-primary)]">
            <ClipboardList className="size-3.5" />
            VP Sales handoff
          </div>
          <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
            State sales summary sheets
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-fg-muted)]">
            Independent PEMB / CSI Division 13 territory packs for regional reps. Pipeline figures are{" "}
            <strong className="font-medium text-[var(--color-fg)]">illustrative planning data</strong> —
            not booked revenue by state. Plant: {plant.name}.
          </p>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={downloadCsvPack} className="gap-1.5">
          <Download className="size-3.5" />
          Download CSV pack
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-[var(--color-fg-subtle)]">Region</span>
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
        <span className="ml-2 text-xs font-medium text-[var(--color-fg-subtle)]">Sort</span>
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

      {rows.length === 0 && (
        <p className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-8 text-center text-sm text-[var(--color-fg-muted)]">
          No state sheets available for this filter.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ state, sheet }) => (
          <button
            key={state.code}
            type="button"
            onClick={() => setSelected(state.code)}
            className="group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 text-left shadow-[var(--shadow-sm)] transition-all hover:border-[var(--color-primary)]/40 hover:shadow-[var(--shadow-md)] focus-visible:outline-none"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-display text-lg font-semibold tracking-tight">
                  {state.name}{" "}
                  <span className="text-sm font-medium text-[var(--color-fg-subtle)]">{state.code}</span>
                </p>
                {(sheet.salesperson ?? "").toString().trim() !== "" && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--color-fg-muted)]">
                    <User className="size-3" />
                    {sheet.salesperson}
                  </p>
                )}
              </div>
              <Badge
                variant={
                  state.region === "core" ? "default" : state.region === "primary" ? "secondary" : "outline"
                }
              >
                {regionLabels[state.region].split(" ")[0]}
              </Badge>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <MiniStat label="Demand" value={String(state.demand)} />
              <MiniStat label="Pipeline idx" value={String(state.pipeline)} />
              <MiniStat label="PEMB" value={`${(state.pembShare * 100).toFixed(0)}%`} />
            </div>
            <p className="mt-1 text-center text-[10px] text-[var(--color-fg-subtle)]">
              Illus. pipeline {formatCurrency(sheet.pipelineDollars, true)}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-fg-subtle)]">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" />
                {state.milesFromPlant === 0 ? "Plant" : `${state.milesFromPlant} mi`}
              </span>
              <span>·</span>
              <span>{sheet.activeProjects} PEMB opps</span>
              <span>·</span>
              <span>
                Bids 30d: <span className="tabular font-medium text-[var(--color-fg)]">{sheet.bidsDue30}</span>
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-xs text-[var(--color-fg-muted)]">{sheet.marketNotes}</p>
            <p className="mt-3 text-xs font-medium text-[var(--color-primary)] opacity-0 transition-opacity group-hover:opacity-100">
              Open sales sheet →
            </p>
          </button>
        ))}
      </div>

      <p className="text-[11px] text-[var(--color-fg-subtle)]">
        Regional rep fields start blank for VP Sales to assign. Quotas and opportunity $ are illustrative
        planning data for handoff — keep real bookings on the Performance tab.
      </p>
    </div>
  );
}

function StateSheetDetail({
  state,
  sheet,
  onBack,
  onPatch,
  onPrint,
}: {
  state: ManagedTerritoryState | TerritoryState;
  sheet: StateSalesSheet;
  onBack: () => void;
  onPatch: (patch: Partial<SheetOverrides & { salesperson: string }>) => void;
  onPrint: () => void;
}) {
  return (
    <div className="space-y-4 print:space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between print:hidden">
        <div>
          <Button type="button" size="sm" variant="secondary" onClick={onBack} className="mb-2 gap-1.5">
            <ArrowLeft className="size-3.5" />
            All states
          </Button>
          <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[var(--color-primary)]">
            <ClipboardList className="size-3.5" />
            State sales sheet
          </div>
          <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
            {state.name} ({state.code})
          </h2>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            PEMB / CSI Division 13 metal building systems · {regionLabels[state.region]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={onPrint} className="gap-1.5">
            <Printer className="size-3.5" />
            Print / PDF
          </Button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
          Ascent Buildings LLC · State sales sheet
        </p>
        <h1 className="font-display text-2xl font-semibold">
          {state.name} ({state.code})
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 print:grid-cols-4">
        <StatCard
          icon={Factory}
          label="Region tier"
          value={regionLabels[state.region].split(" ")[0]}
        />
        <StatCard
          icon={MapPin}
          label="Miles from plant"
          value={state.milesFromPlant === 0 ? "Portland plant" : `${state.milesFromPlant} mi`}
        />
        <StatCard label="Demand score" value={String(state.demand)} />
        <StatCard label="Pipeline index" value={String(state.pipeline)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Assignment</CardTitle>
            <CardDescription>
              Shared with Territory tab — blank until VP assigns (synced in this browser)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <label className="block text-xs font-medium text-[var(--color-fg-subtle)]">
              Assigned salesperson
              <input
                className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm print:border-0 print:bg-transparent print:px-0"
                value={sheet.salesperson ?? ""}
                placeholder="Assign rep…"
                onChange={(e) => onPatch({ salesperson: e.target.value })}
              />
            </label>
            <label className="block text-xs font-medium text-[var(--color-fg-subtle)]">
              Annual quota / target $
              <input
                type="number"
                className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm tabular print:border-0 print:bg-transparent print:px-0"
                value={sheet.quotaTarget}
                onChange={(e) => onPatch({ quotaTarget: Number(e.target.value) || 0 })}
              />
            </label>
            <p className="text-[11px] text-[var(--color-fg-subtle)]">
              Target is illustrative planning — not a booked revenue allocation.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Market notes</CardTitle>
            <CardDescription>PEMB / Division 13 focus for the regional rep</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <p className="text-sm text-[var(--color-fg-muted)]">{sheet.marketNotes}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">PEMB {(sheet.pembShare * 100).toFixed(0)}%</Badge>
              {(sheet.topBuildingTypes ?? []).map((t) => (
                <Badge key={t} variant="secondary" className="capitalize">
                  {t}
                </Badge>
              ))}
            </div>
            <label className="block text-xs font-medium text-[var(--color-fg-subtle)]">
              VP of Sales notes
              <textarea
                className="mt-1 min-h-[88px] w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm print:border-0 print:bg-transparent print:px-0"
                value={sheet.vpNotes}
                onChange={(e) => onPatch({ vpNotes: e.target.value })}
              />
            </label>
          </CardContent>
        </Card>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Pipeline $" value={formatCurrency(sheet.pipelineDollars, true)} accent />
        <Kpi label="Design / bid $" value={formatCurrency(sheet.designBiddingValue, true)} />
        <Kpi label="Active projects" value={String(sheet.activeProjects)} />
        <Kpi label="Bids ≤30d" value={String(sheet.bidsDue30)} />
        <Kpi label="Bids ≤60d" value={String(sheet.bidsDue60)} />
        <Kpi label="Bids ≤90d" value={String(sheet.bidsDue90)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">PEMB opportunities</CardTitle>
            <CardDescription>
              Sample CSI Division 13 / metal building pipeline ({(sheet.opportunities ?? []).length} projects) —
              illustrative
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto pt-0">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-fg-subtle)]">
                  <th className="pb-2 pr-2 font-medium">Project</th>
                  <th className="pb-2 pr-2 font-medium">Line</th>
                  <th className="pb-2 pr-2 font-medium">Stage</th>
                  <th className="pb-2 pr-2 text-right font-medium">Value</th>
                  <th className="pb-2 font-medium">Bid</th>
                </tr>
              </thead>
              <tbody>
                {(sheet.opportunities ?? []).map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-[var(--color-border)]/70 align-top"
                    title={o.notes}
                  >
                    <td className="py-2.5 pr-2">
                      <p className="font-medium leading-snug">{o.title}</p>
                      <p className="text-xs text-[var(--color-fg-muted)]">
                        {o.city} · {BUILDING_LABEL[o.buildingType]}
                      </p>
                    </td>
                    <td className="py-2.5 pr-2">
                      <Badge variant={o.productLine === "PEMB" ? "default" : "secondary"}>
                        {PRODUCT_LINE_LABEL[o.productLine]}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-2 text-xs text-[var(--color-fg-muted)]">
                      {STAGE_LABEL[o.stage]}
                    </td>
                    <td className="py-2.5 pr-2 text-right tabular font-medium">
                      {formatCurrency(o.valuation, true)}
                    </td>
                    <td className="py-2.5 text-xs tabular text-[var(--color-fg-muted)]">
                      {o.bidDate ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="size-4" />
              Suggested call list
            </CardTitle>
            <CardDescription>Architect / GC / developer placeholders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {(sheet.callList ?? []).map((c, i) => (
              <div
                key={`${c.firm}-${i}`}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2.5"
              >
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-[var(--color-fg-muted)]">
                  {c.role} · {c.firm}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--color-fg-subtle)]">{c.city}</p>
              </div>
            ))}
            {(sheet.callList ?? []).length === 0 && (
              <p className="text-sm text-[var(--color-fg-muted)]">No contacts seeded for this state.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-[11px] text-[var(--color-fg-subtle)] print:mt-4">
        Ascent Buildings LLC · Portland, TN · Pre-Engineered Metal Buildings (PEMB) / CSI Division 13 Special
        Construction. Pipeline and opportunities are demo planning data for sales handoff.
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg)] px-1.5 py-1.5">
      <p className="text-[10px] text-[var(--color-fg-subtle)]">{label}</p>
      <p className="text-xs font-semibold tabular">{value}</p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Factory;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        {Icon && (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-bg-subtle)] text-[var(--color-primary)]">
            <Icon className="size-4" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs text-[var(--color-fg-subtle)]">{label}</p>
          <p className="truncate text-sm font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className={cn(accent && "border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]/35")}>
      <CardContent className="p-3 sm:p-4">
        <p className="text-[11px] text-[var(--color-fg-subtle)]">{label}</p>
        <p className="mt-1 font-display text-lg font-semibold tabular tracking-tight sm:text-xl">{value}</p>
      </CardContent>
    </Card>
  );
}

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
