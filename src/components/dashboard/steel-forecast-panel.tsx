import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
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
  DEFAULT_STEEL_ALERT_THRESHOLDS,
  PEMB_DIV13_TAG,
  SAMPLE_STEEL_ROWS,
  applyLiveFeedBias,
  availableCategories,
  cloneRisks,
  countAlertsBySeverity,
  evaluateSteelAlerts,
  maxRiskCategory,
  parseExcelMatrix,
  pembCostImpact,
  regenerateForecast,
  sensitivityGrid,
  summaryMetrics,
  tornadoImpacts,
  type RiskFactors,
  type SteelAdjustedRow,
  type SteelAlertThresholds,
  type SteelBaseRow,
  type SteelPriceAlert,
} from "@/data/steel-forecast";
import { buildSteelStateSheets } from "@/data/steel-state-sheets";
import {
  downloadSteelCsv,
  downloadSteelPdf,
  exportSteelForecastWorkbook,
} from "@/lib/steel-export";
import { useConstructionFeeds } from "@/hooks/use-construction-feeds";
import { formatCurrency, cn } from "@/lib/utils";
import {
  AlertTriangle,
  Bell,
  BellOff,
  ChevronDown,
  Download,
  Factory,
  FileSpreadsheet,
  Flame,
  Loader2,
  Radio,
  RefreshCw,
  RotateCcw,
  Upload,
  Layers,
} from "lucide-react";

const ALERT_THRESHOLDS_KEY = "ascent-steel-alert-thresholds-v1";

function loadAlertThresholds(): SteelAlertThresholds {
  if (typeof window === "undefined") return { ...DEFAULT_STEEL_ALERT_THRESHOLDS };
  try {
    const raw = localStorage.getItem(ALERT_THRESHOLDS_KEY);
    if (!raw) return { ...DEFAULT_STEEL_ALERT_THRESHOLDS };
    const p = JSON.parse(raw) as Partial<SteelAlertThresholds>;
    return { ...DEFAULT_STEEL_ALERT_THRESHOLDS, ...p };
  } catch {
    return { ...DEFAULT_STEEL_ALERT_THRESHOLDS };
  }
}

function saveAlertThresholds(t: SteelAlertThresholds) {
  try {
    localStorage.setItem(ALERT_THRESHOLDS_KEY, JSON.stringify(t));
  } catch {
    /* ignore */
  }
}

type SteelView = "overview" | "deep" | "sensitivity" | "export" | "states";

const VIEWS: { id: SteelView; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "deep", label: "Category deep dive" },
  { id: "sensitivity", label: "Sensitivity" },
  { id: "states", label: "State steel sheets" },
  { id: "export", label: "Export" },
];

type PathPoint = {
  month: string;
  base: number;
  adjusted: number;
  mom: number;
  adjMom: number;
  uplift: number;
  geo: number;
};

function categoryPath(rows: SteelAdjustedRow[], cat: string): PathPoint[] {
  return rows
    .filter((r) => r.Category === cat)
    .sort((a, b) => a.Date.localeCompare(b.Date))
    .map((r) => ({
      month: r.Month,
      base: r.Base_Price_per_Ton,
      adjusted: r.Adjusted_Price_per_Ton,
      mom: r.MoM_Pct,
      adjMom: r.Adj_MoM_Pct,
      uplift: r.Risk_Uplift_Pct,
      geo: r.GeoRiskPremium_Pct,
    }));
}

const EXEC_ALERT_CATS = ["Overall", "TNFAB", "TNFAB2nd"];

function sortExecAlerts(alerts: SteelPriceAlert[]): SteelPriceAlert[] {
  return [...alerts].sort((a, b) => {
    const rank = { critical: 0, watch: 1, info: 2 };
    const sr = rank[a.severity] - rank[b.severity];
    if (sr !== 0) return sr;
    const pa = EXEC_ALERT_CATS.indexOf(a.category);
    const pb = EXEC_ALERT_CATS.indexOf(b.category);
    const ia = pa === -1 ? 50 : pa;
    const ib = pb === -1 ? 50 : pb;
    if (ia !== ib) return ia - ib;
    return a.category.localeCompare(b.category);
  });
}

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
  const base = payload.find((e) => e.dataKey === "base");
  const adj = payload.find((e) => e.dataKey === "adjusted");
  const upliftRow = payload.find((e) => e.dataKey === "uplift");
  const uplift =
    upliftRow != null
      ? Number(upliftRow.value)
      : base && adj && Number(base.value) > 0
        ? ((Number(adj.value) - Number(base.value)) / Number(base.value)) * 100
        : null;
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 shadow-[var(--shadow-md)]">
      <p className="mb-1 text-xs font-medium">{label}</p>
      {payload
        .filter((e) => e.dataKey !== "uplift")
        .map((e) => (
          <div key={e.dataKey} className="flex justify-between gap-6 text-xs">
            <span className="text-[var(--color-fg-muted)]">{e.name}</span>
            <span className="tabular font-medium">
              {e.dataKey.toLowerCase().includes("mom")
                ? `${Number(e.value).toFixed(2)}%`
                : formatCurrency(Number(e.value))}
            </span>
          </div>
        ))}
      {uplift != null && Number.isFinite(uplift) && (
        <div className="mt-1 flex justify-between gap-6 border-t border-[var(--color-border)] pt-1 text-xs">
          <span className="text-[var(--color-fg-muted)]">Uplift</span>
          <span className="tabular font-medium">
            {uplift >= 0 ? "+" : ""}
            {uplift.toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  );
}

export function SteelForecastPanel() {
  const [baseRows, setBaseRows] = useState<SteelBaseRow[]>(SAMPLE_STEEL_ROWS);
  const [modelSource, setModelSource] = useState("Sample (5-1-2026 pattern)");
  const [draftRisks, setDraftRisks] = useState<RiskFactors>(() => cloneRisks(BASELINE));
  const [category, setCategory] = useState("Overall");
  const [view, setView] = useState<SteelView>("overview");
  const [liveBias, setLiveBias] = useState(true);
  const [tnfabSeriesId, setTnfabSeriesId] = useState<"TNFAB" | "TNFAB2nd">("TNFAB");
  const [passThrough, setPassThrough] = useState(0.72);
  const [tonsPerJob, setTonsPerJob] = useState(85);
  const [alertThresholds, setAlertThresholds] = useState<SteelAlertThresholds>(loadAlertThresholds);
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const notifiedIds = useRef<Set<string>>(new Set());
  const { data: feeds, loading: feedsLoading, refresh: refreshFeeds } = useConstructionFeeds(true);

  const biasOn = liveBias && feeds.live && Number.isFinite(feeds.signal.compositeIndex);
  const effectiveRisks = useMemo(
    () => applyLiveFeedBias(draftRisks, feeds.signal.compositeIndex, biasOn),
    [draftRisks, feeds.signal.compositeIndex, biasOn],
  );

  const adjusted = useMemo(
    () => regenerateForecast(baseRows, effectiveRisks, true),
    [baseRows, effectiveRisks],
  );

  const cats = useMemo(() => availableCategories(baseRows), [baseRows]);
  const overallMetrics = useMemo(() => summaryMetrics(adjusted, "Overall"), [adjusted]);
  const tnfabMetrics = useMemo(() => summaryMetrics(adjusted, tnfabSeriesId), [adjusted, tnfabSeriesId]);
  const tnfabPrimaryMetrics = useMemo(() => summaryMetrics(adjusted, "TNFAB"), [adjusted]);
  const hottest = useMemo(() => maxRiskCategory(adjusted), [adjusted]);
  const stateSheets = useMemo(() => buildSteelStateSheets(adjusted), [adjusted]);

  const pembImpact = useMemo(() => {
    if (!overallMetrics) return null;
    return pembCostImpact(overallMetrics.avg_price, overallMetrics.avg_adj, {
      passThroughPct: passThrough,
      tonsPerProject: tonsPerJob,
    });
  }, [overallMetrics, passThrough, tonsPerJob]);

  const priceAlerts = useMemo(
    () =>
      sortExecAlerts(
        evaluateSteelAlerts(adjusted, effectiveRisks, {
          thresholds: alertThresholds,
          pembImpact,
        }),
      ),
    [adjusted, effectiveRisks, alertThresholds, pembImpact],
  );

  /** Categories with base-vs-adjusted alerts (for category chips) */
  const alertCats = useMemo(
    () =>
      priceAlerts
        .filter((a) => a.metric === "base_vs_adjusted")
        .map((a) => a.category),
    [priceAlerts],
  );

  const alertCounts = useMemo(() => countAlertsBySeverity(priceAlerts), [priceAlerts]);

  // Browser notification for new critical alerts (once per id per session)
  useEffect(() => {
    if (notifPermission !== "granted") return;
    if (typeof Notification === "undefined") return;
    const critical = priceAlerts.filter((a) => a.severity === "critical");
    const fresh = critical.filter((a) => !notifiedIds.current.has(a.id));
    if (fresh.length === 0) return;
    const first = fresh[0]!;
    try {
      new Notification("Ascent Steel Alert", {
        body: first.message,
        tag: "ascent-steel-critical",
        icon: "/icons/icon-192.png",
      });
      for (const a of fresh) notifiedIds.current.add(a.id);
    } catch {
      /* ignore */
    }
  }, [priceAlerts, notifPermission]);

  function patchAlertThresholds(partial: Partial<SteelAlertThresholds>) {
    setAlertThresholds((prev) => {
      const next = { ...prev, ...partial };
      saveAlertThresholds(next);
      return next;
    });
  }

  async function enableBrowserAlerts() {
    if (typeof Notification === "undefined") {
      setNotifPermission("unsupported");
      return;
    }
    const p = await Notification.requestPermission();
    setNotifPermission(p);
  }

  const catSeries = useMemo(() => categoryPath(adjusted, category), [adjusted, category]);
  const overallSeries = useMemo(() => categoryPath(adjusted, "Overall"), [adjusted]);
  const tnfabSeries = useMemo(() => categoryPath(adjusted, tnfabSeriesId), [adjusted, tnfabSeriesId]);

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

  const restoreBaseline = () => {
    setDraftRisks(cloneRisks(BASELINE));
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[var(--color-primary)]">
            <Flame className="size-3.5" />
            Steel cost forecast
          </div>
          <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Overall + TNFAB — 2-year path
          </h2>
          <div className="mt-1 flex max-w-2xl flex-wrap items-center gap-2 text-sm text-[var(--color-fg-muted)]">
            <span>
              24-month Base vs Risk-Adjusted $/ton for plant and board review. PEMB / CSI Division 13 mix
              (plates, beams, HSS, TNFAB). Offline sample always loads; construction-feed bias when live.
            </span>
            <Badge variant="secondary">{PEMB_DIV13_TAG}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={biasOn ? "success" : "outline"} className="gap-1" title={feeds.signal.narrative}>
            <Radio className="size-3" />
            {biasOn
              ? `Live market bias · ${feeds.signal.compositeIndex.toFixed(0)}`
              : feeds.live
                ? "Feeds live · bias off"
                : "Using baseline sample forecast"}
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={feedsLoading}
            onClick={() => void refreshFeeds()}
          >
            {feedsLoading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Refresh
          </Button>
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
        {biasOn ? (
          <>
            {" "}
            · Live FRED/BLS bias on geo / demand vol (composite {feeds.signal.compositeIndex.toFixed(1)}
            {feeds.signal.materialsPressure != null
              ? ` · materials MoM ${feeds.signal.materialsPressure >= 0 ? "+" : ""}${feeds.signal.materialsPressure.toFixed(2)}%`
              : ""}
            ). Not mill spot prices.
          </>
        ) : (
          <> · Using baseline sample forecast — page stays populated offline.</>
        )}
      </p>

      {/* Controls */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Risk controls</CardTitle>
          <CardDescription>
            Sliders update the 24-month Adjusted path and ±{(ALERT_THRESHOLD * 100).toFixed(0)}% / ±
            6% alerts immediately. Watch ≥3% Base vs Adjusted; critical ≥6%.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {view !== "overview" && (
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
                  {alertCats.includes(c) && (
                    <AlertTriangle className="ml-1 size-3 text-[var(--color-warn)]" />
                  )}
                </Button>
              ))}
            </div>
          )}

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
            <Button type="button" size="sm" variant="secondary" onClick={restoreBaseline}>
              <RotateCcw className="size-3.5" />
              Restore baseline
            </Button>
            <ToggleChip
              active={liveBias}
              onClick={() => setLiveBias((v) => !v)}
              label={biasOn ? "Live market bias on" : "Live market bias"}
            />
          </div>
        </CardContent>
      </Card>

      {/* Steel price alerts board */}
      <SteelAlertsBoard
        alerts={priceAlerts}
        counts={alertCounts}
        thresholds={alertThresholds}
        showSettings={showAlertSettings}
        onToggleSettings={() => setShowAlertSettings((v) => !v)}
        onPatchThresholds={patchAlertThresholds}
        onResetThresholds={() => {
          const d = { ...DEFAULT_STEEL_ALERT_THRESHOLDS };
          setAlertThresholds(d);
          saveAlertThresholds(d);
        }}
        notifPermission={notifPermission}
        onEnableNotifications={() => void enableBrowserAlerts()}
      />

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
          overallMetrics={overallMetrics}
          tnfabMetrics={tnfabMetrics}
          tnfabPrimaryMetrics={tnfabPrimaryMetrics}
          hottest={hottest}
          overallSeries={overallSeries}
          tnfabSeries={tnfabSeries}
          tnfabSeriesId={tnfabSeriesId}
          onTnfabSeriesId={setTnfabSeriesId}
          hasTnfab2nd={cats.includes("TNFAB2nd")}
          multiCatCompare={multiCatCompare}
          pembImpact={pembImpact}
          passThrough={passThrough}
          tonsPerJob={tonsPerJob}
          onPassThrough={setPassThrough}
          onTons={setTonsPerJob}
          priceAlerts={priceAlerts}
        />
      )}
      {view === "deep" && <DeepDiveView rows={adjusted} category={category} series={catSeries} />}
      {view === "sensitivity" && (
        <SensitivityView tornado={tornado} sensTariff={sensTariff} category={category} />
      )}
      {view === "states" && (
        <StateSheetsView
          sheets={stateSheets}
          onExport={() =>
            void exportSteelForecastWorkbook({
              forecastRows: adjusted,
              risks: effectiveRisks,
              stateSummaries: stateSheets,
              focusCategory: category,
              modelSource,
              alerts: priceAlerts,
            })
          }
        />
      )}
      {view === "export" && (
        <ExportView
          onExcel={() =>
            void exportSteelForecastWorkbook({
              forecastRows: adjusted,
              risks: effectiveRisks,
              stateSummaries: stateSheets,
              focusCategory: category,
              modelSource,
              alerts: priceAlerts,
            })
          }
          onPdf={() => downloadSteelPdf(adjusted, effectiveRisks, category, modelSource)}
          onCsv={() => downloadSteelCsv(adjusted, category)}
          onStatePack={() =>
            void exportSteelForecastWorkbook({
              forecastRows: adjusted,
              risks: effectiveRisks,
              stateSummaries: stateSheets,
              focusCategory: category,
              modelSource,
              alerts: priceAlerts,
            })
          }
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

function PathSummaryCard({
  title,
  metrics,
  flagged,
  severity,
}: {
  title: string;
  metrics: ReturnType<typeof summaryMetrics>;
  flagged?: boolean;
  severity?: SteelPriceAlert["severity"];
}) {
  return (
    <Card
      className={cn(
        flagged && severity === "critical" && "border-[var(--color-danger)]/35",
        flagged && severity === "watch" && "border-[var(--color-warn)]/40",
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span>{title} · 24-month review</span>
          {flagged && (
            <Badge variant={severity === "critical" ? "danger" : "warn"}>
              {severity === "critical" ? "≥6%" : "≥3%"}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Base end vs adjusted end · avg uplift · adj range</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 pt-0 sm:grid-cols-4">
        <div>
          <p className="text-[11px] text-[var(--color-fg-subtle)]">Base end</p>
          <p className="font-display text-lg font-semibold tabular">
            {metrics ? formatCurrency(metrics.end_price) : "—"}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-[var(--color-fg-subtle)]">Adjusted end</p>
          <p className="font-display text-lg font-semibold tabular">
            {metrics ? formatCurrency(metrics.end_adj) : "—"}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-[var(--color-fg-subtle)]">Avg uplift</p>
          <p className="font-display text-lg font-semibold tabular">
            {metrics
              ? `${metrics.avg_uplift >= 0 ? "+" : ""}${metrics.avg_uplift.toFixed(2)}%`
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-[var(--color-fg-subtle)]">Adj min / max</p>
          <p className="font-display text-lg font-semibold tabular">
            {metrics ? `${formatCurrency(metrics.min_adj)}–${formatCurrency(metrics.max_adj)}` : "—"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function PathChart({
  title,
  description,
  data,
  fillId,
}: {
  title: string;
  description: string;
  data: PathPoint[];
  fillId: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-64 pt-0 sm:h-80">
        {data.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-[var(--color-fg-muted)]">
            No path for this category in the sample.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c8102e" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#c8102e" stopOpacity={0} />
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
                stroke="#c8102e"
                strokeWidth={2.5}
                fill={`url(#${fillId})`}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function SteelAlertsBoard({
  alerts,
  counts,
  thresholds,
  showSettings,
  onToggleSettings,
  onPatchThresholds,
  onResetThresholds,
  notifPermission,
  onEnableNotifications,
}: {
  alerts: SteelPriceAlert[];
  counts: { critical: number; watch: number; info: number };
  thresholds: SteelAlertThresholds;
  showSettings: boolean;
  onToggleSettings: () => void;
  onPatchThresholds: (p: Partial<SteelAlertThresholds>) => void;
  onResetThresholds: () => void;
  notifPermission: NotificationPermission | "unsupported";
  onEnableNotifications: () => void;
}) {
  return (
    <Card
      className={cn(
        counts.critical > 0 && "border-[var(--color-danger)]/35",
        counts.critical === 0 && counts.watch > 0 && "border-[var(--color-warn)]/40",
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle
                className={cn(
                  "size-4",
                  counts.critical > 0
                    ? "text-[var(--color-danger)]"
                    : counts.watch > 0
                      ? "text-[var(--color-warn)]"
                      : "text-[var(--color-fg-subtle)]",
                )}
              />
              Steel price alerts
            </CardTitle>
            <CardDescription>
              Watch / critical thresholds on Base vs Adjusted, MoM spikes, 6-mo horizon, and PEMB margin drag.
              Advisory for production & sales — not auto-pricing.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {counts.critical > 0 && (
              <Badge variant="danger" className="tabular">
                {counts.critical} critical
              </Badge>
            )}
            {counts.watch > 0 && (
              <Badge variant="warn" className="tabular">
                {counts.watch} watch
              </Badge>
            )}
            {alerts.length === 0 && <Badge variant="secondary">No alerts</Badge>}
            <Button type="button" size="sm" variant="secondary" className="h-8 gap-1" onClick={onToggleSettings}>
              <ChevronDown className={cn("size-3.5 transition-transform", showSettings && "rotate-180")} />
              Alert settings
            </Button>
            {notifPermission !== "unsupported" && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 gap-1"
                onClick={onEnableNotifications}
                disabled={notifPermission === "granted"}
              >
                {notifPermission === "granted" ? (
                  <Bell className="size-3.5 text-[var(--color-success)]" />
                ) : (
                  <BellOff className="size-3.5" />
                )}
                {notifPermission === "granted" ? "Browser alerts on" : "Enable browser alerts"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {alerts.length === 0 ? (
          <p className="rounded-[var(--radius-sm)] bg-[var(--color-bg)] px-3 py-3 text-sm text-[var(--color-fg-muted)]">
            No steel price alerts at current risk settings.
          </p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((a) => (
              <li
                key={a.id}
                className={cn(
                  "rounded-[var(--radius-md)] border px-3 py-2.5 text-sm",
                  a.severity === "critical" &&
                    "border-[var(--color-danger)]/25 bg-[var(--color-danger-soft)]/60",
                  a.severity === "watch" && "border-[var(--color-warn)]/30 bg-[var(--color-warn-soft)]/50",
                  a.severity === "info" && "border-[var(--color-border)] bg-[var(--color-bg)]",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      a.severity === "critical" ? "danger" : a.severity === "watch" ? "warn" : "secondary"
                    }
                    className="capitalize"
                  >
                    {a.severity}
                  </Badge>
                  <span className="text-xs font-medium text-[var(--color-fg-subtle)]">{a.category}</span>
                  <span className="text-[10px] uppercase tracking-wide text-[var(--color-fg-subtle)]">
                    {a.metric.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="mt-1 font-medium text-[var(--color-fg)]">{a.message}</p>
                <p className="mt-0.5 text-[11px] tabular text-[var(--color-fg-subtle)]">
                  Value {formatAlertValue(a)} · threshold {formatAlertThreshold(a)}
                </p>
              </li>
            ))}
          </ul>
        )}

        {showSettings && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
            <p className="mb-2 text-xs font-semibold text-[var(--color-fg)]">
              Thresholds (saved in this browser)
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ThreshField
                label="Base vs adj watch (%)"
                value={thresholds.baseVsAdj * 100}
                onChange={(v) => onPatchThresholds({ baseVsAdj: v / 100 })}
              />
              <ThreshField
                label="Base vs adj critical (%)"
                value={thresholds.baseVsAdjCritical * 100}
                onChange={(v) => onPatchThresholds({ baseVsAdjCritical: v / 100 })}
              />
              <ThreshField
                label="MoM spike (|%|)"
                value={thresholds.mom}
                onChange={(v) => onPatchThresholds({ mom: v })}
              />
              <ThreshField
                label="6-mo horizon uplift (%)"
                value={thresholds.horizon * 100}
                onChange={(v) => onPatchThresholds({ horizon: v / 100 })}
              />
              <ThreshField
                label="PEMB $ drag"
                value={thresholds.pembDollars}
                onChange={(v) => onPatchThresholds({ pembDollars: v })}
                step={500}
              />
              <ThreshField
                label="PEMB GM pts"
                value={thresholds.pembPts}
                onChange={(v) => onPatchThresholds({ pembPts: v })}
                step={0.1}
              />
            </div>
            <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={onResetThresholds}>
              Reset to defaults
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ThreshField({
  label,
  value,
  onChange,
  step = 0.5,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="block text-xs text-[var(--color-fg-subtle)]">
      {label}
      <input
        type="number"
        step={step}
        className="mt-1 h-8 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-2 text-sm tabular"
        value={Number.isInteger(step) ? value : Math.round(value * 100) / 100}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function formatAlertValue(a: SteelPriceAlert): string {
  if (a.metric === "base_vs_adjusted" || a.metric === "horizon_high") {
    return `${(a.value * 100).toFixed(1)}%`;
  }
  if (a.metric === "mom_spike") return `${a.value.toFixed(2)}%`;
  if (a.metric === "pemb_margin") return formatCurrency(a.value);
  return String(a.value);
}

function formatAlertThreshold(a: SteelPriceAlert): string {
  if (a.metric === "base_vs_adjusted" || a.metric === "horizon_high") {
    return `±${(a.threshold * 100).toFixed(1)}%`;
  }
  if (a.metric === "mom_spike") return `±${a.threshold.toFixed(1)}%`;
  if (a.metric === "pemb_margin") return formatCurrency(a.threshold);
  return String(a.threshold);
}

function OverviewView({
  overallMetrics,
  tnfabMetrics,
  tnfabPrimaryMetrics,
  hottest,
  overallSeries,
  tnfabSeries,
  tnfabSeriesId,
  onTnfabSeriesId,
  hasTnfab2nd,
  multiCatCompare,
  pembImpact,
  passThrough,
  tonsPerJob,
  onPassThrough,
  onTons,
  priceAlerts,
}: {
  overallMetrics: ReturnType<typeof summaryMetrics>;
  tnfabMetrics: ReturnType<typeof summaryMetrics>;
  tnfabPrimaryMetrics: ReturnType<typeof summaryMetrics>;
  hottest: { category: string; uplift: number };
  overallSeries: PathPoint[];
  tnfabSeries: PathPoint[];
  tnfabSeriesId: "TNFAB" | "TNFAB2nd";
  onTnfabSeriesId: (id: "TNFAB" | "TNFAB2nd") => void;
  hasTnfab2nd: boolean;
  multiCatCompare: Array<{ category: string; full: string; base: number; adjusted: number }>;
  pembImpact: ReturnType<typeof pembCostImpact> | null;
  passThrough: number;
  tonsPerJob: number;
  onPassThrough: (v: number) => void;
  onTons: (v: number) => void;
  priceAlerts: SteelPriceAlert[];
}) {
  const watchStrip = priceAlerts.filter((a) => a.metric === "base_vs_adjusted").slice(0, 8);
  const overallBreach = priceAlerts.find((a) => a.category === "Overall" && a.metric === "base_vs_adjusted");
  const tnfabBreach = priceAlerts.find((a) => a.category === "TNFAB" && a.metric === "base_vs_adjusted");

  return (
    <div className="space-y-4">
      {priceAlerts.length > 0 && (
        <div className="hidden print:block">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
            Active steel alerts
          </p>
          <ul className="mt-1 list-disc pl-4 text-xs">
            {priceAlerts.map((a) => (
              <li key={a.id}>
                [{a.severity}] {a.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {watchStrip.length > 0 && (
        <div className="flex flex-wrap gap-2 print:hidden">
          {watchStrip.map((a) => (
            <span
              key={a.id}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]",
                a.severity === "critical"
                  ? "border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] text-[var(--color-danger)]"
                  : "border-[var(--color-warn)]/30 bg-[var(--color-warn-soft)] text-[var(--color-warn)]",
                (a.category === "Overall" || a.category === "TNFAB") && "font-semibold",
              )}
              title={a.message}
            >
              <AlertTriangle className="size-3" />
              {a.category} {a.value >= 0 ? "+" : ""}
              {(a.value * 100).toFixed(1)}%
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard
          label="Overall start → end (base)"
          value={overallMetrics ? formatCurrency(overallMetrics.end_price) : "—"}
          sub={
            overallMetrics
              ? `${formatCurrency(overallMetrics.start_price)} start · avg ${formatCurrency(overallMetrics.avg_price)}`
              : undefined
          }
        />
        <MetricCard
          label="Overall adj $/ton"
          value={overallMetrics ? formatCurrency(overallMetrics.end_adj) : "—"}
          sub={
            overallMetrics
              ? `Avg ${formatCurrency(overallMetrics.avg_adj)} · ${overallMetrics.horizon_uplift_pct >= 0 ? "+" : ""}${overallMetrics.horizon_uplift_pct.toFixed(1)}% vs start`
              : undefined
          }
          accent
        />
        <MetricCard
          label="TNFAB start → end (base)"
          value={tnfabPrimaryMetrics ? formatCurrency(tnfabPrimaryMetrics.end_price) : "—"}
          sub={
            tnfabPrimaryMetrics
              ? `${formatCurrency(tnfabPrimaryMetrics.start_price)} start · avg ${formatCurrency(tnfabPrimaryMetrics.avg_price)}`
              : undefined
          }
        />
        <MetricCard
          label="TNFAB adj $/ton"
          value={tnfabPrimaryMetrics ? formatCurrency(tnfabPrimaryMetrics.end_adj) : "—"}
          sub={
            tnfabPrimaryMetrics
              ? `Avg ${formatCurrency(tnfabPrimaryMetrics.avg_adj)} · ${tnfabPrimaryMetrics.avg_uplift >= 0 ? "+" : ""}${tnfabPrimaryMetrics.avg_uplift.toFixed(2)}% uplift`
              : undefined
          }
        />
        <MetricCard
          label="Horizon uplift"
          value={
            overallMetrics
              ? `${overallMetrics.horizon_uplift_pct >= 0 ? "+" : ""}${overallMetrics.horizon_uplift_pct.toFixed(1)}%`
              : "—"
          }
          sub={
            hottest.category
              ? `Hottest: ${hottest.category} ${hottest.uplift >= 0 ? "+" : ""}${hottest.uplift.toFixed(2)}%`
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <PathSummaryCard
          title="Overall"
          metrics={overallMetrics}
          flagged={Boolean(overallBreach)}
          severity={overallBreach?.severity}
        />
        <PathSummaryCard
          title={tnfabSeriesId}
          metrics={tnfabMetrics}
          flagged={Boolean(tnfabBreach) && tnfabSeriesId === "TNFAB"}
          severity={tnfabBreach?.severity}
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PathChart title="Overall — 2-year path" description="Base vs risk-adjusted $/ton · 24 months" data={overallSeries} fillId="steelAdjFillOverall" />
        <div className="space-y-2">
          {hasTnfab2nd && (
            <div className="flex justify-end gap-1.5 print:hidden">
              {(["TNFAB", "TNFAB2nd"] as const).map((id) => (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={tnfabSeriesId === id ? "default" : "secondary"}
                  className="h-8 rounded-full text-xs"
                  onClick={() => onTnfabSeriesId(id)}
                >
                  {id}
                </Button>
              ))}
            </div>
          )}
          <PathChart
            title={`${tnfabSeriesId} — 2-year path`}
            description="Same 24-month horizon · PEMB fab mix"
            data={tnfabSeries}
            fillId="steelAdjFillTnfab"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overall MoM %</CardTitle>
          <CardDescription>Base month-over-month (bars) vs adjusted MoM</CardDescription>
        </CardHeader>
        <CardContent className="h-56 pt-0 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={overallSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
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
            Excel workbook (ExcelJS)
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
            Full pack (forecast + states)
          </Button>
        </CardContent>
      </Card>
      <p className="text-[11px] text-[var(--color-fg-subtle)]">
        ExcelJS multi-sheet pack: Cover/Methodology · Overview (Base vs Adjusted) · All Categories · per-category
        sheets · Sensitivity/Tornado · State Summaries · one sheet per territory state. Headers use Ascent red
        (#c8102e), freeze panes, currency/percent formats, risk-uplift highlighting. Offline client-side only.
      </p>
    </div>
  );
}
