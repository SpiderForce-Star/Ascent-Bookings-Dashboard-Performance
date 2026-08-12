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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const defaultPreset = PRESETS.find((p) => p.id === "ytd-2026")!;
const defaultRange = defaultPreset.range!;

type TabId =
  | "performance"
  | "feeds"
  | "dodge"
  | "forecast"
  | "territory"
  | "sales-sheets"
  | "steel";

const TABS: { id: TabId; label: string; icon: typeof BarChart3 }[] = [
  { id: "performance", label: "Performance", icon: BarChart3 },
  { id: "feeds", label: "Market feeds", icon: Radio },
  { id: "dodge", label: "Dodge pipeline", icon: GanttChartSquare },
  { id: "forecast", label: "Sales forecast", icon: LineChart },
  { id: "territory", label: "Territory", icon: MapPin },
  { id: "sales-sheets", label: "Sales sheets", icon: ClipboardList },
  { id: "steel", label: "Steel cost", icon: Flame },
];

export function Dashboard() {
  const [preset, setPreset] = useState<DatePreset>("ytd-2026");
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [tab, setTab] = useState<TabId>("performance");
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
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src="/logo.jpg"
                alt="Ascent Buildings"
                className="h-10 w-auto shrink-0 object-contain sm:h-11"
                width={160}
                height={44}
              />
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
              <span className="hidden items-center gap-1.5 rounded-full bg-[var(--color-bg-subtle)] px-3 py-1.5 text-xs text-[var(--color-fg-muted)] xl:inline-flex">
                <FileSpreadsheet className="size-3.5" />
                YTD 2026 · Jul · FRED/BLS · Dodge
              </span>
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <nav className="flex gap-1 overflow-x-auto pb-0" aria-label="Dashboard sections">
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
                    Bookings & margin, live market signals, Dodge project pipeline, and territory forecast for
                    Ascent Buildings.
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
              <TrendCharts data={series} />
              <BreakdownTable rows={segments} monthlyRows={series} />
            </>
          )}

          {tab === "feeds" && <LiveFeedsPanel />}
          {tab === "dodge" && <DodgePanel />}
          {tab === "forecast" && <ForecastPanel />}
          {tab === "territory" && <TerritoryPanel />}
          {tab === "sales-sheets" && <SalesSheetsPanel />}
          {tab === "steel" && <SteelForecastPanel />}

          <footer className="flex flex-col gap-1 border-t border-[var(--color-border)] pt-6 pb-8 text-xs text-[var(--color-fg-subtle)] sm:flex-row sm:items-center sm:justify-between print:hidden">
            <p>Ascent Buildings LLC · Portland, TN · PEMB / CSI Div 13 · Bookings through July 2026</p>
            <p>
              FRED + BLS · Dodge · Sales & steel cost forecasts · State sheets are planning models
            </p>
          </footer>
        </main>
      </div>
    </TooltipProvider>
  );
}
