import { useMemo, useState } from "react";
import {
  PRESETS,
  computeMetrics,
  chartSeries,
  scaledSegments,
  MONTHS,
  type DatePreset,
  type DateRange,
} from "@/data/bookings";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DateFilters } from "./date-filters";
import { KpiCards, MetricBadge } from "./kpi-cards";
import { TrendCharts } from "./trend-charts";
import { BreakdownTable } from "./breakdown-table";
import { ForecastPanel } from "./forecast-panel";
import { TerritoryPanel } from "./territory-panel";
import { LiveFeedsPanel } from "./live-feeds-panel";
import { DodgePanel } from "./dodge-panel";
import { SalesSheetsPanel } from "./sales-sheets-panel";
import { SteelForecastPanel } from "./steel-forecast-panel";
import { BookedShippedStrip, ShipmentsPanel } from "./shipments-panel";
import { MbsdPanel } from "./mbsd-panel";
import { MbsdStrip } from "./mbsd-strip";
import { useConstructionFeeds } from "@/hooks/use-construction-feeds";
import {
  FileSpreadsheet,
  Building2,
  LineChart,
  MapPin,
  BarChart3,
  Radio,
  GanttChartSquare,
  ClipboardList,
  Flame,
  Truck,
  Globe,
} from "lucide-react";
import { MbmaPanel } from "./mbma-panel";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { InstallToDevice } from "@/components/pwa/InstallToDevice";
import type { DashboardMetrics } from "@/data/bookings";

const defaultPreset = PRESETS.find((p) => p.id === "ytd-2026")!;
const defaultRange = defaultPreset.range!;

type TabId =
  | "performance"
  | "mbsd"
  | "shipments"
  | "feeds"
  | "dodge"
  | "forecast"
  | "territory"
  | "mbma"
  | "sales-sheets"
  | "steel";

const TABS: { id: TabId; label: string; icon: typeof BarChart3 }[] = [
  { id: "performance", label: "Performance", icon: BarChart3 },
  { id: "mbsd", label: "MBSD", icon: Building2 },
  { id: "shipments", label: "Shipments", icon: Truck },
  { id: "feeds", label: "Market feeds", icon: Radio },
  { id: "mbma", label: "MBMA", icon: Globe },
  { id: "dodge", label: "Dodge pipeline", icon: GanttChartSquare },
  { id: "forecast", label: "Sales forecast", icon: LineChart },
  { id: "territory", label: "Territory", icon: MapPin },
  { id: "sales-sheets", label: "Sales sheets", icon: ClipboardList },
  { id: "steel", label: "Steel cost", icon: Flame },
];

export function Dashboard({ initialTab = "performance" }: { initialTab?: TabId }) {
  const [preset, setPreset] = useState<DatePreset>("ytd-2026");
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [tab, setTab] = useState<TabId>(initialTab);
  const { data: feeds } = useConstructionFeeds(true);

  const metrics = useMemo(() => computeMetrics(range), [range]);
  const series = useMemo(() => chartSeries(range), [range]);
  const segments = useMemo(() => scaledSegments(metrics), [metrics]);

  const rangeLabel = useMemo(() => {
    const start = `${MONTHS[range.startMonth]} ${range.startYear}`;
    const end = `${MONTHS[range.endMonth]} ${range.endYear}`;
    return start === end ? start : `${start} – ${end}`;
  }, [range]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-dvh bg-[var(--color-bg)]">
        <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="ascent-logo-stage shrink-0">
                <img
                  src="/logo.jpg"
                  alt="Ascent Buildings"
                  className="ascent-logo-spin h-16 w-auto object-contain sm:h-20"
                  width={280}
                  height={80}
                />
              </div>
              <div className="hidden min-w-0 border-l border-[var(--color-border)] pl-3 sm:block">
                <p className="font-display text-sm font-semibold tracking-tight text-[var(--color-fg)]">
                  Bookings performance
                </p>
                <p className="truncate text-xs text-[var(--color-fg-muted)]">
                  Executive dashboard · Portland, TN · PEMB / Div 13
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <MetricBadge metrics={metrics} />
              <Badge
                variant={feeds.live ? "success" : "secondary"}
                className="hidden gap-1 sm:inline-flex"
                title={feeds.signal.narrative}
              >
                <Radio className="size-3" />
                {feeds.live ? "Feeds live" : "Feeds cached"}
                <span className="tabular opacity-80">{feeds.signal.compositeIndex.toFixed(0)}</span>
              </Badge>
              <InstallToDevice />
              <span
                className="hidden items-center gap-1.5 rounded-full bg-[var(--color-bg-subtle)] px-3 py-1.5 text-xs text-[var(--color-fg-muted)] xl:inline-flex"
                title="Bookings through July 2026 · live FRED/BLS · territory opportunity board"
              >
                <FileSpreadsheet className="size-3.5" />
                YTD 2026 · Jul · FRED/BLS · Territory board
              </span>
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <nav
              className="flex gap-1 overflow-x-auto overscroll-x-contain pb-0 [-ms-overflow-style:none] [scrollbar-width:thin]"
              aria-label="Dashboard sections"
            >
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    "relative inline-flex items-center gap-2 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors",
                    tab === id
                      ? "text-[var(--color-primary)]"
                      : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                  {id === "feeds" && feeds.live && (
                    <span className="size-1.5 rounded-full bg-[var(--color-success)]" />
                  )}
                  {tab === id && (
                    <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[var(--color-primary)]" />
                  )}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 sm:py-8">
          {tab === "performance" && (
            <>
              <section className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[var(--color-primary)]">
                    <Building2 className="size-3.5" />
                    Bookings performance
                  </div>
                  <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--color-fg)] sm:text-3xl">
                    {rangeLabel}
                  </h1>
                  <p className="mt-1 max-w-xl text-sm text-[var(--color-fg-muted)]">
                    Booked revenue and margin through July 2026. Live FRED/BLS market pulse, territory
                    focus, steel risk, and a pursuit board for the Portland, TN footprint.
                  </p>
                </div>
                <p className="text-xs text-[var(--color-fg-subtle)] tabular">
                  {metrics.monthCount} month{metrics.monthCount === 1 ? "" : "s"} · live filters
                </p>
              </section>

              <DateFilters
                preset={preset}
                range={range}
                onPresetChange={setPreset}
                onRangeChange={(next) => {
                  const a = next.startYear * 12 + next.startMonth;
                  const b = next.endYear * 12 + next.endMonth;
                  if (a > b) {
                    setRange({
                      startYear: next.endYear,
                      startMonth: next.endMonth,
                      endYear: next.startYear,
                      endMonth: next.startMonth,
                    });
                  } else {
                    setRange(next);
                  }
                }}
              />

              <KpiCards metrics={metrics} />
              <BoardBriefStrip metrics={metrics} feedsLive={feeds.live} composite={feeds.signal.compositeIndex} />
              <MbsdStrip />
              <BookedShippedStrip />
              <TrendCharts data={series} />
              <BreakdownTable rows={segments} monthlyRows={series} />
            </>
          )}

          {tab === "mbsd" && <MbsdPanel />}
          {tab === "shipments" && <ShipmentsPanel />}
          {tab === "feeds" && <LiveFeedsPanel />}
          {tab === "dodge" && <DodgePanel />}
          {tab === "forecast" && <ForecastPanel />}
          {tab === "territory" && <TerritoryPanel />}
          {tab === "mbma" && <MbmaPanel />}
          {tab === "sales-sheets" && <SalesSheetsPanel />}
          {tab === "steel" && <SteelForecastPanel />}

          <footer className="flex flex-col gap-1 border-t border-[var(--color-border)] pt-6 pb-8 text-xs text-[var(--color-fg-subtle)] sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <p>Ascent Buildings LLC · Portland, TN · PEMB / CSI Div 13 · Bookings through July 2026</p>
              <p>Created by Chris Woodmore & Ascent AI program · Release 8-13-2026</p>
            </div>
            <p className="print:hidden">
              FRED + BLS live · Territory opportunity board · Sales & steel forecasts are planning models
            </p>
          </footer>
        </main>
      </div>
    </TooltipProvider>
  );
}

function BoardBriefStrip({
  metrics,
  feedsLive,
  composite,
}: {
  metrics: DashboardMetrics;
  feedsLive: boolean;
  composite: number;
}) {
  const priorGm = metrics.priorMonths.reduce((s, r) => s + r.gm, 0);
  const priorGmPct = metrics.priorRevenue > 0 ? priorGm / metrics.priorRevenue : 0;
  const gmDeltaPts = (metrics.gmPct - priorGmPct) * 100;
  const yoyUp = metrics.growth >= 0;
  const gmVsBook = metrics.gmPct - 0.25;

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 print:hidden">
      <BriefCell
        label="Sales vs last year"
        value={`${yoyUp ? "Up" : "Down"} ${(Math.abs(metrics.growth) * 100).toFixed(1)}%`}
        note="Same months, prior year"
        tone={yoyUp ? "up" : "down"}
      />
      <BriefCell
        label="GM rate"
        value={`${(metrics.gmPct * 100).toFixed(1)}%`}
        note={
          metrics.priorRevenue > 0
            ? `${gmDeltaPts >= 0 ? "+" : ""}${gmDeltaPts.toFixed(1)} pts vs LY · ~25% book ${gmVsBook >= 0 ? "+" : ""}${(gmVsBook * 100).toFixed(1)} pts`
            : `vs ~25% book ${gmVsBook >= 0 ? "+" : ""}${(gmVsBook * 100).toFixed(1)} pts`
        }
        tone={gmDeltaPts >= 0 ? "up" : "down"}
      />
      <BriefCell
        label="Market feeds"
        value={feedsLive ? `Live · ${composite.toFixed(0)}` : `Cached · ${composite.toFixed(0)}`}
        note={feedsLive ? "FRED/BLS composite (100 = neutral)" : "Offline snapshot · composite 100 = neutral"}
        tone={feedsLive ? "live" : "muted"}
      />
    </div>
  );
}

function BriefCell({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone: "up" | "down" | "live" | "muted";
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-fg-subtle)]">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-sm font-semibold tabular",
          tone === "up" && "text-[var(--color-success)]",
          tone === "down" && "text-[var(--color-danger)]",
          tone === "live" && "text-[var(--color-fg)]",
          tone === "muted" && "text-[var(--color-fg-muted)]",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-[var(--color-fg-subtle)]">{note}</p>
    </div>
  );
}
