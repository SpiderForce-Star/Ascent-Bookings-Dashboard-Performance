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
import { useDodgeDismissed } from "@/lib/dodge-dismiss-store";
import { MarketNewsSection } from "@/components/dashboard/market-news-section";
import { formatCurrency, cn } from "@/lib/utils";
import {
  ArchiveRestore,
  Building2,
  ExternalLink,
  KeyRound,
  Loader2,
  MapPin,
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

export function DodgePanel() {
  const { data, loading, error, refresh } = useDodgeProjects(true);
  const { dismissedIds, dismiss, restore, restoreAll, isDismissed } = useDodgeDismissed();
  const [stageFilter, setStageFilter] = useState<string>("all");
  /** Default toward industrial / warehouse / mfg / self-storage / ag PEMB work */
  const [productFilter, setProductFilter] = useState<ProductFilter>("pemb");
  const [sort, setSort] = useState<"valuation" | "miles" | "bid">("valuation");
  const [boardTab, setBoardTab] = useState<BoardTab>("active");

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
    list.sort((a, b) => {
      if (sort === "miles") return a.milesFromPlant - b.milesFromPlant;
      if (sort === "bid") {
        const ad = a.bidDate ?? "9999";
        const bd = b.bidDate ?? "9999";
        return ad.localeCompare(bd);
      }
      return b.valuation - a.valuation;
    });
    return list;
  }, [boardSource, stageFilter, productFilter, sort]);

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
      filteredCount: boardTab === "active" ? projects.length : projects.length,
      filteredValue:
        boardTab === "active"
          ? projects.reduce((s, p) => s + p.valuation, 0)
          : projects.reduce((s, p) => s + p.valuation, 0),
      filteredBidding:
        boardTab === "active"
          ? projects.filter((p) => p.stage === "bidding").length
          : projects.filter((p) => p.stage === "bidding").length,
    };
  }, [activeSource, boardTab, projects]);

  const isLive = data.status.mode === "live";
  const removedCount = removedSource.length;
  const activeCount = activeSource.length;

  function handleDismiss(id: string, title: string) {
    if (
      window.confirm(
        `Remove “${title}” from the active board?\n\nIt will move to Removed and can be restored anytime. The project is not deleted from Dodge/demo data.`,
      )
    ) {
      dismiss(id);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[var(--color-primary)]">
            <GanttChartSquare className="size-3.5" />
            Dodge Construction Network
          </div>
          <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Project pipeline
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-fg-muted)]">
            CSI Division 13 Special Construction — pre-engineered metal building (PEMB) systems, structural
            steel packages, and industrial / warehouse / ag / self-storage shells in the Portland, TN
            ~600-mile footprint.{" "}
            <strong className="font-medium text-[var(--color-fg)]">
              Dismiss jobs that have gone stale on Dodge so the active board stays actionable. Restore
              anytime from the Removed tab.
            </strong>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isLive ? "success" : "secondary"} className="gap-1">
            <Radio className="size-3" />
            {isLive ? "Dodge live" : "Demo pipeline"}
          </Badge>
          <Button type="button" size="sm" variant="secondary" onClick={() => void refresh()} disabled={loading}>
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Refresh
          </Button>
        </div>
      </div>

      <Card className={cn(!data.status.configured && "border-dashed")}>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] text-[var(--color-primary)]">
              <KeyRound className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {data.status.configured ? "Credentials configured" : "Enterprise credentials required"}
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">{data.status.message}</p>
              <p className="mt-2 text-[11px] text-[var(--color-fg-subtle)]">
                Env: <code className="rounded bg-[var(--color-bg-subtle)] px-1">DODGE_API_BASE_URL</code>{" "}
                <code className="rounded bg-[var(--color-bg-subtle)] px-1">DODGE_CLIENT_ID</code>{" "}
                <code className="rounded bg-[var(--color-bg-subtle)] px-1">DODGE_CLIENT_SECRET</code> or{" "}
                <code className="rounded bg-[var(--color-bg-subtle)] px-1">DODGE_ACCESS_TOKEN</code>
              </p>
            </div>
          </div>
          <a
            href="https://www.construction.com/apis/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 text-xs font-medium hover:bg-[var(--color-bg-subtle)]"
          >
            Request API access
            <ExternalLink className="size-3.5" />
          </a>
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-[var(--radius-sm)] bg-[var(--color-warn-soft)] px-3 py-2 text-xs text-[var(--color-warn)]">
          {error}
        </p>
      )}

      {/* Active-only KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Active projects" value={String(activeKpis.count)} />
        <Stat label="Active pipeline $" value={formatCurrency(activeKpis.totalValuation, true)} />
        <Stat label="Out for bid (active)" value={String(activeKpis.biddingCount)} accent />
        <Stat label="PEMB / Div 13 share" value={`${(activeKpis.pembShare * 100).toFixed(0)}%`} />
        <Stat label="Avg miles (active)" value={`${activeKpis.avgMiles} mi`} />
      </div>
      {removedCount > 0 && (
        <p className="text-[11px] text-[var(--color-fg-subtle)]">
          {removedCount} job{removedCount === 1 ? "" : "s"} hidden on <strong className="font-medium">Removed</strong>{" "}
          — KPIs above reflect Active only.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-[var(--color-fg-subtle)]">Product</span>
        {(
          [
            ["pemb", "PEMB focus"],
            ["all", "All lines"],
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
      </div>

      <div className="flex flex-wrap items-center gap-2">
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

      <p className="text-[11px] text-[var(--color-fg-muted)]">
        Default <strong className="font-medium text-[var(--color-fg)]">PEMB focus</strong> includes{" "}
        {PEMB_BUILDING_TYPES.map((t) => BUILDING_LABEL[t]).join(", ")} plus projects tagged PEMB / Div 13.
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
                  ? `${projects.length} shown · Active board · min ${formatCurrency(data.filters.minValuation, true)}`
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
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          <table className="w-full min-w-[940px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-fg-subtle)]">
                <th className="pb-2 pr-3 font-medium">Project</th>
                <th className="pb-2 pr-3 font-medium">Stage</th>
                <th className="pb-2 pr-3 font-medium">Type</th>
                <th className="pb-2 pr-3 font-medium">Product</th>
                <th className="pb-2 pr-3 text-right font-medium">Value</th>
                <th className="pb-2 pr-3 text-right font-medium">Miles</th>
                <th className="pb-2 pr-3 font-medium">Bid date</th>
                <th className="pb-2 pr-3 font-medium">Owner / GC</th>
                <th className="pb-2 font-medium text-right">Board</th>
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
              {projects.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm text-[var(--color-fg-muted)]">
                    {boardTab === "removed" ? (
                      <>
                        No removed jobs. Dismiss stale opportunities from{" "}
                        <strong className="font-medium text-[var(--color-fg)]">Active</strong> to keep the
                        board clean.
                      </>
                    ) : (
                      "No projects match the current filters on the Active board."
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {data.companies.length > 0 && (
        <Card>
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

      <div className="border-t border-[var(--color-border)] pt-6">
        <MarketNewsSection />
      </div>

      <p className="text-[11px] text-[var(--color-fg-subtle)] print:hidden">
        Dodge Construction Network API · REST + OAuth 2.0 · Projects, companies/contacts, and documents.{" "}
        {data.status.mode === "demo"
          ? `Demo data is synthetic (${data.projects.length} projects) — not licensed Dodge content.`
          : `Live fetch ${new Date(data.fetchedAt).toLocaleString()}.`}{" "}
        Dismissed ids stored locally as{" "}
        <code className="rounded bg-[var(--color-bg-subtle)] px-1">ascent-dodge-dismissed-v1</code>.
      </p>
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
          {p.source === "demo" && (
            <span className="ml-1.5 text-[var(--color-fg-subtle)]">· demo</span>
          )}
        </p>
        {p.trades.length > 0 && (
          <p className="mt-1 text-[11px] text-[var(--color-fg-subtle)]">{p.trades.slice(0, 4).join(" · ")}</p>
        )}
      </td>
      <td className="py-3 pr-3">
        <Badge variant={STAGE_VARIANT[p.stage]}>{STAGE_LABEL[p.stage]}</Badge>
      </td>
      <td className="py-3 pr-3 text-xs text-[var(--color-fg-muted)]">{BUILDING_LABEL[p.buildingType]}</td>
      <td className="py-3 pr-3">
        <Badge variant={p.productLine === "PEMB" ? "default" : "secondary"}>
          {PRODUCT_LINE_LABEL[p.productLine]}
        </Badge>
      </td>
      <td className="py-3 pr-3 text-right tabular font-medium">{formatCurrency(p.valuation, true)}</td>
      <td className="py-3 pr-3 text-right tabular text-[var(--color-fg-muted)]">{p.milesFromPlant}</td>
      <td className="py-3 pr-3 text-xs tabular text-[var(--color-fg-muted)]">{p.bidDate ?? "—"}</td>
      <td className="py-3 pr-3 text-xs text-[var(--color-fg-muted)]">
        <p>{p.owner ?? "—"}</p>
        {p.gc && <p className="text-[var(--color-fg-subtle)]">GC: {p.gc}</p>}
      </td>
      <td className="py-3 text-right">
        {mode === "active" ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 gap-1 text-xs"
            title="Remove from active board"
            onClick={onDismiss}
          >
            <Trash2 className="size-3.5" />
            <span className="hidden sm:inline">Remove</span>
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 gap-1 text-xs"
            title="Restore to active board"
            onClick={onRestore}
          >
            <ArchiveRestore className="size-3.5" />
            <span className="hidden sm:inline">Restore</span>
          </Button>
        )}
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
