import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BUILDING_LABEL,
  PEMB_BUILDING_TYPES,
  PRODUCT_LINE_LABEL,
  STAGE_LABEL,
  isPembFocused,
  type DodgeProject,
  type DodgeProjectStage,
  type ProductLine,
} from "@/data/dodge";
import { useDodgeProjects } from "@/hooks/use-dodge-projects";
import { DODGE_DISMISS_STORAGE_KEY, useDodgeDismissed } from "@/lib/dodge-dismiss-store";
import { MarketNewsSection } from "@/components/dashboard/market-news-section";
import { formatCurrency, cn } from "@/lib/utils";
import {
  ArchiveRestore,
  Building2,
  FilterX,
  Loader2,
  MapPin,
  Printer,
  Radio,
  RefreshCw,
  RotateCcw,
  Trash2,
  GanttChartSquare,
} from "lucide-react";

const STAGE_VARIANT: Record<
  DodgeProjectStage,
  "default" | "secondary" | "success" | "warn" | "outline" | "danger"
> = {
  bidding: "default",
  design: "secondary",
  planning: "outline",
  preconstruction: "success",
  construction: "warn",
  completed: "outline",
  on_hold: "danger",
  unknown: "secondary",
};

type ProductFilter = "pemb" | "all" | ProductLine;
type BoardTab = "active" | "removed";

/** All lines on first paint so the Active board is never empty for board review. */
const DEFAULT_PRODUCT: ProductFilter = "all";
const DEFAULT_STAGE = "all";
const DEFAULT_SORT: "valuation" | "miles" | "bid" = "valuation";

function isBidWithinDays(iso: string | null, days: number): boolean {
  if (!iso) return false;
  const t = new Date(`${iso}T12:00:00`).getTime();
  if (!Number.isFinite(t)) return false;
  const now = Date.now();
  const horizon = now + days * 86_400_000;
  return t >= now - 86_400_000 && t <= horizon;
}

export function DodgePanel() {
  const { data, loading, error, refresh } = useDodgeProjects(true);
  const { dismissedIds, dismissedCount, dismiss, restore, restoreAll, resetDismissed, isDismissed } =
    useDodgeDismissed();
  const [stageFilter, setStageFilter] = useState<string>(DEFAULT_STAGE);
  const [productFilter, setProductFilter] = useState<ProductFilter>(DEFAULT_PRODUCT);
  const [sort, setSort] = useState<"valuation" | "miles" | "bid">(DEFAULT_SORT);
  const [boardTab, setBoardTab] = useState<BoardTab>("active");
  const [top10, setTop10] = useState(false);
  const [bid30, setBid30] = useState(false);

  const activeSource = useMemo(
    () => data.projects.filter((p) => !isDismissed(p.id)),
    [data.projects, dismissedIds, isDismissed],
  );

  const removedSource = useMemo(
    () => data.projects.filter((p) => isDismissed(p.id)),
    [data.projects, dismissedIds, isDismissed],
  );

  const boardSource = boardTab === "active" ? activeSource : removedSource;

  const projects = useMemo(() => {
    let list = [...boardSource];
    if (productFilter === "pemb") {
      list = list.filter((p) => isPembFocused(p));
    } else if (productFilter !== "all") {
      list = list.filter((p) => p.productLine === productFilter);
    }
    if (stageFilter !== "all") {
      list = list.filter((p) => p.stage === stageFilter);
    }
    if (bid30) {
      list = list.filter((p) => isBidWithinDays(p.bidDate, 30));
    }
    list.sort((a, b) => {
      if (sort === "miles") return a.milesFromPlant - b.milesFromPlant;
      if (sort === "bid") {
        const ad = a.bidDate ?? "9999";
        const bd = b.bidDate ?? "9999";
        return ad.localeCompare(bd);
      }
      return b.valuation - a.valuation;
    });
    if (top10 && boardTab === "active") {
      const byValue = [...list].sort((a, b) => b.valuation - a.valuation);
      list = byValue.slice(0, 10);
    }
    return list;
  }, [boardSource, stageFilter, productFilter, sort, bid30, top10, boardTab]);

  /** KPIs always reflect Active board only (honest VP summary). */
  const activeKpis = useMemo(() => {
    const pemb = activeSource.filter((p) => isPembFocused(p));
    const pembVal = pemb.reduce((s, p) => s + p.valuation, 0);
    const totalVal = activeSource.reduce((s, p) => s + p.valuation, 0);
    const bidding = activeSource.filter((p) => p.stage === "bidding").length;
    const avgMiles =
      activeSource.length > 0
        ? Math.round(
            activeSource.reduce((s, p) => s + p.milesFromPlant, 0) / activeSource.length,
          )
        : 0;
    return {
      count: activeSource.length,
      totalValuation: totalVal,
      biddingCount: bidding,
      pembShare: totalVal > 0 ? pembVal / totalVal : 0,
      avgMiles,
    };
  }, [activeSource]);

  const isLive = data.status.mode === "live";
  const liveFailed = data.status.configured && data.status.mode === "demo";
  const removedCount = removedSource.length;
  const activeCount = activeSource.length;
  const allDismissed = data.projects.length > 0 && activeCount === 0;
  const filtersActive =
    stageFilter !== DEFAULT_STAGE ||
    sort !== DEFAULT_SORT ||
    productFilter !== DEFAULT_PRODUCT ||
    top10 ||
    bid30;

  function clearFilters() {
    setStageFilter(DEFAULT_STAGE);
    setSort(DEFAULT_SORT);
    setProductFilter(DEFAULT_PRODUCT);
    setTop10(false);
    setBid30(false);
  }

  function printActiveList() {
    setBoardTab("active");
    window.setTimeout(() => window.print(), 50);
  }

  function handleResetDismissed() {
    if (
      window.confirm(
        `Reset dismissed jobs?\n\nThis clears ${DODGE_DISMISS_STORAGE_KEY} and restores every hidden job to Active.`,
      )
    ) {
      resetDismissed();
      setBoardTab("active");
    }
  }

  function handleDismiss(id: string, title: string) {
    if (
      window.confirm(
        `Remove “${title}” from the active board?\n\nIt will move to Removed and can be restored anytime.`,
      )
    ) {
      dismiss(id);
    }
  }

  const emptyKind: "removed" | "all-dismissed" | "filters" | "none" | null =
    projects.length > 0
      ? null
      : boardTab === "removed"
        ? "removed"
        : allDismissed
          ? "all-dismissed"
          : data.projects.length === 0
            ? "none"
            : "filters";

  return (
    <div className="space-y-4 print:space-y-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[var(--color-primary)]">
            <GanttChartSquare className="size-3.5" />
            Territory pipeline
          </div>
          <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Opportunities
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-fg-muted)]">
            Territory pursuit board for the Portland, TN ~600-mile PEMB / CSI Division 13 footprint —
            industrial, warehouse, manufacturing, ag, and self-storage shells.{" "}
            <strong className="font-medium text-[var(--color-fg)]">
              Not a live Dodge Construction Network feed. Dismiss, restore, and print the Active list.
            </strong>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isLive ? "success" : "secondary"} className="gap-1">
            <Radio className="size-3" />
            {isLive ? "Dodge live" : "Territory pipeline"}
          </Badge>
          <Button type="button" size="sm" variant="secondary" onClick={printActiveList} className="print:hidden">
            <Printer className="size-3.5" />
            Print Active
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => void refresh()} disabled={loading}>
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Refresh
          </Button>
        </div>
      </div>

      <Card className={cn("print:hidden", liveFailed && "border-[var(--color-warn)]/40")}>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] text-[var(--color-primary)]">
              <GanttChartSquare className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {isLive ? "Live Dodge feed connected" : "SE territory opportunity board"}
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
                {isLive
                  ? data.status.message
                  : "Curated industrial / warehouse / PEMB opportunities in the Ascent footprint. Not a live Dodge Construction Network feed. Use Active / Removed to keep VP review focused."}
              </p>
              {loading && (
                <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-[var(--color-fg-subtle)]">
                  <Loader2 className="size-3 animate-spin" />
                  Updating pipeline…
                </p>
              )}
            </div>
          </div>
          <Badge variant={isLive ? "success" : "secondary"} className="h-7 shrink-0 gap-1 self-start">
            <Radio className="size-3" />
            {isLive ? "Live" : "Territory pipeline"}
          </Badge>
        </CardContent>
      </Card>

      {error && data.projects.length === 0 && (
        <p className="rounded-[var(--radius-sm)] bg-[var(--color-warn-soft)] px-3 py-2 text-xs text-[var(--color-warn)]">
          {error}
        </p>
      )}
      {error && data.projects.length > 0 && (
        <p className="text-[11px] text-[var(--color-fg-subtle)]">
          Route fetch note: {error}. Showing the territory sample board.
        </p>
      )}

      {/* Active-only KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 print:grid-cols-5">
        <Stat label="Active projects" value={String(activeKpis.count)} />
        <Stat label="Active pipeline $" value={formatCurrency(activeKpis.totalValuation, true)} />
        <Stat label="Out for bid (active)" value={String(activeKpis.biddingCount)} accent />
        <Stat label="PEMB / Div 13 share" value={`${(activeKpis.pembShare * 100).toFixed(0)}%`} />
        <Stat label="Avg miles (active)" value={`${activeKpis.avgMiles} mi`} />
      </div>
      <p className="text-[11px] text-[var(--color-fg-subtle)]">
        {removedCount > 0 ? (
          <>
            {removedCount} job{removedCount === 1 ? "" : "s"} on{" "}
            <strong className="font-medium">Removed</strong> — KPIs above count Active only.
          </>
        ) : (
          <>Removed: 0 · KPIs count Active jobs only (filters do not change the KPI strip).</>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <span className="text-xs font-medium text-[var(--color-fg-subtle)]">Product</span>
        {(
          [
            ["all", "All lines"],
            ["pemb", "PEMB focus"],
            ["PEMB", "PEMB only"],
            ["Component", "Component"],
            ["Other", "Other"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={productFilter === id ? "default" : "secondary"}
            className="h-8 rounded-full"
            onClick={() => setProductFilter(id)}
          >
            {label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={top10 ? "default" : "secondary"}
          className="h-8 rounded-full"
          onClick={() => setTop10((v) => !v)}
        >
          Top 10
        </Button>
        <Button
          type="button"
          size="sm"
          variant={bid30 ? "default" : "secondary"}
          className="h-8 rounded-full"
          onClick={() => setBid30((v) => !v)}
        >
          Bid next 30d
        </Button>
        {filtersActive && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 rounded-full"
            onClick={clearFilters}
          >
            <FilterX className="size-3.5" />
            Clear filters
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <span className="text-xs font-medium text-[var(--color-fg-subtle)]">Stage</span>
        {["all", "bidding", "design", "planning", "preconstruction", "construction"].map((s) => (
          <Button
            key={s}
            type="button"
            size="sm"
            variant={stageFilter === s ? "default" : "secondary"}
            className="h-8 rounded-full capitalize"
            onClick={() => setStageFilter(s)}
          >
            {s === "all" ? "All" : STAGE_LABEL[s as DodgeProjectStage] ?? s}
          </Button>
        ))}
        <span className="ml-2 text-xs font-medium text-[var(--color-fg-subtle)]">Sort</span>
        {(
          [
            ["valuation", "Value"],
            ["miles", "Distance"],
            ["bid", "Bid date"],
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

      <p className="text-[11px] text-[var(--color-fg-muted)] print:hidden">
        <strong className="font-medium text-[var(--color-fg)]">PEMB focus</strong> includes{" "}
        {PEMB_BUILDING_TYPES.map((t) => BUILDING_LABEL[t]).join(", ")} plus projects tagged PEMB / Div 13.
        Default view is All lines so the Active board stays populated.
      </p>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-4" />
                Opportunities
              </CardTitle>
              <CardDescription>
                {boardTab === "active"
                  ? `${projects.length} shown${top10 ? " · Top 10 by value" : ""}${bid30 ? " · bid ≤30d" : ""} · ${activeCount} active · min ${formatCurrency(data.filters.minValuation, true)}`
                  : `${projects.length} shown · Removed board · restore anytime`}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] p-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant={boardTab === "active" ? "default" : "ghost"}
                  className="h-8 rounded-full px-3"
                  onClick={() => setBoardTab("active")}
                >
                  Active ({activeCount})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={boardTab === "removed" ? "default" : "ghost"}
                  className="h-8 rounded-full px-3"
                  onClick={() => setBoardTab("removed")}
                >
                  Removed ({removedCount})
                </Button>
              </div>
              {boardTab === "removed" && removedCount > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 gap-1.5"
                  onClick={() => {
                    if (window.confirm(`Restore all ${removedCount} removed jobs to Active?`)) {
                      restoreAll();
                      setBoardTab("active");
                    }
                  }}
                >
                  <RotateCcw className="size-3.5" />
                  Restore all
                </Button>
              )}
              {dismissedCount > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5"
                  title={`Clear ${DODGE_DISMISS_STORAGE_KEY}`}
                  onClick={handleResetDismissed}
                >
                  <RotateCcw className="size-3.5" />
                  Reset dismissed jobs
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          <table className="w-full border-collapse text-sm md:min-w-[720px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-fg-subtle)]">
                <th className="pb-2 pr-3 font-medium">Project</th>
                <th className="pb-2 pr-3 font-medium">Stage</th>
                <th className="hidden pb-2 pr-3 font-medium md:table-cell">Type</th>
                <th className="hidden pb-2 pr-3 font-medium md:table-cell">Product</th>
                <th className="pb-2 pr-3 text-right font-medium">Value</th>
                <th className="hidden pb-2 pr-3 text-right font-medium md:table-cell">Miles</th>
                <th className="hidden pb-2 pr-3 font-medium md:table-cell">Bid date</th>
                <th className="hidden pb-2 pr-3 font-medium md:table-cell">Owner / GC</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <ProjectRow
                  key={p.id}
                  project={p}
                  mode={boardTab}
                  muted={boardTab === "removed"}
                  onDismiss={() => handleDismiss(p.id, p.title)}
                  onRestore={() => restore(p.id)}
                />
              ))}
              {emptyKind && (
                <tr>
                  <td colSpan={8} className="py-10">
                    <EmptyBoard
                      kind={emptyKind}
                      onClearFilters={clearFilters}
                      onRestoreAll={() => {
                        restoreAll();
                        setBoardTab("active");
                      }}
                      onResetDismissed={handleResetDismissed}
                      onShowRemoved={() => setBoardTab("removed")}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {data.companies.length > 0 && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>Related firms</CardTitle>
            <CardDescription>Architects, GCs, and owners from the pipeline sample</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 pt-0">
            {data.companies.map((c) => (
              <div
                key={c.id}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2.5"
              >
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-[var(--color-fg-muted)]">{c.role}</p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-[var(--color-fg-subtle)]">
                  <MapPin className="size-3" />
                  {c.city}, {c.state}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="border-t border-[var(--color-border)] pt-6 print:hidden">
        <MarketNewsSection />
      </div>

      <p className="text-[11px] text-[var(--color-fg-subtle)] print:hidden">
        {data.status.mode === "demo"
          ? `Territory sample board (${data.projects.length} projects) for process review — not licensed Dodge content.`
          : `Live fetch ${new Date(data.fetchedAt).toLocaleString()}.`}{" "}
        Dismissed ids stored locally as{" "}
        <code className="rounded bg-[var(--color-bg-subtle)] px-1">{DODGE_DISMISS_STORAGE_KEY}</code>
        {dismissedCount === 0 && (
          <>
            .{" "}
            <button
              type="button"
              className="underline decoration-dotted underline-offset-2 hover:text-[var(--color-fg-muted)]"
              onClick={handleResetDismissed}
            >
              Reset dismissed jobs
            </button>
          </>
        )}
        .
      </p>
    </div>
  );
}

function EmptyBoard({
  kind,
  onClearFilters,
  onRestoreAll,
  onResetDismissed,
  onShowRemoved,
}: {
  kind: "removed" | "all-dismissed" | "filters" | "none";
  onClearFilters: () => void;
  onRestoreAll: () => void;
  onResetDismissed: () => void;
  onShowRemoved: () => void;
}) {
  if (kind === "removed") {
    return (
      <div className="mx-auto max-w-md text-center text-sm text-[var(--color-fg-muted)]">
        No removed jobs. Dismiss stale opportunities from{" "}
        <strong className="font-medium text-[var(--color-fg)]">Active</strong> to keep the board clean.
      </div>
    );
  }
  if (kind === "all-dismissed") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium text-[var(--color-fg)]">All jobs moved to Removed</p>
        <p className="text-xs text-[var(--color-fg-muted)]">
          The Active board is empty because every opportunity was dismissed. Restore them — nothing was
          deleted from the demo dataset.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" size="sm" onClick={onRestoreAll}>
            <ArchiveRestore className="size-3.5" />
            Restore all
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={onShowRemoved}>
            View Removed
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onResetDismissed}>
            <RotateCcw className="size-3.5" />
            Reset dismissed jobs
          </Button>
        </div>
      </div>
    );
  }
  if (kind === "none") {
    return (
      <div className="mx-auto max-w-md text-center text-sm text-[var(--color-fg-muted)]">
        No pipeline projects returned. Refresh the tab — demo data should always appear offline.
      </div>
    );
  }
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
      <p className="text-sm font-medium text-[var(--color-fg)]">No projects match filters</p>
      <p className="text-xs text-[var(--color-fg-muted)]">
        Active jobs exist, but the current product / stage filters hide them.
      </p>
      <Button type="button" size="sm" onClick={onClearFilters}>
        <FilterX className="size-3.5" />
        Clear filters
      </Button>
    </div>
  );
}

function ProjectRow({
  project: p,
  mode,
  muted,
  onDismiss,
  onRestore,
}: {
  project: DodgeProject;
  mode: BoardTab;
  muted?: boolean;
  onDismiss: () => void;
  onRestore: () => void;
}) {
  return (
    <tr
      className={cn(
        "border-b border-[var(--color-border)]/70 align-top transition-colors hover:bg-[var(--color-bg-subtle)]/50",
        muted && "opacity-75",
      )}
      title={p.notes}
    >
      <td className="py-3 pr-3">
        <p className="font-medium leading-snug">{p.title}</p>
        <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
          {p.city}, {p.state}
        </p>
        {p.trades.length > 0 && (
          <p className="mt-1 text-[11px] text-[var(--color-fg-subtle)]">{p.trades.slice(0, 4).join(" · ")}</p>
        )}
      </td>
      <td className="py-3 pr-3">
        <div className="flex flex-col items-start gap-2">
          <Badge variant={STAGE_VARIANT[p.stage]}>{STAGE_LABEL[p.stage]}</Badge>
          {mode === "active" ? (
            <Button
              type="button"
              variant="secondary"
              className="!h-11 !min-h-11 gap-1.5 px-3 text-xs sm:!h-9 sm:!min-h-9"
              title="Remove from active board"
              onClick={onDismiss}
            >
              <Trash2 className="size-3.5" />
              Remove
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              className="!h-11 !min-h-11 gap-1.5 px-3 text-xs sm:!h-9 sm:!min-h-9"
              title="Restore to active board"
              onClick={onRestore}
            >
              <ArchiveRestore className="size-3.5" />
              Restore
            </Button>
          )}
        </div>
      </td>
      <td className="hidden py-3 pr-3 text-xs text-[var(--color-fg-muted)] md:table-cell">
        {BUILDING_LABEL[p.buildingType]}
      </td>
      <td className="hidden py-3 pr-3 md:table-cell">
        <Badge variant={p.productLine === "PEMB" ? "default" : "secondary"}>
          {PRODUCT_LINE_LABEL[p.productLine]}
        </Badge>
      </td>
      <td className="py-3 pr-3 text-right tabular font-medium">{formatCurrency(p.valuation, true)}</td>
      <td className="hidden py-3 pr-3 text-right tabular text-[var(--color-fg-muted)] md:table-cell">
        {p.milesFromPlant}
      </td>
      <td className="hidden py-3 pr-3 text-xs tabular text-[var(--color-fg-muted)] md:table-cell">
        {p.bidDate ?? "—"}
      </td>
      <td className="hidden py-3 pr-3 text-xs text-[var(--color-fg-muted)] md:table-cell">
        <p>{p.owner ?? "—"}</p>
        {p.gc && <p className="text-[var(--color-fg-subtle)]">GC: {p.gc}</p>}
      </td>
    </tr>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className={cn(accent && "border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]/35")}>
      <CardContent className="p-4">
        <p className="text-xs text-[var(--color-fg-subtle)]">{label}</p>
        <p className="mt-1 font-display text-xl font-semibold tabular tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
