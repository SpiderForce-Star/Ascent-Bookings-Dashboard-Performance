import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConstructionFeeds } from "@/hooks/use-construction-feeds";
import type { FeedSeries } from "@/data/construction-feeds";
import { formatNumber, cn } from "@/lib/utils";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Radio,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

function formatFeedValue(s: FeedSeries): string {
  if (!s.latest) return "—";
  const v = s.latest.value;
  if (s.unit.includes("$ millions")) {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}T`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}B`;
    return `$${formatNumber(v, 0)}M`;
  }
  if (s.unit.includes("thousands")) return `${formatNumber(v, 0)}k`;
  if (s.unit === "index") return formatNumber(v, 1);
  return formatNumber(v, 1);
}

function Mom({ pct }: { pct: number | null }) {
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
      {pct.toFixed(2)}%
    </span>
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
  const high = data.series.filter((s) => s.relevance === "high");
  const other = data.series.filter((s) => s.relevance !== "high");

  const chartSeries = data.series.find((s) => s.id === "TLNRESCONS") ?? data.series[0];
  const chartData =
    chartSeries?.history.map((p) => ({
      date: p.date.slice(0, 7),
      value: p.value,
    })) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[var(--color-primary)]">
            <Radio className="size-3.5" />
            Live construction feeds
          </div>
          <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
            National market signals
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-fg-muted)]">
            Real-time pulls from{" "}
            <strong className="font-medium text-[var(--color-fg)]">FRED</strong> (construction put-in-place,
            permits) and the{" "}
            <strong className="font-medium text-[var(--color-fg)]">BLS Public API</strong> (construction
            employment, industrial building PPI). Composite signal feeds the Forecast tab.
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
          {loading && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--color-fg-subtle)]">
              <Loader2 className="size-3 animate-spin" />
              Updating feeds…
            </span>
          )}
        </div>
      </div>

      {/* Source health */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {data.sources.map((src) => (
          <div
            key={src.name}
            className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2.5"
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

      {/* Composite signal */}
      <Card className="border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)]/30">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] text-[var(--color-primary)] shadow-sm">
              <Activity className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-fg-subtle)]">
                Composite commercial index
              </p>
              <p className="font-display text-3xl font-semibold tabular tracking-tight">
                {data.signal.compositeIndex.toFixed(1)}
              </p>
              <p className="mt-1 max-w-xl text-xs text-[var(--color-fg-muted)]">{data.signal.narrative}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:text-right">
            <div>
              <p className="text-[var(--color-fg-subtle)]">Nonres MoM</p>
              <Mom pct={data.signal.nonresMomentum} />
            </div>
            <div>
              <p className="text-[var(--color-fg-subtle)]">Employment MoM</p>
              <Mom pct={data.signal.employmentMomentum} />
            </div>
            <div>
              <p className="text-[var(--color-fg-subtle)]">Materials PPI MoM</p>
              <Mom pct={data.signal.materialsPressure} />
            </div>
            <div>
              <p className="text-[var(--color-fg-subtle)]">Permits MoM</p>
              <Mom pct={data.signal.permitMomentum} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary indicators */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {high.map((s) => (
          <Card key={s.id} title={s.description}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-[var(--color-fg-muted)]">{s.label}</p>
                <Badge variant={s.status === "live" ? "success" : "secondary"} className="text-[10px]">
                  {s.status === "live" ? "Live" : "Cache"}
                </Badge>
              </div>
              <p className="mt-2 font-display text-xl font-semibold tabular">{formatFeedValue(s)}</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <Mom pct={s.momPct} />
                <span className="text-[10px] text-[var(--color-fg-subtle)]">
                  {s.latest?.date ?? "—"}
                  {s.yoyPct != null && (
                    <span className="ml-1">· YoY {s.yoyPct >= 0 ? "+" : ""}{s.yoyPct.toFixed(1)}%</span>
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>{chartSeries?.label ?? "Nonresidential construction"}</CardTitle>
            <CardDescription>
              FRED history · {chartSeries?.unit ?? ""} · source {chartSeries?.status ?? "—"}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 pt-0 sm:h-72">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="liveFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "var(--color-fg-subtle)" }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-fg-subtle)" }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid var(--color-border)",
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [formatNumber(value, 0), "Value"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--color-primary)"
                    strokeWidth={2.5}
                    fill="url(#liveFill)"
                  />
                </AreaChart>
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
            <CardTitle>All series</CardTitle>
            <CardDescription>Supporting context indicators</CardDescription>
          </CardHeader>
          <CardContent className="max-h-72 space-y-2 overflow-y-auto pt-0">
            {[...high, ...other].map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{s.label}</p>
                  <p className="text-[10px] text-[var(--color-fg-subtle)]">
                    {s.source.toUpperCase()} · {s.id}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold tabular">{formatFeedValue(s)}</p>
                  <Mom pct={s.momPct} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <p className="text-[11px] text-[var(--color-fg-subtle)]">
        Sources: Federal Reserve Bank of St. Louis (FRED) open CSV · U.S. Bureau of Labor Statistics Public Data
        API. Fetched {lastRefresh ? new Date(lastRefresh).toLocaleString() : "on load"} · server timestamp{" "}
        {new Date(data.fetchedAt).toLocaleString()}. National series inform SE commercial outlook; not
        substitute for local Dodge/ConstructConnect bid lists.
      </p>
    </div>
  );
}
