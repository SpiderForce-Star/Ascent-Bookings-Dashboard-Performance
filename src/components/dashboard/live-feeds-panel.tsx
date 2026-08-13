import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConstructionFeeds } from "@/hooks/use-construction-feeds";
import type { FeedPoint, FeedSeries } from "@/data/construction-feeds";
import { LATEST_ACTUAL_2026_MONTH, computeMetrics } from "@/data/bookings";
import { computeShipmentMetrics } from "@/data/shipments";
import { formatPercent, formatNumber, cn } from "@/lib/utils";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Factory,
  Loader2,
  Radio,
  RefreshCw,
  Store,
  TrendingDown,
  TrendingUp,
  Truck,
} from "lucide-react";

const HERO_IDS = ["PRMFGCONS", "TLCOMCONS", "WPU101", "USCONS"] as const;
const CHART_IDS = ["PRMFGCONS", "TLCOMCONS", "TLNRESCONS", "WPU101", "USCONS"] as const;

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortMonth(iso: string): string {
  const [year, month] = iso.split("-");
  const m = Number(month);
  if (!year || !m) return iso;
  return `${MONTH_SHORT[m - 1]} '${year.slice(2)}`;
}

function formatFeedValue(s: FeedSeries): string {
  if (!s.latest) return "—";
  const v = s.latest.value;
  if (s.unit.includes("$ millions")) {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}T`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}B`;
    return `$${formatNumber(v, 0)}M`;
  }
  if (s.id === "USCONS" || s.unit.includes("thousands")) return `${(v / 1000).toFixed(2)}M`;
  if (s.unit === "index") return formatNumber(v, 1);
  return formatNumber(v, 1);
}

function formatLevel(value: number, unit: string, id: string): string {
  if (unit.includes("$ millions")) {
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}T`;
    return `$${value.toFixed(0)}B`;
  }
  if (id === "USCONS" || unit.includes("thousands")) return `${(value / 1000).toFixed(2)}M`;
  return formatNumber(value, 1);
}

function zoomDomain(values: number[]): [number, number] {
  const nums = values.filter((v) => Number.isFinite(v));
  if (!nums.length) return [0, 1];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = Math.max(max - min, Math.abs(min) * 0.02, 1);
  const pad = span * 0.12;
  const lo = min - pad;
  return [min >= 0 ? Math.max(0, lo) : lo, max + pad];
}

function toChartLevel(value: number, unit: string): number {
  return unit.includes("$ millions") ? value / 1000 : value;
}

function buildChart(history: FeedPoint[], unit: string) {
  return history.map((p, i) => {
    const ago = history[i - 12];
    return {
      date: p.date.slice(0, 7),
      level: toChartLevel(p.value, unit),
      yoy: ago ? ((p.value - ago.value) / Math.abs(ago.value)) * 100 : null,
    };
  });
}

function ChartTip({
  active,
  payload,
  label,
  unit,
  id,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; name: string }>;
  label?: string;
  unit: string;
  id: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 shadow-[var(--shadow-md)]">
      <p className="mb-1 text-xs font-medium">{label ? shortMonth(label) : ""}</p>
      {payload.map((e) => (
        <div key={e.dataKey} className="flex justify-between gap-6 text-xs">
          <span className="text-[var(--color-fg-muted)]">{e.name}</span>
          <span className="tabular font-medium">
            {e.dataKey === "yoy"
              ? `${Number(e.value) >= 0 ? "+" : ""}${Number(e.value).toFixed(1)}%`
              : formatLevel(Number(e.value), unit, id)}
          </span>
        </div>
      ))}
    </div>
  );
}

function Mom({ pct, digits = 2 }: { pct: number | null; digits?: number }) {
  if (pct == null) return <span className="text-xs text-[var(--color-fg-subtle)]">—</span>;
  const up = pct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular",
        up ? "text-[var(--color-success)]" : "text-[var(--color-danger)]",
      )}
    >
      <Icon className="size-3.5" />
      {up ? "+" : ""}
      {pct.toFixed(digits)}%
    </span>
  );
}

function Spark({ history }: { history: FeedPoint[] }) {
  const pts = history.slice(-24);
  if (pts.length < 2) return null;
  const vals = pts.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || Math.abs(min) * 0.01 || 1;
  const w = 88;
  const h = 28;
  const d = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((p.value - min) / span) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = vals[vals.length - 1]! >= vals[0]!;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden>
      <path
        d={d}
        fill="none"
        stroke={up ? "var(--color-success)" : "var(--color-danger)"}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StatusBadge({ status, live }: { status: string; live: boolean }) {
  if (status === "live" || (status === "partial" && live)) {
    return (
      <Badge variant="success" className="gap-1">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--color-success)] opacity-60" />
          <span className="relative inline-flex size-1.5 rounded-full bg-[var(--color-success)]" />
        </span>
        {status === "partial" ? "Partial live" : "Live"}
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge variant="danger" className="gap-1">
        <AlertCircle className="size-3" /> Offline cache
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      Cached snapshot
    </Badge>
  );
}

export function LiveFeedsPanel() {
  const { data, loading, error, refresh, lastRefresh } = useConstructionFeeds(true);
  const [chartId, setChartId] = useState<string>("PRMFGCONS");

  const byId = useMemo(() => new Map(data.series.map((s) => [s.id, s])), [data.series]);
  const heroes = HERO_IDS.map((id) => byId.get(id)).filter(Boolean) as FeedSeries[];
  const chartSeries = byId.get(chartId) ?? byId.get("PRMFGCONS") ?? data.series[0];
  const chartData = useMemo(
    () => buildChart(chartSeries?.history ?? [], chartSeries?.unit ?? ""),
    [chartSeries],
  );
  const levelDomain = zoomDomain(chartData.map((d) => d.level));

  const ascent = useMemo(
    () =>
      computeMetrics({
        startYear: 2026,
        startMonth: 0,
        endYear: 2026,
        endMonth: LATEST_ACTUAL_2026_MONTH,
      }),
    [],
  );
  const shipped = useMemo(() => computeShipmentMetrics(), []);
  const mfgYoy = data.signal.manufacturingYoy;
  const beatPts = ascent.growth * 100 - mfgYoy;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[var(--color-primary)]">
            <Radio className="size-3.5" />
            Market feeds
          </div>
          <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
            The tape that matters for metal buildings
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-fg-muted)]">
            Manufacturing and commercial put-in-place, construction jobs, and steel PPI — not housing
            permits. National series from FRED and BLS. Ascent bookings sit next to the tape so the
            board can see whether we are running with the market or through it.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={data.status} live={data.live} />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void refresh()}
            disabled={loading}
            className="gap-1.5"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 print:hidden">
        <Brief
          icon={Factory}
          label="Manufacturing YoY"
          value={`${mfgYoy >= 0 ? "+" : ""}${mfgYoy.toFixed(1)}%`}
          note="Plant / factory construction put-in-place"
          tone={mfgYoy >= 0 ? "up" : "down"}
        />
        <Brief
          icon={TrendingUp}
          label="Steel PPI YoY"
          value={`${data.signal.steelYoy >= 0 ? "+" : ""}${data.signal.steelYoy.toFixed(1)}%`}
          note="Iron and steel — buy-out / EGM pressure"
          tone={data.signal.steelYoy <= 2 ? "up" : "down"}
        />
        <Brief
          icon={Truck}
          label="Ascent vs manufacturing"
          value={`${beatPts >= 0 ? "+" : ""}${beatPts.toFixed(0)} pts`}
          note={`Bookings ${formatPercent(ascent.growth)} YTD · mfg ${mfgYoy >= 0 ? "+" : ""}${mfgYoy.toFixed(1)}%`}
          tone={beatPts >= 0 ? "up" : "down"}
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {data.sources.map((src) => (
          <div
            key={src.name}
            className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2"
          >
            {src.ok ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--color-success)]" />
            ) : (
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-[var(--color-warn)]" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium">{src.name}</p>
              <p className="text-xs text-[var(--color-fg-muted)]">{src.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="rounded-[var(--radius-sm)] bg-[var(--color-warn-soft)] px-3 py-2 text-xs text-[var(--color-warn)]">
          Live fetch issue: {error}. Showing last available data.
        </p>
      )}

      <Card className="border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)]/30">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] text-[var(--color-primary)] shadow-sm">
              <Activity className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-fg-subtle)]">
                PEMB market index · 100 = neutral
              </p>
              <p className="font-display text-3xl font-semibold tabular tracking-tight">
                {data.signal.compositeIndex.toFixed(1)}
              </p>
              <p className="mt-1 max-w-xl text-xs text-[var(--color-fg-muted)]">{data.signal.narrative}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:text-right">
            <div>
              <p className="text-[var(--color-fg-subtle)]">Manufacturing MoM</p>
              <Mom pct={data.signal.manufacturingMomentum} />
            </div>
            <div>
              <p className="text-[var(--color-fg-subtle)]">Commercial MoM</p>
              <Mom pct={data.signal.commercialMomentum} />
            </div>
            <div>
              <p className="text-[var(--color-fg-subtle)]">Steel PPI MoM</p>
              <Mom pct={data.signal.materialsPressure} />
            </div>
            <div>
              <p className="text-[var(--color-fg-subtle)]">Jobs MoM</p>
              <Mom pct={data.signal.employmentMomentum} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {heroes.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setChartId(s.id)}
            className="text-left"
            title={s.description}
          >
            <Card className={cn(chartId === s.id && "ring-2 ring-[var(--color-primary)]")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-[var(--color-fg-muted)]">{s.label}</p>
                  <Badge variant={s.status === "live" ? "success" : "secondary"} className="text-[10px]">
                    {s.status === "live" ? "Live" : "Cache"}
                  </Badge>
                </div>
                <p className="mt-2 font-display text-xl font-semibold tabular">{formatFeedValue(s)}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <Mom pct={s.yoyPct} digits={1} />
                  <span className="text-[10px] text-[var(--color-fg-subtle)]">YoY</span>
                </div>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <Spark history={s.history} />
                  <Mom pct={s.momPct} />
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle>{chartSeries?.label ?? "Manufacturing construction"}</CardTitle>
            <CardDescription>
              Last 5 years · axis zoomed to the range (not zero) · YoY % on the right. Click a KPI
              card to switch the series.
            </CardDescription>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {CHART_IDS.map((id) => {
                const s = byId.get(id);
                if (!s) return null;
                return (
                  <Button
                    key={id}
                    type="button"
                    size="sm"
                    variant={chartId === id ? "default" : "secondary"}
                    className="h-7 rounded-full"
                    onClick={() => setChartId(id)}
                  >
                    {s.label.replace(" construction", "").replace("Private ", "")}
                  </Button>
                );
              })}
            </div>
          </CardHeader>
          <CardContent className="h-72 pt-0 sm:h-80">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="liveFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "var(--color-fg-subtle)" }}
                    axisLine={false}
                    tickLine={false}
                    interval={5}
                    tickFormatter={shortMonth}
                  />
                  <YAxis
                    yAxisId="level"
                    domain={levelDomain}
                    tick={{ fontSize: 10, fill: "var(--color-fg-subtle)" }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tickFormatter={(v) => formatLevel(Number(v), chartSeries?.unit ?? "", chartSeries?.id ?? "")}
                  />
                  <YAxis
                    yAxisId="yoy"
                    orientation="right"
                    tick={{ fontSize: 10, fill: "var(--color-fg-subtle)" }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                  />
                  <Tooltip
                    content={
                      <ChartTip unit={chartSeries?.unit ?? ""} id={chartSeries?.id ?? ""} />
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
                  <Area
                    yAxisId="level"
                    type="monotone"
                    dataKey="level"
                    name="Level"
                    stroke="var(--color-primary)"
                    strokeWidth={2.5}
                    fill="url(#liveFill)"
                  />
                  <Line
                    yAxisId="yoy"
                    type="monotone"
                    dataKey="yoy"
                    name="YoY %"
                    stroke="var(--color-chart-2)"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[var(--color-fg-muted)]">
                No history available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="size-4 text-[var(--color-primary)]" />
              Ascent vs the tape
            </CardTitle>
            <CardDescription>
              Same months, January–July 2026 bookings and shipments against national put-in-place.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <CompareRow
              label="Ascent bookings"
              value={formatPercent(ascent.growth)}
              hint={formatFeedHint(ascent.revenue)}
              hot={ascent.growth > 0}
            />
            <CompareRow
              label="Ascent shipped"
              value={formatPercent(shipped.growth)}
              hint="Closed months vs last year"
              hot={shipped.growth > 0}
            />
            <CompareRow
              label="Manufacturing CIP"
              value={`${mfgYoy >= 0 ? "+" : ""}${mfgYoy.toFixed(1)}%`}
              hint="FRED PRMFGCONS · plants / factories"
              hot={mfgYoy >= 0}
            />
            <CompareRow
              label="Commercial CIP"
              value={`${data.signal.commercialYoy >= 0 ? "+" : ""}${data.signal.commercialYoy.toFixed(1)}%`}
              hint="FRED TLCOMCONS · warehouse / retail"
              hot={data.signal.commercialYoy >= 0}
            />
            <CompareRow
              label="Private nonres (all)"
              value={`${data.signal.nonresYoy >= 0 ? "+" : ""}${data.signal.nonresYoy.toFixed(1)}%`}
              hint="The headline that looks calm"
              hot={data.signal.nonresYoy >= 0}
            />
            <p className="text-[12px] text-[var(--color-fg-muted)]">
              Bookings are running {beatPts >= 0 ? "ahead of" : "behind"} a{" "}
              {mfgYoy <= -10 ? "soft manufacturing" : "national"} tape by {Math.abs(beatPts).toFixed(0)}{" "}
              points. That is share, not a rising tide.
            </p>
          </CardContent>
        </Card>
      </div>

      <p className="text-[11px] text-[var(--color-fg-subtle)]">
        Sources: FRED open CSV (PRMFGCONS, TLCOMCONS, TLNRESCONS, USCONS, WPU101) · BLS Public API
        (industrial building PPI). Housing permits and lumber are off this tab — they are not the PEMB
        tape. Fetched {lastRefresh ? new Date(lastRefresh).toLocaleString() : "on load"} · server{" "}
        {new Date(data.fetchedAt).toLocaleString()}. National series inform the SE outlook; not a
        substitute for Dodge / local bid lists.
      </p>
    </div>
  );
}

function formatFeedHint(revenue: number): string {
  if (revenue >= 1_000_000) return `$${(revenue / 1_000_000).toFixed(1)}M YTD`;
  return `$${formatNumber(revenue, 0)} YTD`;
}

function Brief({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: typeof Factory;
  label: string;
  value: string;
  note: string;
  tone: "up" | "down";
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-[var(--color-fg-subtle)]">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-display text-xl font-semibold tabular",
          tone === "up" ? "text-[var(--color-success)]" : "text-[var(--color-danger)]",
        )}
      >
        {value}
      </p>
      <p className="text-[11px] text-[var(--color-fg-muted)]">{note}</p>
    </div>
  );
}

function CompareRow({
  label,
  value,
  hint,
  hot,
}: {
  label: string;
  value: string;
  hint: string;
  hot: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)]/60 pb-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[11px] text-[var(--color-fg-subtle)]">{hint}</p>
      </div>
      <p
        className={cn(
          "font-display text-base font-semibold tabular",
          hot ? "text-[var(--color-success)]" : "text-[var(--color-danger)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}
