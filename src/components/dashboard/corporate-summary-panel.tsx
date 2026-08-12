import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PRESETS,
  computeMetrics,
  monthlyRecords,
} from "@/data/bookings";
import {
  ALERT_THRESHOLD,
  ALERT_THRESHOLD_CRITICAL,
  BASELINE,
  SAMPLE_STEEL_ROWS,
  applyLiveFeedBias,
  evaluateSteelAlerts,
  regenerateForecast,
  summaryMetrics,
} from "@/data/steel-forecast";
import { useConstructionFeeds } from "@/hooks/use-construction-feeds";
import { useDodgeProjects } from "@/hooks/use-dodge-projects";
import { useDodgeDismissed } from "@/lib/dodge-dismiss-store";
import { useIndustryBrief } from "@/hooks/use-industry-brief";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import {
  BarChart3,
  ExternalLink,
  Flame,
  GanttChartSquare,
  LayoutDashboard,
  Radio,
} from "lucide-react";

export type SummaryNavTarget = "performance" | "feeds" | "dodge" | "steel";

const YTD = PRESETS.find((p) => p.id === "ytd-2026")!.range!;

export function CorporateSummaryPanel({ onNavigate }: { onNavigate: (tab: SummaryNavTarget) => void }) {
  const ytd = useMemo(() => computeMetrics(YTD), []);
  const july = useMemo(
    () => monthlyRecords.find((r) => r.year === 2026 && r.monthIndex === 6) ?? null,
    [],
  );
  const { data: feeds } = useConstructionFeeds(true);
  const { data: dodge } = useDodgeProjects(true);
  const { isDismissed } = useDodgeDismissed();
  const { data: brief, loading: briefLoading } = useIndustryBrief(true);

  const asOf = new Date().toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const steel = useMemo(() => {
    const risks = applyLiveFeedBias(BASELINE, feeds.signal.compositeIndex, feeds.live);
    const path = regenerateForecast(SAMPLE_STEEL_ROWS, risks, true);
    return {
      overall: summaryMetrics(path, "Overall"),
      tnfab: summaryMetrics(path, "TNFAB"),
      alerts: evaluateSteelAlerts(path, risks).filter((a) => a.metric === "base_vs_adjusted"),
    };
  }, [feeds.live, feeds.signal.compositeIndex]);

  const pursuit = useMemo(() => {
    const active = dodge.projects.filter((p) => !isDismissed(p.id));
    const val = active.reduce((s, p) => s + p.valuation, 0);
    const bidding = active.filter((p) => p.stage === "bidding").length;
    return { count: active.length, val, bidding };
  }, [dodge.projects, isDismissed]);

  const pulse = feeds.series.filter((s) => s.relevance === "high").slice(0, 3);
  const feedStatus =
    feeds.status === "live" ? "Live" : feeds.status === "partial" ? "Partial" : "Cached";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[var(--color-primary)]">
            <LayoutDashboard className="size-3.5" />
            Executive brief
          </div>
          <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Corporate summary
          </h2>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            Ascent Buildings LLC · Portland, TN · PEMB / CSI Div 13
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Bookings through July 2026</Badge>
          <Badge variant={feeds.live ? "success" : "outline"} className="gap-1">
            <Radio className="size-3" />
            Feeds {feeds.live ? "live" : "cached"}
          </Badge>
          <span className="text-[11px] tabular text-[var(--color-fg-subtle)]">As of {asOf}</span>
        </div>
      </div>

      {/* A. Scorecard */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">Ascent scorecard</CardTitle>
              <CardDescription>YTD 2026 actuals through July — embedded, offline-ready</CardDescription>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={() => onNavigate("performance")}>
              <BarChart3 className="size-3.5" />
              Open Performance
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Sales" value={formatCurrency(ytd.revenue, true)} />
            <Kpi label="GM $" value={formatCurrency(ytd.gm, true)} />
            <Kpi label="GM %" value={`${(ytd.gmPct * 100).toFixed(1)}%`} />
            <Kpi label="YoY" value={formatPercent(ytd.growth)} accent={ytd.growth >= 0} />
          </div>
          {july && (
            <p className="text-xs text-[var(--color-fg-muted)]">
              July 2026: {formatCurrency(july.sales, true)} sales · {formatCurrency(july.gm, true)} GM (
              {(july.gmPct * 100).toFixed(1)}%).
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* B. Market pulse */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">Market pulse</CardTitle>
                <CardDescription>FRED / BLS public series</CardDescription>
              </div>
              <Badge variant={feeds.live ? "success" : feeds.status === "partial" ? "warn" : "secondary"}>
                {feedStatus}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {pulse.map((s) => (
              <div key={s.id} className="flex items-start justify-between gap-2">
                <p className="min-w-0 text-xs text-[var(--color-fg-muted)]">{s.label}</p>
                <p className="shrink-0 text-xs font-semibold tabular">
                  {s.momPct == null ? "—" : `${s.momPct >= 0 ? "+" : ""}${s.momPct.toFixed(2)}% MoM`}
                </p>
              </div>
            ))}
            <p className="text-[11px] text-[var(--color-fg-subtle)]">
              Composite {feeds.signal.compositeIndex.toFixed(0)}
              {feeds.signal.narrative ? ` · ${feeds.signal.narrative}` : ""}
            </p>
            <Button type="button" size="sm" variant="secondary" onClick={() => onNavigate("feeds")}>
              <Radio className="size-3.5" />
              Open Market feeds
            </Button>
          </CardContent>
        </Card>

        {/* C. Steel watch */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">Steel watch</CardTitle>
                <CardDescription>
                  ±{(ALERT_THRESHOLD * 100).toFixed(0)}% watch · ±
                  {(ALERT_THRESHOLD_CRITICAL * 100).toFixed(0)}% critical
                </CardDescription>
              </div>
              <Flame className="size-4 text-[var(--color-primary)]" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="grid grid-cols-2 gap-2">
              <Mini
                label="Overall uplift"
                value={
                  steel.overall
                    ? `${steel.overall.avg_uplift >= 0 ? "+" : ""}${steel.overall.avg_uplift.toFixed(2)}%`
                    : "—"
                }
              />
              <Mini
                label="TNFAB uplift"
                value={
                  steel.tnfab
                    ? `${steel.tnfab.avg_uplift >= 0 ? "+" : ""}${steel.tnfab.avg_uplift.toFixed(2)}%`
                    : "—"
                }
              />
            </div>
            {steel.alerts.length === 0 ? (
              <p className="text-xs text-[var(--color-fg-muted)]">No ≥3% Base vs Adjusted breaches.</p>
            ) : (
              <ul className="space-y-1">
                {steel.alerts.slice(0, 4).map((a) => (
                  <li
                    key={a.id}
                    className={cn(
                      "rounded-[var(--radius-sm)] px-2 py-1 text-[11px]",
                      a.severity === "critical"
                        ? "bg-[var(--color-danger-soft)] text-[var(--color-danger)]"
                        : "bg-[var(--color-warn-soft)] text-[var(--color-warn)]",
                      (a.category === "Overall" || a.category === "TNFAB") && "font-semibold",
                    )}
                  >
                    {a.category} {(a.value * 100).toFixed(1)}% · {a.severity}
                  </li>
                ))}
              </ul>
            )}
            <Button type="button" size="sm" variant="secondary" onClick={() => onNavigate("steel")}>
              <Flame className="size-3.5" />
              Open Steel cost
            </Button>
          </CardContent>
        </Card>

        {/* D. Pursuit */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">Pursuit snapshot</CardTitle>
                <CardDescription>Territory process board — not licensed live Dodge</CardDescription>
              </div>
              <GanttChartSquare className="size-4 text-[var(--color-primary)]" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="grid grid-cols-3 gap-2">
              <Mini label="Active" value={String(pursuit.count)} />
              <Mini label="Pipeline" value={formatCurrency(pursuit.val, true)} />
              <Mini label="Out for bid" value={String(pursuit.bidding)} />
            </div>
            <p className="text-[11px] text-[var(--color-fg-subtle)]">
              Sample / process board for the Portland, TN ~600-mile PEMB footprint.
            </p>
            <Button type="button" size="sm" variant="secondary" onClick={() => onNavigate("dodge")}>
              <GanttChartSquare className="size-3.5" />
              Open pipeline
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* E. Industry desk */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Industry desk</CardTitle>
          <CardDescription>
            {briefLoading ? "Loading public headlines…" : brief.message} External headlines are
            third-party · not investment advice.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {brief.headlines.length > 0 && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {brief.headlines.slice(0, 8).map((h) => (
                <a
                  key={h.id}
                  href={h.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2.5 hover:bg-[var(--color-bg-subtle)]"
                >
                  <p className="text-sm font-medium leading-snug">{h.title}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--color-fg-subtle)]">
                    {h.source}
                    <span>·</span>
                    <span className="tabular">
                      {new Date(h.publishedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <ExternalLink className="size-3" />
                  </p>
                </a>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-3 border-t border-[var(--color-border)] pt-3">
            {brief.associations.map((a) => (
              <a
                key={a.url}
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary)] hover:underline"
              >
                {a.name}
                <ExternalLink className="size-3" />
              </a>
            ))}
          </div>
          <p className="text-[11px] text-[var(--color-fg-subtle)]">
            MBMA statistics portal is member-only; not connected to this dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2.5",
        accent && "border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)]/35",
      )}
    >
      <p className="text-[11px] uppercase tracking-wide text-[var(--color-fg-subtle)]">{label}</p>
      <p className="mt-0.5 font-display text-xl font-semibold tabular">{value}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-[var(--color-fg-subtle)]">{label}</p>
      <p className="text-sm font-semibold tabular">{value}</p>
    </div>
  );
}
