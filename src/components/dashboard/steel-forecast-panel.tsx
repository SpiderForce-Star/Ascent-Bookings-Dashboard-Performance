import { useCallback, useMemo, useState, type ChangeEvent } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as XLSX from "xlsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ALERT_THRESHOLD,
  BASELINE,
  PEMB_DIV13_TAG,
  SAMPLE_STEEL_ROWS,
  alertCategories,
  applyLiveFeedBias,
  availableCategories,
  cloneRisks,
  maxRiskCategory,
  parseExcelMatrix,
  pembCostImpact,
  regenerateForecast,
  sensitivityGrid,
  summaryMetrics,
  tornadoImpacts,
  type RiskFactors,
  type SteelAdjustedRow,
  type SteelBaseRow,
} from "@/data/steel-forecast";
import { buildSteelStateSheets } from "@/data/steel-state-sheets";
import {
  downloadStateSteelSheetsExcel,
  downloadSteelCsv,
  downloadSteelExcel,
  downloadSteelPdf,
} from "@/lib/steel-export";
import { useConstructionFeeds } from "@/hooks/use-construction-feeds";
import { formatCurrency, cn } from "@/lib/utils";
import {
  AlertTriangle,
  Download,
  Factory,
  FileSpreadsheet,
  Flame,
  Radio,
  RefreshCw,
  RotateCcw,
  Upload,
  Layers,
} from "lucide-react";

type SteelView = "overview" | "deep" | "sensitivity" | "export" | "states";

const VIEWS: { id: SteelView; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "deep", label: "Category deep dive" },
  { id: "sensitivity", label: "Sensitivity" },
  { id: "states", label: "State steel sheets" },
  { id: "export", label: "Export" },
];

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 shadow-[var(--shadow-md)]">
      <p className="mb-1 text-xs font-medium">{label}</p>
      {payload.map((e) => (
        <div key={e.dataKey} className="flex justify-between gap-6 text-xs">
          <span className="text-[var(--color-fg-muted)]">{e.name}</span>
          <span className="tabular font-medium">
            {e.dataKey.toLowerCase().includes("mom") || e.dataKey.toLowerCase().includes("uplift")
              ? `${Number(e.value).toFixed(2)}%`
              : formatCurrency(Number(e.value))}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SteelForecastPanel() {
  const [baseRows, setBaseRows] = useState<SteelBaseRow[]>(SAMPLE_STEEL_ROWS);
  const [modelSource, setModelSource] = useState("Sample (5-1-2026 pattern)");
  const [draftRisks, setDraftRisks] = useState<RiskFactors>(() => cloneRisks(BASELINE));
  const [appliedRisks, setAppliedRisks] = useState<RiskFactors>(() => cloneRisks(BASELINE));
  const [category, setCategory] = useState("Overall");
  const [view, setView] = useState<SteelView>("overview");
  const [liveBias, setLiveBias] = useState(false);
  const [passThrough, setPassThrough] = useState(0.72);
  const [tonsPerJob, setTonsPerJob] = useState(85);
  const { data: feeds } = useConstructionFeeds(true);

  const effectiveRisks = useMemo(
    () => applyLiveFeedBias(appliedRisks, feeds.signal.compositeIndex, liveBias),
    [appliedRisks, feeds.signal.compositeIndex, liveBias],
  );

  const adjusted = useMemo(
    () => regenerateForecast(baseRows, effectiveRisks, true),
    [baseRows, effectiveRisks],
  );

  const cats = useMemo(() => availableCategories(baseRows), [baseRows]);
  const alerts = useMemo(() => alertCategories(adjusted), [adjusted]);
  const metrics = useMemo(() => summaryMetrics(adjusted, category), [adjusted, category]);
  const overallMetrics = useMemo(() => summaryMetrics(adjusted, "Overall"), [adjusted]);
  const hottest = useMemo(() => maxRiskCategory(adjusted), [adjusted]);
  const stateSheets = useMemo(() => buildSteelStateSheets(adjusted), [adjusted]);

  const pembImpact = useMemo(() => {
    if (!overallMetrics) return null;
    return pembCostImpact(overallMetrics.avg_price, overallMetrics.avg_adj, {
      passThroughPct: passThrough,
      tonsPerProject: tonsPerJob,
    });
  }, [overallMetrics, passThrough, tonsPerJob]);

  const catSeries = useMemo(
    () =>
      adjusted
        .filter((r) => r.Category === category)
        .sort((a, b) => a.Date.localeCompare(b.Date))
        .map((r) => ({
          month: r.Month,
          base: r.Base_Price_per_Ton,
          adjusted: r.Adjusted_Price_per_Ton,
          mom: r.MoM_Pct,
          adjMom: r.Adj_MoM_Pct,
          uplift: r.Risk_Uplift_Pct,
          geo: r.GeoRiskPremium_Pct,
        })),
    [adjusted, category],
  );

  const multiCatCompare = useMemo(() => {
    const months = [...new Set(adjusted.map((r) => r.Month))].sort();
    const last = months[months.length - 1];
    if (!last) return [];
    return cats
      .filter((c) => c !== "Overall")
      .map((c) => {
        const row = adjusted.find((r) => r.Month === last && r.Category === c);
        return {
          category: c.replace("Square/Rect ", "").replace("Hot Rolled ", "HR "),
          full: c,
          base: row?.Base_Price_per_Ton ?? 0,
          adjusted: row?.Adjusted_Price_per_Ton ?? 0,
        };
      });
  }, [adjusted, cats]);

  const tornado = useMemo(
    () => tornadoImpacts(baseRows, category, effectiveRisks),
    [baseRows, category, effectiveRisks],
  );

  const sensTariff = useMemo(
    () =>
      sensitivityGrid(
        baseRows,
        category,
        effectiveRisks,
        "tariff_change_pct",
        [-10, -5, 0, 5, 10, 15, 20, 25],
      ),
    [baseRows, category, effectiveRisks],
  );

  const applyRisks = () => setAppliedRisks(cloneRisks(draftRisks));
  const restoreBaseline = () => {
    const b = cloneRisks(BASELINE);
    setDraftRisks(b);
    setAppliedRisks(b);
  };

  const onUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const all: SteelBaseRow[] = [];
      for (const name of wb.SheetNames) {
        const sheet = wb.Sheets[name];
        if (!sheet) continue;
        const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
        const parsed = parseExcelMatrix(matrix, `${file.name} / ${name}`);
        all.push(...parsed);
      }
      if (all.length === 0) {
        window.alert(
          "Could not find Month | Price | MoM blocks in the workbook. Falling back to sample data.",
        );
        return;
      }
      // Dedupe
      const map = new Map<string, SteelBaseRow>();
      for (const r of all) map.set(`${r.Month}|${r.Category}`, r);
      const rows = [...map.values()];
      setBaseRows(rows);
      setModelSource(file.name);
      const firstCat = availableCategories(rows)[0] ?? "Overall";
      setCategory(firstCat);
    } catch (err) {
      console.error(err);
      window.alert("Failed to parse Excel. Using offline sample.");
    } finally {
      e.target.value = "";
    }
  }, []);

  const riskDirty =
    draftRisks.tariff_change_pct !== appliedRisks.tariff_change_pct ||
    draftRisks.china_dumping_risk_pct !== appliedRisks.china_dumping_risk_pct ||
    draftRisks.geo_risk_premium_pct !== appliedRisks.geo_risk_premium_pct ||
    draftRisks.social_demand_vol_pct !== appliedRisks.social_demand_vol_pct;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[var(--color-primary)]">
            <Flame className="size-3.5" />
            Steel cost forecast
          </div>
          <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
            US steel $/ton — 24-month Base vs Risk-Adjusted
          </h2>
          <div className="mt-1 flex max-w-2xl flex-wrap items-center gap-2 text-sm text-[var(--color-fg-muted)]">
            <span>
              PEMB / CSI Division 13 material categories (plates, beams, sub-framing, sheet/trim, HSS, TNFAB).
              Offline sample + pure TypeScript risk engine ported from Ascent steel forecast.
            </span>
            <Badge variant="secondary">{PEMB_DIV13_TAG}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={feeds.live ? "success" : "outline"} className="gap-1">
            <Radio className="size-3" />
            Feeds {feeds.live ? "live" : "cached"}
          </Badge>
          <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 text-xs font-medium hover:bg-[var(--color-bg-subtle)]">
            <Upload className="size-3.5" />
            Upload Excel
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onUpload} />
          </label>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              setBaseRows(SAMPLE_STEEL_ROWS);
              setModelSource("Sample (5-1-2026 pattern)");
            }}
          >
            <RefreshCw className="size-3.5" />
            Sample data
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-[var(--color-fg-subtle)]">
        Source: <span className="font-medium text-[var(--color-fg-muted)]">{modelSource}</span>
        {liveBias && (
          <>
            {" "}
            · Live feed bias on geo / demand vol (composite {feeds.signal.compositeIndex.toFixed(1)})
          </>
        )}
      </p>

      {/* Controls */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Category & risk controls</CardTitle>
          <CardDescription>
            Adjust tariff, dumping, geo premium, and demand volatility — then Apply. Alert badges mark
            categories with ≥{(ALERT_THRESHOLD * 100).toFixed(0)}% Base vs Adjusted gap.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex flex-wrap gap-1.5">
            {cats.map((c) => (
              <Button
                key={c}
                type="button"
                size="sm"
                variant={category === c ? "default" : "secondary"}
                className="h-8 rounded-full text-xs"
                onClick={() => setCategory(c)}
              >
                {c}
                {alerts.includes(c) && (
                  <AlertTriangle className="ml-1 size-3 text-[var(--color-warn)]" />
                )}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <RiskSlider
              label="Tariff change (%)"
              min={-20}
              max={40}
              step={0.5}
              value={draftRisks.tariff_change_pct}
              onChange={(v) => setDraftRisks((r) => ({ ...r, tariff_change_pct: v }))}
            />
            <RiskSlider
              label="China dumping risk (%)"
              min={0}
              max={100}
              step={1}
              value={draftRisks.china_dumping_risk_pct}
              onChange={(v) => setDraftRisks((r) => ({ ...r, china_dumping_risk_pct: v }))}
            />
            <RiskSlider
              label="Geo risk premium (%)"
              min={8}
              max={11}
              step={0.1}
              value={draftRisks.geo_risk_premium_pct}
              onChange={(v) => setDraftRisks((r) => ({ ...r, geo_risk_premium_pct: v }))}
            />
            <RiskSlider
              label="Social / demand vol (%)"
              min={0}
              max={50}
              step={1}
              value={draftRisks.social_demand_vol_pct}
              onChange={(v) => setDraftRisks((r) => ({ ...r, social_demand_vol_pct: v }))}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={applyRisks} disabled={!riskDirty}>
              Apply risk case
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={restoreBaseline}>
              <RotateCcw className="size-3.5" />
              Restore baseline
            </Button>
            <ToggleChip
              active={liveBias}
              onClick={() => setLiveBias((v) => !v)}
              label="Live FRED/BLS bias"
            />
            {riskDirty && (
              <span className="text-xs text-[var(--color-warn)]">Unapplied slider changes</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sub-nav */}
      <div className="flex flex-wrap gap-1.5">
        {VIEWS.map((v) => (
          <Button
            key={v.id}
            type="button"
            size="sm"
            variant={view === v.id ? "default" : "secondary"}
            className="h-8 rounded-full"
            onClick={() => setView(v.id)}
          >
            {v.label}
          </Button>
        ))}
      </div>

      {view === "overview" && (
        <OverviewView
          metrics={metrics}
          overallMetrics={overallMetrics}
          hottest={hottest}
          catSeries={catSeries}
          multiCatCompare={multiCatCompare}
          pembImpact={pembImpact}
          category={category}
          passThrough={passThrough}
          tonsPerJob={tonsPerJob}
          onPassThrough={setPassThrough}
          onTons={setTonsPerJob}
        />
      )}
      {view === "deep" && <DeepDiveView rows={adjusted} category={category} series={catSeries} />}
      {view === "sensitivity" && (
        <SensitivityView tornado={tornado} sensTariff={sensTariff} category={category} />
      )}
      {view === "states" && (
        <StateSheetsView
          sheets={stateSheets}
          onExport={() => downloadStateSteelSheetsExcel(stateSheets, effectiveRisks)}
        />
      )}
      {view === "export" && (
        <ExportView
          onExcel={() => downloadSteelExcel(adjusted, effectiveRisks, category, modelSource)}
          onPdf={() => downloadSteelPdf(adjusted, effectiveRisks, category, modelSource)}
          onCsv={() => downloadSteelCsv(adjusted, category)}
          onStatePack={() => downloadStateSteelSheetsExcel(stateSheets, effectiveRisks)}
          category={category}
          modelSource={modelSource}
        />
      )}
    </div>
  );
}

function RiskSlider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-[var(--color-fg-subtle)]">
        <span>{label}</span>
        <span className="tabular text-[var(--color-fg)]">{value.toFixed(step < 1 ? 1 : 0)}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-primary)]"
      />
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

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <Card className={cn(accent && "border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]/40")}>
      <CardContent className="p-4 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-fg-subtle)]">{label}</p>
        <p className="mt-2 font-display text-2xl font-semibold tracking-tight tabular">{value}</p>
        {sub && <p className="mt-1 text-xs text-[var(--color-fg-muted)]">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function OverviewView({
  metrics,
  overallMetrics,
  hottest,
  catSeries,
  multiCatCompare,
  pembImpact,
  category,
  passThrough,
  tonsPerJob,
  onPassThrough,
  onTons,
}: {
  metrics: ReturnType<typeof summaryMetrics>;
  overallMetrics: ReturnType<typeof summaryMetrics>;
  hottest: { category: string; uplift: number };
  catSeries: Array<{
    month: string;
    base: number;
    adjusted: number;
    mom: number;
    adjMom: number;
  }>;
  multiCatCompare: Array<{ category: string; full: string; base: number; adjusted: number }>;
  pembImpact: ReturnType<typeof pembCostImpact> | null;
  category: string;
  passThrough: number;
  tonsPerJob: number;
  onPassThrough: (v: number) => void;
  onTons: (v: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={`${category} current base`}
          value={metrics ? formatCurrency(metrics.start_price) : "—"}
          sub={metrics ? `End base ${formatCurrency(metrics.end_price)}` : undefined}
        />
        <MetricCard
          label="24-mo avg risk uplift"
          value={metrics ? `${metrics.avg_uplift >= 0 ? "+" : ""}${metrics.avg_uplift.toFixed(2)}%` : "—"}
          sub={metrics ? `Adj avg ${formatCurrency(metrics.avg_adj)}/ton` : undefined}
          accent
        />
        <MetricCard
          label="Max risk category"
          value={hottest.category}
          sub={`${hottest.uplift >= 0 ? "+" : ""}${hottest.uplift.toFixed(2)}% avg uplift`}
        />
        <MetricCard
          label="Geo premium (avg)"
          value={metrics ? `${metrics.avg_geo.toFixed(1)}%` : "—"}
          sub="Embedded base path geo band 8–11%"
        />
      </div>

      {pembImpact && overallMetrics && (
        <Card className="border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)]/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Factory className="size-4 text-[var(--color-primary)]" />
              PEMB cost impact
            </CardTitle>
            <CardDescription>
              Translates Overall $/ton Base vs Adjusted into estimated material $ and margin drag on a
              typical commercial metal building job (configurable pass-through & tonnage).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-0">
            <div>
              <p className="text-xs text-[var(--color-fg-subtle)]">Material $ (base → adj)</p>
              <p className="mt-1 font-display text-lg font-semibold tabular">
                {formatCurrency(pembImpact.baseMaterialCost, true)} →{" "}
                {formatCurrency(pembImpact.adjustedMaterialCost, true)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-fg-subtle)]">Pass-through cost delta</p>
              <p className="mt-1 font-display text-lg font-semibold tabular">
                {pembImpact.deltaCost >= 0 ? "+" : ""}
                {formatCurrency(pembImpact.deltaCost)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-fg-subtle)]">GM drag (illustrative)</p>
              <p className="mt-1 font-display text-lg font-semibold tabular">
                {pembImpact.marginDragPctPoints >= 0 ? "+" : ""}
                {pembImpact.marginDragPctPoints.toFixed(2)} pts
              </p>
              <p className="text-[11px] text-[var(--color-fg-subtle)]">
                on {formatCurrency(pembImpact.typicalContractValue, true)} contract
              </p>
            </div>
            <div className="space-y-2">
              <label className="block text-[11px] text-[var(--color-fg-subtle)]">
                Pass-through {(passThrough * 100).toFixed(0)}%
                <input
                  type="range"
                  min={40}
                  max={100}
                  value={Math.round(passThrough * 100)}
                  onChange={(e) => onPassThrough(Number(e.target.value) / 100)}
                  className="mt-1 w-full accent-[var(--color-primary)]"
                />
              </label>
              <label className="block text-[11px] text-[var(--color-fg-subtle)]">
                Tons / project {tonsPerJob}
                <input
                  type="range"
                  min={20}
                  max={250}
                  step={5}
                  value={tonsPerJob}
                  onChange={(e) => onTons(Number(e.target.value))}
                  className="mt-1 w-full accent-[var(--color-primary)]"
                />
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Base vs Risk-Adjusted — {category}</CardTitle>
            <CardDescription>$/ton path over 24 months</CardDescription>
          </CardHeader>
          <CardContent className="h-80 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={catSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="steelAdjFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "var(--color-fg-subtle)" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-fg-subtle)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                  width={52}
                  domain={["auto", "auto"]}
                />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                <Line
                  type="monotone"
                  dataKey="base"
                  name="Base $/ton"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="adjusted"
                  name="Risk-adjusted $/ton"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  fill="url(#steelAdjFill)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">MoM % — {category}</CardTitle>
            <CardDescription>Base MoM (bars) vs adjusted MoM</CardDescription>
          </CardHeader>
          <CardContent className="h-80 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={catSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 9, fill: "var(--color-fg-subtle)" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-fg-subtle)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                  width={40}
                />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="mom" name="Base MoM %" fill="var(--color-chart-3)" radius={[2, 2, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="adjMom"
                  name="Adj MoM %"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="size-4" />
            Category comparison (final month)
          </CardTitle>
          <CardDescription>Base vs adjusted $/ton across PEMB material categories</CardDescription>
        </CardHeader>
        <CardContent className="h-72 pt-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={multiCatCompare} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="category"
                tick={{ fontSize: 10, fill: "var(--color-fg-subtle)" }}
                axisLine={false}
                tickLine={false}
                angle={-28}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-fg-subtle)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
                width={48}
              />
              <Tooltip content={<ChartTip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="base" name="Base" fill="var(--color-chart-2)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="adjusted" name="Adjusted" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function DeepDiveView({
  rows,
  category,
  series,
}: {
  rows: SteelAdjustedRow[];
  category: string;
  series: Array<{ month: string; base: number; adjusted: number; uplift: number; geo: number }>;
}) {
  const table = rows
    .filter((r) => r.Category === category)
    .sort((a, b) => a.Date.localeCompare(b.Date));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{category} — detail path</CardTitle>
          <CardDescription>Risk uplift and geo premium alongside prices</CardDescription>
        </CardHeader>
        <CardContent className="h-72 pt-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--color-fg-subtle)" }} />
              <YAxis
                yAxisId="p"
                tick={{ fontSize: 11, fill: "var(--color-fg-subtle)" }}
                tickFormatter={(v) => `$${v}`}
                width={48}
              />
              <YAxis
                yAxisId="u"
                orientation="right"
                tick={{ fontSize: 11, fill: "var(--color-fg-subtle)" }}
                tickFormatter={(v) => `${v}%`}
                width={40}
              />
              <Tooltip content={<ChartTip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line yAxisId="p" type="monotone" dataKey="base" name="Base" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
              <Line yAxisId="p" type="monotone" dataKey="adjusted" name="Adjusted" stroke="var(--color-primary)" strokeWidth={2.5} dot={false} />
              <Line yAxisId="u" type="monotone" dataKey="uplift" name="Risk uplift %" stroke="var(--color-chart-5)" strokeDasharray="4 3" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly table</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[420px] overflow-auto pt-0">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="sticky top-0 bg-[var(--color-bg-elevated)]">
              <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-fg-subtle)]">
                <th className="pb-2 pr-2 font-medium">Month</th>
                <th className="pb-2 pr-2 text-right font-medium">Base $/t</th>
                <th className="pb-2 pr-2 text-right font-medium">MoM %</th>
                <th className="pb-2 pr-2 text-right font-medium">Adj $/t</th>
                <th className="pb-2 pr-2 text-right font-medium">Adj MoM</th>
                <th className="pb-2 pr-2 text-right font-medium">Uplift %</th>
                <th className="pb-2 pr-2 text-right font-medium">Factor</th>
                <th className="pb-2 text-right font-medium">Geo %</th>
              </tr>
            </thead>
            <tbody>
              {table.map((r) => (
                <tr key={r.Month} className="border-b border-[var(--color-border)]/70">
                  <td className="py-2 pr-2 font-medium tabular">{r.Month}</td>
                  <td className="py-2 pr-2 text-right tabular">{formatCurrency(r.Base_Price_per_Ton)}</td>
                  <td className="py-2 pr-2 text-right tabular text-[var(--color-fg-muted)]">
                    {r.MoM_Pct.toFixed(2)}
                  </td>
                  <td className="py-2 pr-2 text-right tabular font-medium">
                    {formatCurrency(r.Adjusted_Price_per_Ton)}
                  </td>
                  <td className="py-2 pr-2 text-right tabular">{r.Adj_MoM_Pct.toFixed(2)}</td>
                  <td
                    className={cn(
                      "py-2 pr-2 text-right tabular",
                      Math.abs(r.Risk_Uplift_Pct) >= 3
                        ? "font-semibold text-[var(--color-primary)]"
                        : "text-[var(--color-fg-muted)]",
                    )}
                  >
                    {r.Risk_Uplift_Pct.toFixed(2)}
                  </td>
                  <td className="py-2 pr-2 text-right tabular text-[var(--color-fg-muted)]">
                    {r.Adjustment_Factor.toFixed(4)}
                  </td>
                  <td className="py-2 text-right tabular">{r.GeoRiskPremium_Pct.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function SensitivityView({
  tornado,
  sensTariff,
  category,
}: {
  tornado: ReturnType<typeof tornadoImpacts>;
  sensTariff: ReturnType<typeof sensitivityGrid>;
  category: string;
}) {
  const tornadoChart = tornado.map((t) => ({
    factor: t.Factor.replace(" (%)", ""),
    downside: t.Downside,
    upside: t.Upside,
    range: t.Range,
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tornado — {category}</CardTitle>
          <CardDescription>
            Low/high swing of average adjusted $/ton around current risk settings
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80 pt-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tornadoChart} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "var(--color-fg-subtle)" }}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
              />
              <YAxis
                type="category"
                dataKey="factor"
                width={150}
                tick={{ fontSize: 11, fill: "var(--color-fg-muted)" }}
              />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="downside" name="Downside vs base" fill="var(--color-chart-5)" radius={[0, 3, 3, 0]} />
              <Bar dataKey="upside" name="Upside vs base" fill="var(--color-primary)" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">One-way sensitivity — Tariff change</CardTitle>
          <CardDescription>Average and end-horizon adjusted $/ton vs tariff %</CardDescription>
        </CardHeader>
        <CardContent className="h-72 pt-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sensTariff} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="Factor_Value"
                tick={{ fontSize: 11, fill: "var(--color-fg-subtle)" }}
                label={{ value: "Tariff %", position: "insideBottom", offset: -2, fontSize: 10 }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-fg-subtle)" }}
                tickFormatter={(v) => `$${v}`}
                width={52}
              />
              <Tooltip content={<ChartTip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="Avg_Adjusted_Price"
                name="Avg adj $/ton"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="End_Adjusted_Price"
                name="End adj $/ton"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-4">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase text-[var(--color-fg-subtle)]">
                <th className="pb-2 pr-2 font-medium">Factor</th>
                <th className="pb-2 pr-2 text-right font-medium">Low $/t</th>
                <th className="pb-2 pr-2 text-right font-medium">High $/t</th>
                <th className="pb-2 pr-2 text-right font-medium">Base $/t</th>
                <th className="pb-2 text-right font-medium">Range</th>
              </tr>
            </thead>
            <tbody>
              {[...tornado].reverse().map((t) => (
                <tr key={t.Factor} className="border-b border-[var(--color-border)]/70">
                  <td className="py-2 pr-2 font-medium">{t.Factor}</td>
                  <td className="py-2 pr-2 text-right tabular">{formatCurrency(t.Low)}</td>
                  <td className="py-2 pr-2 text-right tabular">{formatCurrency(t.High)}</td>
                  <td className="py-2 pr-2 text-right tabular">{formatCurrency(t.Base)}</td>
                  <td className="py-2 text-right tabular font-medium">{formatCurrency(t.Range)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function StateSheetsView({
  sheets,
  onExport,
}: {
  sheets: ReturnType<typeof buildSteelStateSheets>;
  onExport: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">State steel summary sheets</h3>
          <p className="text-sm text-[var(--color-fg-muted)]">
            VP Sales / Marketing handoff packs — demand score, PEMB focus categories, risk-adjusted steel
            outlook, and rep talking points. Printable cards; export multi-sheet Excel for the field.
          </p>
        </div>
        <Button type="button" size="sm" onClick={onExport} className="gap-1.5">
          <Download className="size-3.5" />
          Export all state sheets
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-2">
        {sheets.map((s) => (
          <Card key={s.code} className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">
                    {s.name}{" "}
                    <span className="text-sm font-medium text-[var(--color-fg-subtle)]">{s.code}</span>
                  </CardTitle>
                  <CardDescription className="capitalize">{s.region} · demand {s.demand}</CardDescription>
                </div>
                <Badge
                  variant={
                    s.riskLevel === "Elevated"
                      ? "danger"
                      : s.riskLevel === "Moderate"
                        ? "warn"
                        : "success"
                  }
                >
                  {s.riskLevel}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3 pt-0">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg)] px-2 py-1.5">
                  <p className="text-[var(--color-fg-subtle)]">PEMB share</p>
                  <p className="font-semibold tabular">{Math.round(s.pembShare * 100)}%</p>
                </div>
                <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg)] px-2 py-1.5">
                  <p className="text-[var(--color-fg-subtle)]">Overall adj $/t</p>
                  <p className="font-semibold tabular">{formatCurrency(s.overallAdjPrice)}</p>
                </div>
                <div className="col-span-2 rounded-[var(--radius-sm)] bg-[var(--color-bg)] px-2 py-1.5">
                  <p className="text-[var(--color-fg-subtle)]">Avg risk uplift</p>
                  <p className="font-semibold tabular">
                    {s.avgUplift >= 0 ? "+" : ""}
                    {s.avgUplift.toFixed(2)}%
                  </p>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-fg-subtle)]">
                  Focus PEMB categories
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {s.focusCategories.map((c) => (
                    <Badge key={c} variant="secondary" className="text-[10px]">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-fg-subtle)]">
                  Talking points
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-[var(--color-fg-muted)]">
                  {s.talkingPoints.slice(0, 4).map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                  Recommended action
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-fg)]">{s.recommendedAction}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ExportView({
  onExcel,
  onPdf,
  onCsv,
  onStatePack,
  category,
  modelSource,
}: {
  onExcel: () => void;
  onPdf: () => void;
  onCsv: () => void;
  onStatePack: () => void;
  category: string;
  modelSource: string;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="size-4" />
            Executive export
          </CardTitle>
          <CardDescription>
            Focus category: <strong className="text-[var(--color-fg)]">{category}</strong> · Source:{" "}
            {modelSource}. Files use Ascent branding tokens (red/black) and include methodology footnotes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pt-0">
          <Button type="button" onClick={onExcel} className="gap-1.5">
            <Download className="size-3.5" />
            Excel workbook
          </Button>
          <Button type="button" variant="secondary" onClick={onPdf} className="gap-1.5">
            <Download className="size-3.5" />
            PDF executive brief
          </Button>
          <Button type="button" variant="secondary" onClick={onCsv} className="gap-1.5">
            <Download className="size-3.5" />
            CSV detail
          </Button>
          <Button type="button" variant="secondary" onClick={onStatePack} className="gap-1.5">
            <Download className="size-3.5" />
            State sheets pack (Excel)
          </Button>
        </CardContent>
      </Card>
      <p className="text-[11px] text-[var(--color-fg-subtle)]">
        Excel includes Executive Summary, Category Forecast, Full Forecast Detail, and Base/Adjusted wide
        pivots. PDF is landscape executive format with risk settings + focus table. State pack is a
        multi-sheet workbook for VP → regional rep distribution.
      </p>
    </div>
  );
}
