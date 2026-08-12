import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
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
import {
  buildForecast,
  commercialSegments,
  type ForecastAllocation,
  type ForecastScenario,
  type RegionFilter,
} from "@/data/forecast";
import { territoryPembShare } from "@/data/sales-sheets";
import { signalToForecastBias } from "@/data/construction-feeds";
import { useConstructionFeeds } from "@/hooks/use-construction-feeds";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { LineChart, Sparkles, Building2, Radio, SlidersHorizontal } from "lucide-react";

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
    payload?: { isActual?: boolean; marketIndex?: number; capacityCapped?: boolean };
  }>;
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
        {row?.capacityCapped && (
          <Badge variant="warn" className="ml-1">
            Cap
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

/** Default monthly fab capacity for capacity-aware optimistic (~ plant stretch). */
const DEFAULT_CAPACITY_CAP = 12_000_000;

export function ForecastPanel() {
  const [scenario, setScenario] = useState<ForecastScenario>("base");
  const [pembOnly, setPembOnly] = useState(false);
  const [materialsStress, setMaterialsStress] = useState(false);
  const [bidConversion, setBidConversion] = useState(0.22);
  const [useBidConversion, setUseBidConversion] = useState(false);
  const [capacityAware, setCapacityAware] = useState(false);
  const [capacityCap, setCapacityCap] = useState(DEFAULT_CAPACITY_CAP);
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("all");
  const [allocation, setAllocation] = useState<ForecastAllocation>("national");
  const { data: feeds } = useConstructionFeeds(true);

  const liveBias = 1 + signalToForecastBias(feeds.signal);
  const pembShare = territoryPembShare();

  const forecast = useMemo(
    () =>
      buildForecast(scenario, {
        liveBias,
        liveCompositeIndex: feeds.signal.compositeIndex,
        pembOnly,
        pembShare,
        materialsStress,
        bidConversionPct: useBidConversion ? bidConversion : 0,
        capacityCapMonthly: capacityAware ? capacityCap : null,
        regionFilter,
        allocation,
      }),
    [
      scenario,
      liveBias,
      feeds.signal.compositeIndex,
      pembOnly,
      pembShare,
      materialsStress,
      useBidConversion,
      bidConversion,
      capacityAware,
      capacityCap,
      regionFilter,
      allocation,
    ],
  );

  const chartData = forecast.months.map((m) => ({
    key: m.key,
    revenue: m.revenue,
    marketIndex: m.marketIndex,
    isActual: m.isActual,
    capacityCapped: m.capacityCapped,
  }));

  const regionChartData = forecast.regionBreakdown.map((r) => ({
    name: r.region,
    label: r.label,
    fy2026: r.fullYear_2026,
    fy2027: r.fullYear_2027,
    pemb: Math.round(r.pembShare * 100),
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
            Model blends 2023–2026 seasonality, recent growth, and{" "}
            <strong className="font-medium text-[var(--color-fg)]">live construction feeds</strong> (FRED
            nonres + BLS employment/PPI). PEMB / CSI Division 13 options, region allocation, capacity, and
            materials stress stay offline-capable.
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

      <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-xs">
        <Radio
          className={cn(
            "size-3.5",
            feeds.live ? "text-[var(--color-success)]" : "text-[var(--color-fg-subtle)]",
          )}
        />
        <span className="font-medium">Live feed bias: {((liveBias - 1) * 100).toFixed(1)}%</span>
        <span className="text-[var(--color-fg-muted)]">
          · Composite index {feeds.signal.compositeIndex.toFixed(1)} ({feeds.live ? "live" : "cached"})
        </span>
        <span className="text-[var(--color-fg-subtle)]">· Territory PEMB share {(pembShare * 100).toFixed(0)}%</span>
      </div>

      {/* Advanced options */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="size-4 text-[var(--color-primary)]" />
            Forecast options
          </CardTitle>
          <CardDescription>
            Charts and KPIs update live. Region / state tables allocate national outlook by demand × pipeline
            (illustrative — not booked revenue by geography).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex flex-wrap gap-2">
            <ToggleChip active={pembOnly} onClick={() => setPembOnly((v) => !v)} label="PEMB-only forecast" />
            <ToggleChip
              active={materialsStress}
              onClick={() => setMaterialsStress((v) => !v)}
              label="Materials stress (GM −200 bps)"
            />
            <ToggleChip
              active={useBidConversion}
              onClick={() => setUseBidConversion((v) => !v)}
              label="Bid conversion uplift"
            />
            <ToggleChip
              active={capacityAware}
              onClick={() => setCapacityAware((v) => !v)}
              label="Capacity-aware cap"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="mb-1.5 text-xs font-medium text-[var(--color-fg-subtle)]">Region filter</p>
              <div className="flex flex-wrap gap-1.5">
                {(["all", "core", "primary", "extended"] as const).map((r) => (
                  <Button
                    key={r}
                    type="button"
                    size="sm"
                    variant={regionFilter === r ? "default" : "secondary"}
                    className="h-7 rounded-full text-xs capitalize"
                    onClick={() => setRegionFilter(r)}
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-[var(--color-fg-subtle)]">Allocation view</p>
              <div className="flex flex-wrap gap-1.5">
                {(["national", "region", "state"] as const).map((a) => (
                  <Button
                    key={a}
                    type="button"
                    size="sm"
                    variant={allocation === a ? "default" : "secondary"}
                    className="h-7 rounded-full text-xs capitalize"
                    onClick={() => setAllocation(a)}
                  >
                    {a}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-fg-subtle)]">
                Bid conversion {(bidConversion * 100).toFixed(0)}%
                {!useBidConversion && (
                  <span className="ml-1 font-normal text-[var(--color-fg-subtle)]">(off)</span>
                )}
              </label>
              <input
                type="range"
                min={15}
                max={35}
                step={1}
                value={Math.round(bidConversion * 100)}
                disabled={!useBidConversion}
                onChange={(e) => setBidConversion(Number(e.target.value) / 100)}
                className="w-full accent-[var(--color-primary)] disabled:opacity-40"
              />
              <p className="mt-1 text-[10px] text-[var(--color-fg-subtle)]">
                15–35% of design/bid pipeline converts over ~6 months
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-fg-subtle)]">
                Monthly fab capacity $
                {!capacityAware && (
                  <span className="ml-1 font-normal text-[var(--color-fg-subtle)]">(off)</span>
                )}
              </label>
              <input
                type="number"
                min={1_000_000}
                step={500_000}
                value={capacityCap}
                disabled={!capacityAware}
                onChange={(e) => setCapacityCap(Number(e.target.value) || DEFAULT_CAPACITY_CAP)}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm tabular disabled:opacity-40"
              />
              <p className="mt-1 text-[10px] text-[var(--color-fg-subtle)]">
                Caps projected months (capacity-aware optimistic)
              </p>
            </div>
          </div>

          <p className="text-[11px] text-[var(--color-fg-muted)]">{forecast.optionsNote}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="2026 YTD actual"
          value={formatCurrency(forecast.ytdActual, true)}
          sub={pembOnly ? "Jan–Jul · PEMB share applied" : "Jan–Jul booked"}
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
          sub={`Implied GM ${(forecast.impliedGmPct * 100).toFixed(1)}%${
            forecast.materialsGmDrag > 0 ? " · materials stress" : ""
          }`}
        />
      </div>

      {forecast.bidConversionUplift > 0 && (
        <p className="rounded-[var(--radius-sm)] bg-[var(--color-info-soft)] px-3 py-2 text-xs text-[var(--color-info)]">
          Bid-conversion uplift modeled: {formatCurrency(forecast.bidConversionUplift, true)} spread across
          the next 6 forecast months from design/bid pipeline.
        </p>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-[var(--color-primary)]" />
              {forecast.label} trajectory
              {pembOnly && (
                <Badge variant="default" className="ml-1">
                  PEMB
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{forecast.description}</CardDescription>
          </div>
          <Badge variant={feeds.live ? "success" : "outline"}>
            {feeds.live ? "Live feeds linked" : "Cached market index"}
          </Badge>
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
                x="Jul 2026"
                stroke="var(--color-border-strong)"
                strokeDasharray="4 4"
                label={{
                  value: "Actual → forecast",
                  position: "insideTopRight",
                  fontSize: 10,
                  fill: "var(--color-fg-subtle)",
                }}
              />
              {capacityAware && (
                <ReferenceLine
                  yAxisId="left"
                  y={capacityCap}
                  stroke="var(--color-warn)"
                  strokeDasharray="3 3"
                  label={{
                    value: "Capacity",
                    position: "insideTopLeft",
                    fontSize: 10,
                    fill: "var(--color-warn)",
                  }}
                />
              )}
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

      {allocation === "region" && (
        <Card>
          <CardHeader>
            <CardTitle>Forecast by region</CardTitle>
            <CardDescription>
              Allocated using demand × pipeline weights · PEMB share shown per tier · illustrative
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2 pt-0">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-fg-subtle)" }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-fg-subtle)" }}
                    tickFormatter={(v) => formatCurrency(v, true)}
                    width={52}
                  />
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v, true)}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid var(--color-border)",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="fy2026" name="FY 2026" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="fy2027" name="FY 2027" fill="var(--color-ink)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[360px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-fg-subtle)]">
                    <th className="pb-2 pr-2 font-medium">Region</th>
                    <th className="pb-2 pr-2 text-right font-medium">Weight</th>
                    <th className="pb-2 pr-2 text-right font-medium">H2 ’26</th>
                    <th className="pb-2 pr-2 text-right font-medium">FY ’26</th>
                    <th className="pb-2 text-right font-medium">PEMB</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.regionBreakdown.map((r) => (
                    <tr key={r.region} className="border-b border-[var(--color-border)]/70">
                      <td className="py-2 pr-2 font-medium capitalize">{r.region}</td>
                      <td className="py-2 pr-2 text-right tabular text-[var(--color-fg-muted)]">
                        {(r.weight * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 pr-2 text-right tabular">{formatCurrency(r.h2_2026, true)}</td>
                      <td className="py-2 pr-2 text-right tabular">{formatCurrency(r.fullYear_2026, true)}</td>
                      <td className="py-2 text-right tabular">{(r.pembShare * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {allocation === "state" && (
        <Card>
          <CardHeader>
            <CardTitle>Forecast by state</CardTitle>
            <CardDescription>
              Illustrative allocation of national outlook by demand × pipeline — not booked revenue by state
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[420px] overflow-auto pt-0">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead className="sticky top-0 bg-[var(--color-bg-elevated)]">
                <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-fg-subtle)]">
                  <th className="pb-2 pr-2 font-medium">State</th>
                  <th className="pb-2 pr-2 font-medium">Region</th>
                  <th className="pb-2 pr-2 text-right font-medium">Weight</th>
                  <th className="pb-2 pr-2 text-right font-medium">H2 ’26</th>
                  <th className="pb-2 pr-2 text-right font-medium">FY ’26</th>
                  <th className="pb-2 pr-2 text-right font-medium">FY ’27</th>
                  <th className="pb-2 text-right font-medium">PEMB</th>
                </tr>
              </thead>
              <tbody>
                {[...forecast.stateBreakdown]
                  .sort((a, b) => b.fullYear_2026 - a.fullYear_2026)
                  .map((s) => (
                    <tr key={s.code} className="border-b border-[var(--color-border)]/70">
                      <td className="py-2 pr-2">
                        <span className="font-medium">{s.name}</span>
                        <span className="ml-1 text-xs text-[var(--color-fg-subtle)]">{s.code}</span>
                      </td>
                      <td className="py-2 pr-2 capitalize text-xs text-[var(--color-fg-muted)]">{s.region}</td>
                      <td className="py-2 pr-2 text-right tabular text-[var(--color-fg-muted)]">
                        {(s.weight * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 pr-2 text-right tabular">{formatCurrency(s.h2_2026, true)}</td>
                      <td className="py-2 pr-2 text-right tabular font-medium">
                        {formatCurrency(s.fullYear_2026, true)}
                      </td>
                      <td className="py-2 pr-2 text-right tabular">{formatCurrency(s.fullYear_2027, true)}</td>
                      <td className="py-2 text-right tabular">{(s.pembShare * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-4" />
            Commercial segment demand mix
          </CardTitle>
          <CardDescription>
            Planning mix for the Portland, TN 600-mile footprint — tagged by product line (PEMB / Component /
            Other)
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
                  <div className="flex flex-col items-end gap-1">
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
                    <Badge
                      variant={
                        seg.productLine === "PEMB"
                          ? "default"
                          : seg.productLine === "Component"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-[10px]"
                    >
                      {seg.productLine === "PEMB" ? "PEMB / Div 13" : seg.productLine}
                    </Badge>
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-primary)]"
                    style={{ width: `${seg.share * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-[var(--color-fg-muted)]">
                  <span className="tabular font-medium text-[var(--color-fg)]">
                    {(seg.share * 100).toFixed(0)}%
                  </span>
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

function ToggleChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "secondary"}
      className="h-8 rounded-full text-xs"
      onClick={onClick}
    >
      {label}
    </Button>
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
