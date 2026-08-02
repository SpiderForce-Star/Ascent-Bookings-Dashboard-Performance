import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BUILDING_LABEL,
  STAGE_LABEL,
  type DodgeProject,
  type DodgeProjectStage,
} from "@/data/dodge";
import { useDodgeProjects } from "@/hooks/use-dodge-projects";
import { formatCurrency, cn } from "@/lib/utils";
import {
  Building2,
  ExternalLink,
  KeyRound,
  Loader2,
  MapPin,
  Radio,
  RefreshCw,
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

export function DodgePanel() {
  const { data, loading, error, refresh } = useDodgeProjects(true);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [sort, setSort] = useState<"valuation" | "miles" | "bid">("valuation");

  const projects = useMemo(() => {
    let list = [...data.projects];
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
  }, [data.projects, stageFilter, sort]);

  const isLive = data.status.mode === "live";

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
            Commercial construction projects in the Portland, TN ~600-mile footprint. Live mode uses the{" "}
            <a
              href="https://www.construction.com/apis/"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
            >
              Dodge REST API
            </a>{" "}
            (OAuth 2.0). Without credentials, a realistic demo pipeline is shown for exec review.
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

      {/* Connection status */}
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

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Projects" value={String(data.summary.projectCount)} />
        <Stat label="Pipeline value" value={formatCurrency(data.summary.totalValuation, true)} />
        <Stat label="Out for bid" value={String(data.summary.biddingCount)} accent />
        <Stat label="Avg miles from plant" value={`${data.summary.avgMiles} mi`} />
      </div>

      {/* Filters */}
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

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-4" />
            Opportunities
          </CardTitle>
          <CardDescription>
            {projects.length} projects · states in Ascent territory · min{" "}
            {formatCurrency(data.filters.minValuation, true)}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          <table className="w-full min-w-[800px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-fg-subtle)]">
                <th className="pb-2 pr-3 font-medium">Project</th>
                <th className="pb-2 pr-3 font-medium">Stage</th>
                <th className="pb-2 pr-3 font-medium">Type</th>
                <th className="pb-2 pr-3 text-right font-medium">Value</th>
                <th className="pb-2 pr-3 text-right font-medium">Miles</th>
                <th className="pb-2 pr-3 font-medium">Bid date</th>
                <th className="pb-2 font-medium">Owner / GC</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <ProjectRow key={p.id} project={p} />
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-[var(--color-fg-muted)]">
                    No projects match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Companies */}
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

      <p className="text-[11px] text-[var(--color-fg-subtle)]">
        Dodge Construction Network API · REST + OAuth 2.0 · Projects, companies/contacts, and documents.{" "}
        {data.status.mode === "demo"
          ? "Demo data is synthetic for product review — not licensed Dodge content."
          : `Live fetch ${new Date(data.fetchedAt).toLocaleString()}.`}
      </p>
    </div>
  );
}

function ProjectRow({ project: p }: { project: DodgeProject }) {
  return (
    <tr
      className="border-b border-[var(--color-border)]/70 align-top transition-colors hover:bg-[var(--color-bg-subtle)]/50"
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
      <td className="py-3 pr-3 text-right tabular font-medium">{formatCurrency(p.valuation, true)}</td>
      <td className="py-3 pr-3 text-right tabular text-[var(--color-fg-muted)]">{p.milesFromPlant}</td>
      <td className="py-3 pr-3 text-xs tabular text-[var(--color-fg-muted)]">{p.bidDate ?? "—"}</td>
      <td className="py-3 text-xs text-[var(--color-fg-muted)]">
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
