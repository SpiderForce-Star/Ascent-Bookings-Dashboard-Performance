import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildForecast, commercialSegments, type ForecastScenario } from "@/data/forecast";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { LineChart, Sparkles, Building2 } from "lucide-react";

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string; payload?: { isActual?: boolean; marketIndex?: number } }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 shadow-[var(--shadow-md)]">
      <p className="mb-1 text-xs font-medium">
        {label}{" "}
        {row?.isActual ? (
          <Badge variant="secondary" className="ml-1">
            Actual
          </Badge>
        ) : (
          <Badge variant="default" className="ml-1">
            Forecast
          </Badge>
        )}
      </p>
      {payload.map((e) => (
        <div key={e.dataKey} className="flex justify-between gap-6 text-xs">
          <span className="text-[var(--color-fg-muted)]">{e.name}</span>
          <span className="tabular font-medium">
            {e.dataKey === "marketIndex" ? e.value : formatCurrency(Number(e.value))}
          </span>
        </div>
      ))}
      {row?.marketIndex != null && (
        <p className="mt-1 text-[10px] text-[var(--color-fg-subtle)]">
          Commercial activity index: {row.marketIndex}
        </p>
      )}
    </div>
  );
}

const SCENARIOS: ForecastScenario[] = ["conservative", "base", "optimistic"];

export function ForecastPanel() {
  const [scenario, setScenario] = useState<ForecastScenario>("base");
  const forecast = useMemo(() => buildForecast(scenario), [scenario]);

  const chartData = forecast.months.map((m) => ({
    key: m.key,
    revenue: m.revenue,
    marketIndex: m.marketIndex,
    isActual: m.isActual,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[var(--color-primary)]">
            <LineChart className="size-3.5" />
            Sales forecast
          </div>
          <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Forward bookings outlook
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-fg-muted)]">
            Model blends 2023–2026 seasonality, recent growth, and a commercial building activity index for the
            Southeast / Midwest service area. Switch scenarios for executive planning ranges.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <Button
              key={s}
              type="button"
              size="sm"
              variant={scenario === s ? "default" : "secondary"}
              className="rounded-full capitalize"
              onClick={() => setScenario(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="2026 YTD actual"
          value={formatCurrency(forecast.ytdActual, true)}
          sub="Jan–Jun booked"
        />
        <Metric
          label="H2 2026 forecast"
          value={formatCurrency(forecast.h2_2026, true)}
          sub={forecast.label}
          accent
        />
        <Metric
          label="FY 2026 projected"
          value={formatCurrency(forecast.fullYear_2026, true)}
          sub={`${formatPercent(forecast.growthVs2025)} vs FY 2025`}
        />
        <Metric
          label="FY 2027 projected"
          value={formatCurrency(forecast.fullYear_2027, true)}
          sub={`Implied GM ${(forecast.impliedGmPct * 100).toFixed(1)}%`}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-[var(--color-primary)]" />
              {forecast.label} trajectory
            </CardTitle>
            <CardDescription>{forecast.description}</CardDescription>
          </div>
          <Badge variant="outline">Offline model · sample market index</Badge>
        </CardHeader>
        <CardContent className="h-80 pt-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fcFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="key"
                tick={{ fontSize: 10, fill: "var(--color-fg-subtle)" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: "var(--color-fg-subtle)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCurrency(v, true)}
                width={56}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[90, 120]}
                tick={{ fontSize: 11, fill: "var(--color-fg-subtle)" }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip content={<ChartTip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
              <ReferenceLine
                yAxisId="left"
                x="Jun 2026"
                stroke="var(--color-border-strong)"
                strokeDasharray="4 4"
                label={{ value: "Actual → forecast", position: "insideTopRight", fontSize: 10, fill: "var(--color-fg-subtle)" }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                fill="url(#fcFill)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="marketIndex"
                name="Commercial index"
                stroke="var(--color-chart-5)"
                strokeWidth={2}
                dot={false}
                strokeDasharray="4 3"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-4" />
            Commercial segment demand mix
          </CardTitle>
          <CardDescription>
            Planning mix for the Portland, TN 600-mile footprint — used to shape forecast scenarios
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {commercialSegments.map((seg) => (
              <div
                key={seg.name}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{seg.name}</p>
                  <Badge
                    variant={
                      seg.outlook === "Strong" || seg.outlook === "Solid"
                        ? "success"
                        : seg.outlook === "Improving"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {seg.outlook}
                  </Badge>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-primary)]"
                    style={{ width: `${seg.share * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-[var(--color-fg-muted)]">
                  <span className="tabular font-medium text-[var(--color-fg)]">{(seg.share * 100).toFixed(0)}%</span>
                  {" · "}
                  {seg.note}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <Card className={cn(accent && "border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]/40")}>
      <CardContent className="p-4 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-fg-subtle)]">{label}</p>
        <p className="mt-2 font-display text-2xl font-semibold tracking-tight tabular">{value}</p>
        <p className="mt-1 text-xs text-[var(--color-fg-muted)]">{sub}</p>
      </CardContent>
    </Card>
  );
}
