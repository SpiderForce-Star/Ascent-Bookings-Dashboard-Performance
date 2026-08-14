import { useMemo, useState } from "react";
import {
  Bar,
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
import {
  EGM_FLOOR,
  KIND_SHORT,
  SHIPMENT_AS_OF,
  SHIPMENT_FORWARD,
  SHIPMENT_NOTES,
  SHIPMENT_SOURCE,
  computeShipmentMetrics,
  coHygieneReport,
  egmBandBreakdown,
  egmBsrHeat,
  egmRegionHeat,
  egmStateHeat,
  filterShipmentJobs,
  jobCycleDays,
  longCycleJobs,
  lowEgmJobs,
  mixBreakdown,
  mixGrandTotal,
  shipmentChartSeries,
  topCustomers,
  topStates,
  type EgmHeatCell,
  type JobKind,
  type MixRow,
  type ShipmentJob,
  type ShipmentJobFilter,
} from "@/data/shipments";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { AlertTriangle, ClipboardList, Factory, Target, Truck, X } from "lucide-react";

function Tip({
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
            {e.dataKey === "egmPct" ? `${Number(e.value).toFixed(1)}%` : formatCurrency(Number(e.value))}
          </span>
        </div>
      ))}
    </div>
  );
}

type View = "overview" | "jobs";

/** Compact booked vs shipped for the Performance tab. */
export function BookedShippedStrip() {
  const m = useMemo(() => computeShipmentMetrics(), []);
  const series = useMemo(() => shipmentChartSeries(), []);
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="size-4 text-[var(--color-primary)]" />
              Booked vs shipped
            </CardTitle>
            <CardDescription>
              Same months, January–July 2026. {formatCurrency(m.dockGap, true)} still in the plant vs bookings.
              EGM {(m.egmPct * 100).toFixed(1)}% estimated.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-52 pt-0 sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="key" tick={{ fontSize: 10, fill: "var(--color-fg-subtle)" }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--color-fg-subtle)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatCurrency(v, true)}
              width={48}
            />
            <Tooltip content={<Tip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
            <Bar dataKey="booked" name="Booked" fill="var(--color-chart-3)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="shipped" name="Shipped" fill="#c8102e" radius={[3, 3, 0, 0]} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ShipmentsPanel() {
  const [view, setView] = useState<View>("overview");
  const [filter, setFilter] = useState<ShipmentJobFilter | null>(null);
  const m = useMemo(() => computeShipmentMetrics(), []);
  const series = useMemo(() => shipmentChartSeries(), []);
  const mix = useMemo(() => mixBreakdown(), []);
  const mixGrand = useMemo(() => mixGrandTotal(mix), [mix]);
  const customers = useMemo(() => topCustomers(10), []);
  const states = useMemo(() => topStates(10), []);
  const low = useMemo(() => lowEgmJobs(20, 12), []);
  const long = useMemo(() => longCycleJobs(10), []);
  const bands = useMemo(() => egmBandBreakdown(), []);
  const regions = useMemo(() => egmRegionHeat(), []);
  const heat = useMemo(() => egmStateHeat(), []);
  const bsrs = useMemo(() => egmBsrHeat(), []);
  const hygiene = useMemo(() => coHygieneReport(10), []);
  const filteredJobs = useMemo(() => (filter ? filterShipmentJobs(filter, 40) : []), [filter]);
  const filteredTotal = useMemo(() => {
    if (!filter) return { count: 0, revenue: 0 };
    const all = filterShipmentJobs(filter);
    return { count: all.length, revenue: all.reduce((s, j) => s + j.revenue, 0) };
  }, [filter]);
  const calendar = SHIPMENT_FORWARD.filter((f) => f.monthIndex >= 7);

  function openJobs(next: ShipmentJobFilter) {
    setFilter(next);
    setView("jobs");
  }

  function clearFilter() {
    setFilter(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[var(--color-primary)]">
            <Truck className="size-3.5" />
            Plant shipments
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            January – July 2026
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-fg-muted)]">
            What left the dock — same language as bookings. Orders typically ship in 6–8 weeks; some sit 12
            months or more. EGM is <strong className="font-medium text-[var(--color-fg)]">Estimated Gross Margin</strong>
            , not accounting GM.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">As of {SHIPMENT_AS_OF}</Badge>
          <Badge variant="outline">Closed through July</Badge>
          <Badge variant="outline">25% EGM floor</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Shipped $" value={formatCurrency(m.shipped, true)} hint={`${m.jobCount} job lines`} />
        <Stat label="EGM $" value={formatCurrency(m.egmDollars, true)} hint={`${(m.egmPct * 100).toFixed(1)}% estimated`} />
        <Stat
          label="Vs booked"
          value={formatCurrency(m.dockGap, true)}
          hint={m.dockGap >= 0 ? "still in plant / backlog" : "shipped ahead of bookings"}
          warn={m.dockGap > 0}
        />
        <Stat
          label="Slippage"
          value={formatCurrency(m.slippage, true)}
          hint="Start-month $ that did not close"
          warn={m.slippage > 0}
        />
        <Stat
          label="Deferred loss"
          value={formatCurrency(Math.abs(m.deferredLoss), true)}
          hint="CO / update leakage (EGM proxy)"
          warn={m.deferredLoss < 0}
        />
      </div>
      <p className="text-[11px] text-[var(--color-fg-subtle)]">
        Booked same months {formatCurrency(m.booked, true)} ({(m.bookedGmPct * 100).toFixed(1)}% GM) · freight{" "}
        {formatCurrency(m.freight, true)} · discounts {formatCurrency(m.discounts, true)} · overlapping-month YoY
        shipped {formatPercent(m.growth)}. Source: {SHIPMENT_SOURCE}.
      </p>

      <OrderTypeTotals
        mix={mix}
        grand={mixGrand}
        componentFocus={filter?.kind === "component"}
        onComponents={() => openJobs({ kind: "component" })}
        onKind={(kind) => openJobs({ kind })}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <EgmControlTower
          bands={bands}
          regions={regions}
          heat={heat}
          bsrs={bsrs}
          filter={filter}
          onOpen={openJobs}
        />
        <CoHygieneTile hygiene={hygiene} active={!!filter?.hygiene} onOpen={() => openJobs({ hygiene: true })} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {(
          [
            ["overview", "Overview"],
            ["jobs", "Risk jobs"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={view === id ? "default" : "secondary"}
            className="h-8 rounded-full"
            onClick={() => setView(id)}
          >
            {label}
          </Button>
        ))}
        {filter && (
          <Button type="button" size="sm" variant="outline" className="h-8 rounded-full" onClick={clearFilter}>
            <X className="size-3.5" />
            {filterLabel(filter)} · {filteredTotal.count} jobs · {formatCurrency(filteredTotal.revenue, true)}
          </Button>
        )}
      </div>

      {view === "overview" && (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
            <Card className="xl:col-span-3">
              <CardHeader>
                <CardTitle className="text-base">Booked vs shipped</CardTitle>
                <CardDescription>Sales in the door vs revenue out the door — same months</CardDescription>
              </CardHeader>
              <CardContent className="h-72 pt-0 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="key" tick={{ fontSize: 11, fill: "var(--color-fg-subtle)" }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--color-fg-subtle)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatCurrency(v, true)}
                      width={56}
                    />
                    <Tooltip content={<Tip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                    <Bar dataKey="booked" name="Booked" fill="var(--color-chart-3)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="shipped" name="Shipped" fill="#c8102e" radius={[3, 3, 0, 0]} />
                    <Line type="monotone" dataKey="priorShipped" name="Shipped LY" stroke="var(--color-chart-2)" strokeDasharray="4 3" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Start vs close</CardTitle>
                <CardDescription>
                  Jobs planned at month start vs what actually shipped. Misses often mean the job was not
                  updated or a change order was never issued.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-72 pt-0 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="key" tick={{ fontSize: 11, fill: "var(--color-fg-subtle)" }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--color-fg-subtle)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatCurrency(v, true)}
                      width={56}
                    />
                    <Tooltip content={<Tip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                    <Bar dataKey="startRev" name="Start-month plan" fill="var(--color-chart-3)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="endRev" name="Closed" fill="#c8102e" radius={[3, 3, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {calendar.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">On the ship calendar</CardTitle>
                <CardDescription>
                  Start-month dollars still open — not shipped. Typical cycle 6–8 weeks; some jobs run a year.
                  Confirm the job is current and COs are issued before the month closes.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-0">
                {calendar.map((f) => (
                  <div key={f.month} className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2.5">
                    <p className="text-xs text-[var(--color-fg-subtle)]">{f.month} start-month</p>
                    <p className="font-display text-xl font-semibold tabular">{formatCurrency(f.startRev, true)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-base">Mix</CardTitle>
                  <CardDescription>Building vs component (C) vs insulation · job lines</CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={filter?.kind === "component" ? "default" : "secondary"}
                  className="h-7 rounded-full"
                  onClick={() => openJobs({ kind: "component" })}
                >
                  Components only
                </Button>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {mix.map((row) => (
                  <button
                    key={row.kind}
                    type="button"
                    onClick={() => openJobs({ kind: row.kind })}
                    className={cn(
                      "w-full rounded-[var(--radius-md)] px-2 py-1.5 text-left",
                      row.kind === "component" && "border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]/50",
                      filter?.kind === row.kind && "ring-2 ring-[var(--color-primary)]",
                    )}
                  >
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        {row.label}
                        {row.kind === "component" && (
                          <Badge variant="default" className="text-[10px]">
                            C
                          </Badge>
                        )}
                      </span>
                      <span className="tabular font-medium">{formatCurrency(row.revenue, true)}</span>
                    </div>
                    <p className="text-[11px] text-[var(--color-fg-subtle)]">
                      {row.count} jobs · {formatCurrency(row.egm, true)} EGM · {(row.egmPct * 100).toFixed(1)}%
                    </p>
                  </button>
                ))}
                <div className="flex justify-between border-t border-[var(--color-border-strong)] pt-2 text-sm font-semibold">
                  <span>Grand Total</span>
                  <span className="tabular">{formatCurrency(mixGrand.revenue, true)}</span>
                </div>
                <p className="text-[11px] text-[var(--color-fg-subtle)]">
                  {mixGrand.count} jobs · {formatCurrency(mixGrand.egm, true)} EGM ·{" "}
                  {(mixGrand.egmPct * 100).toFixed(1)}% blended
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top customers</CardTitle>
                <CardDescription>Shipped job $ · JA Street names combined</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto pt-0">
                <table className="w-full text-sm">
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.name} className="border-b border-[var(--color-border)]/60">
                        <td className="py-1.5 pr-2">{c.name}</td>
                        <td className="py-1.5 pr-2 text-right tabular">{formatCurrency(c.revenue, true)}</td>
                        <td className="py-1.5 text-right tabular text-[var(--color-fg-muted)]">
                          {(c.egmPct * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">States</CardTitle>
                <CardDescription>From city on the shipping line</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto pt-0">
                <table className="w-full text-sm">
                  <tbody>
                    {states.map((s) => (
                      <tr key={s.name} className="border-b border-[var(--color-border)]/60">
                        <td className="py-1.5 pr-2 font-medium">{s.name}</td>
                        <td className="py-1.5 pr-2 text-right tabular">{formatCurrency(s.revenue, true)}</td>
                        <td className="py-1.5 text-right tabular text-[var(--color-fg-muted)]">
                          {s.count} · {(s.egmPct * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {view === "jobs" && filter && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4 text-[var(--color-primary)]" />
              {filterLabel(filter)}
            </CardTitle>
            <CardDescription>
              {filteredTotal.count} closed-month jobs · {formatCurrency(filteredTotal.revenue, true)} shipped.
              {filteredJobs.length < filteredTotal.count
                ? ` Showing the ${filteredJobs.length} largest.`
                : ""}{" "}
              Click a band, state, BSR, or the hygiene tile to change the list.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto pt-0">
            <JobTable jobs={filteredJobs} showMeta />
          </CardContent>
        </Card>
      )}

      {view === "jobs" && !filter && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="size-4 text-[var(--color-warn)]" />
                Low EGM (&lt;20%)
              </CardTitle>
              <CardDescription>
                Pricing, scope, or a change order that was never written. Review before the next close.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto pt-0">
              <JobTable jobs={low} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Factory className="size-4" />
                Long cycle (ERD ≥ 120 days before close)
              </CardTitle>
              <CardDescription>
                Some jobs legitimately sit 6–12 months. These are the ones that most often miss a CO if nobody
                updates the file.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto pt-0">
              <JobTable jobs={long} showDays />
            </CardContent>
          </Card>
        </div>
      )}

      <p className="text-[11px] text-[var(--color-fg-subtle)]">{SHIPMENT_NOTES}</p>
    </div>
  );
}

const COMPONENT_EGM_TARGET = 0.3;

function componentEgmTone(egmPct: number): "success" | "warn" | "danger" {
  if (egmPct >= COMPONENT_EGM_TARGET) return "success";
  if (egmPct >= EGM_FLOOR / 100) return "warn";
  return "danger";
}

function OrderTypeTotals({
  mix,
  grand,
  componentFocus,
  onComponents,
  onKind,
}: {
  mix: Array<MixRow & { kind: JobKind }>;
  grand: MixRow;
  componentFocus: boolean;
  onComponents: () => void;
  onKind: (kind: JobKind) => void;
}) {
  const component = mix.find((r) => r.kind === "component");
  const share = grand.revenue > 0 && component ? component.revenue / grand.revenue : 0;
  const tone = component ? componentEgmTone(component.egmPct) : "warn";

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">Order type totals</CardTitle>
          <CardDescription>
            Job numbers ending in C are component orders. Grand Total is all closed job lines
            (building + component + insulation). Freight sits outside this mix.
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          variant={componentFocus ? "default" : "secondary"}
          className="h-8 rounded-full"
          onClick={onComponents}
        >
          Components only
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto pt-0">
        {component && (
          <button
            type="button"
            onClick={onComponents}
            className={cn(
              "mb-4 w-full rounded-[var(--radius-md)] border px-3 py-3 text-left",
              tone === "success" && "border-[var(--color-success)]/35 bg-[var(--color-success-soft)]",
              tone === "warn" && "border-[var(--color-warn)]/35 bg-[var(--color-warn-soft)]",
              tone === "danger" && "border-[var(--color-danger)]/35 bg-[var(--color-danger-soft)]",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-fg-subtle)]">
                  Component EGM
                </p>
                <p
                  className={cn(
                    "font-display text-2xl font-semibold tabular",
                    tone === "success" && "text-[var(--color-success)]",
                    tone === "warn" && "text-[var(--color-warn)]",
                    tone === "danger" && "text-[var(--color-danger)]",
                  )}
                >
                  {(component.egmPct * 100).toFixed(1)}%
                </p>
              </div>
              <Badge variant={tone}>vs ~30% typical</Badge>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
              <div>
                <p className="text-[var(--color-fg-subtle)]">Jobs</p>
                <p className="font-medium tabular">{component.count}</p>
              </div>
              <div>
                <p className="text-[var(--color-fg-subtle)]">Revenue</p>
                <p className="font-medium tabular">{formatCurrency(component.revenue, true)}</p>
              </div>
              <div>
                <p className="text-[var(--color-fg-subtle)]">EGM $</p>
                <p className="font-medium tabular">{formatCurrency(component.egm, true)}</p>
              </div>
              <div>
                <p className="text-[var(--color-fg-subtle)]">Share of job $</p>
                <p className="font-medium tabular">{(share * 100).toFixed(1)}%</p>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-[var(--color-fg-muted)]">
              Component orders (job # ending in C) typically target ~30% EGM.
              {component.egmPct < COMPONENT_EGM_TARGET
                ? ` This close is ${((COMPONENT_EGM_TARGET - component.egmPct) * 100).toFixed(1)} pts under that mark.`
                : " This close is at or above that mark."}
            </p>
          </button>
        )}
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-[var(--color-fg-subtle)]">
              <th className="pb-2 pr-2 font-medium">Type</th>
              <th className="pb-2 pr-2 text-right font-medium">Jobs</th>
              <th className="pb-2 pr-2 text-right font-medium">Revenue</th>
              <th className="pb-2 pr-2 text-right font-medium">EGM $</th>
              <th className="pb-2 text-right font-medium">EGM %</th>
            </tr>
          </thead>
          <tbody>
            {mix.map((row) => {
              const isComp = row.kind === "component";
              const label = componentFocus && isComp ? "Component Grand Total" : row.label;
              return (
                <tr
                  key={row.kind}
                  className={cn(
                    "border-b border-[var(--color-border)]/60",
                    isComp && "bg-[var(--color-primary-soft)]/40",
                  )}
                >
                  <td className="py-2 pr-2">
                    <button type="button" onClick={() => onKind(row.kind)} className="inline-flex items-center gap-1.5 font-medium">
                      {label}
                      {isComp && (
                        <Badge variant="default" className="text-[10px]">
                          C
                        </Badge>
                      )}
                    </button>
                  </td>
                  <td className="py-2 pr-2 text-right tabular">{row.count}</td>
                  <td className="py-2 pr-2 text-right tabular">{formatCurrency(row.revenue, true)}</td>
                  <td className="py-2 pr-2 text-right tabular">{formatCurrency(row.egm, true)}</td>
                  <td className="py-2 text-right tabular">{(row.egmPct * 100).toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)] text-sm font-semibold">
              <td className="py-2.5 pr-2">{componentFocus ? "All types · Grand Total" : "Grand Total"}</td>
              <td className="py-2.5 pr-2 text-right tabular">{grand.count}</td>
              <td className="py-2.5 pr-2 text-right tabular">{formatCurrency(grand.revenue, true)}</td>
              <td className="py-2.5 pr-2 text-right tabular">{formatCurrency(grand.egm, true)}</td>
              <td className="py-2.5 text-right tabular">{(grand.egmPct * 100).toFixed(1)}%</td>
            </tr>
          </tfoot>
        </table>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  hint,
  warn,
}: {
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
}) {
  return (
    <Card className={cn(warn && "border-[var(--color-warn)]/35")}>
      <CardContent className="p-4">
        <p className="text-xs text-[var(--color-fg-subtle)]">{label}</p>
        <p className="mt-1 font-display text-xl font-semibold tabular">{value}</p>
        {hint && <p className="mt-0.5 text-[11px] text-[var(--color-fg-muted)]">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function filterLabel(filter: ShipmentJobFilter): string {
  const parts: string[] = [];
  if (filter.hygiene) parts.push("Unupdated / at risk");
  if (filter.band === "under20") parts.push("<20% EGM");
  if (filter.band === "20-25") parts.push("20–25% EGM");
  if (filter.band === "25-30") parts.push("25–30% EGM");
  if (filter.band === "30plus") parts.push("30%+ EGM");
  if (filter.band === "under25") parts.push("Below 25% EGM");
  if (filter.region === "core-se") parts.push("Core Southeast");
  if (filter.region === "long-haul") parts.push("Long haul");
  if (filter.state) parts.push(filter.state);
  if (filter.kind) parts.push(KIND_SHORT[filter.kind]);
  if (filter.bsr) parts.push(`BSR ${filter.bsr}`);
  return parts.join(" · ") || "Filtered jobs";
}

function sameFilter(a: ShipmentJobFilter | null, b: ShipmentJobFilter): boolean {
  if (!a) return false;
  return (
    a.band === b.band &&
    a.state === b.state &&
    a.bsr === b.bsr &&
    a.kind === b.kind &&
    a.region === b.region &&
    a.hygiene === b.hygiene
  );
}

function egmTone(pct: number, count: number): "empty" | "danger" | "warn" | "ok" | "strong" {
  if (count === 0) return "empty";
  if (pct < 0.2) return "danger";
  if (pct < EGM_FLOOR / 100) return "warn";
  if (pct < 0.28) return "ok";
  return "strong";
}

function toneClass(tone: ReturnType<typeof egmTone>, selected = false): string {
  return cn(
    "rounded-[var(--radius-sm)] transition-colors",
    selected && "ring-2 ring-[var(--color-primary)] ring-offset-1 ring-offset-[var(--color-bg-elevated)]",
    tone === "empty" && "text-[var(--color-fg-subtle)]",
    tone === "danger" && "bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
    tone === "warn" && "bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
    tone === "ok" && "bg-[var(--color-bg-subtle)] text-[var(--color-fg)]",
    tone === "strong" && "bg-[var(--color-success-soft)] text-[var(--color-success)]",
  );
}

function EgmControlTower({
  bands,
  regions,
  heat,
  bsrs,
  filter,
  onOpen,
}: {
  bands: ReturnType<typeof egmBandBreakdown>;
  regions: EgmHeatCell[];
  heat: ReturnType<typeof egmStateHeat>;
  bsrs: EgmHeatCell[];
  filter: ShipmentJobFilter | null;
  onOpen: (next: ShipmentJobFilter) => void;
}) {
  const leak = bands.find((b) => b.id === "20-25");
  const kinds: JobKind[] = ["building", "component", "insulation"];

  return (
    <Card className="xl:col-span-3">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="size-4 text-[var(--color-primary)]" />
          EGM control tower
        </CardTitle>
        <CardDescription>
          Weighted estimated margin by band, region, state, product, and BSR. Red is below the{" "}
          {EGM_FLOOR}% floor. Click a cell for the job list.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {bands.map((b) => {
            const next: ShipmentJobFilter = { band: b.id };
            const on = sameFilter(filter, next);
            const hot = b.id === "under20" || b.id === "20-25";
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onOpen(next)}
                className={cn(
                  "rounded-[var(--radius-md)] border px-3 py-2 text-left",
                  hot
                    ? "border-[var(--color-danger)]/35 bg-[var(--color-danger-soft)]"
                    : "border-[var(--color-border)] bg-[var(--color-bg)]",
                  on && "ring-2 ring-[var(--color-primary)]",
                )}
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-fg-subtle)]">
                  {b.label}
                </p>
                <p className="font-display text-lg font-semibold tabular">{formatCurrency(b.revenue, true)}</p>
                <p className="text-[11px] text-[var(--color-fg-muted)]">
                  {b.count} jobs · {(b.egmPct * 100).toFixed(1)}%
                </p>
              </button>
            );
          })}
        </div>
        {leak && (
          <p className="text-[12px] text-[var(--color-fg-muted)]">
            <span className="font-medium text-[var(--color-danger)]">20–25% is the leak</span> —{" "}
            {formatCurrency(leak.revenue, true)} across {leak.count} jobs. That is where a VP override
            belongs, not at 0%.
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          {regions.map((r) => {
            const next: ShipmentJobFilter = { region: r.region };
            const tone = egmTone(r.egmPct, r.count);
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => r.region && onOpen(next)}
                className={cn("px-3 py-2 text-left", toneClass(tone, sameFilter(filter, next)))}
              >
                <p className="text-[11px] uppercase tracking-wide opacity-80">{r.label}</p>
                <p className="font-display text-base font-semibold tabular">{(r.egmPct * 100).toFixed(1)}%</p>
                <p className="text-[11px] opacity-80">
                  {formatCurrency(r.revenue, true)} · {r.under25Count} below 25%
                </p>
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase text-[var(--color-fg-subtle)]">
                <th className="pb-1.5 pr-2 font-medium">State</th>
                {kinds.map((k) => (
                  <th key={k} className="pb-1.5 pr-2 text-right font-medium">
                    {KIND_SHORT[k]}
                  </th>
                ))}
                <th className="pb-1.5 text-right font-medium">All</th>
              </tr>
            </thead>
            <tbody>
              {heat.map((row) => (
                <tr key={row.state} className="border-t border-[var(--color-border)]/50">
                  <td className="py-1 pr-2 font-medium">{row.state}</td>
                  {kinds.map((k) => (
                    <td key={k} className="py-1 pr-2 text-right">
                      <HeatButton
                        cell={row.byKind[k]}
                        selected={sameFilter(filter, { state: row.state === "Other" ? undefined : row.state, kind: k })}
                        onClick={() => {
                          if (row.byKind[k].count === 0) return;
                          onOpen({
                            ...(row.state !== "Other" ? { state: row.state } : {}),
                            kind: k,
                          });
                        }}
                      />
                    </td>
                  ))}
                  <td className="py-1 text-right">
                    <HeatButton
                      cell={row.total}
                      selected={sameFilter(filter, { state: row.state === "Other" ? undefined : row.state })}
                      onClick={() => {
                        if (row.state === "Other") return;
                        onOpen({ state: row.state });
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-fg-subtle)]">
            BSR — ranked by $ below 25%
          </p>
          <div className="flex flex-wrap gap-1.5">
            {bsrs.map((c) => {
              const next: ShipmentJobFilter = { bsr: c.bsr };
              const tone = egmTone(c.egmPct, c.count);
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => c.bsr && onOpen(next)}
                  className={cn("px-2 py-1 text-left", toneClass(tone, sameFilter(filter, next)))}
                  title={`${c.label}: ${(c.egmPct * 100).toFixed(1)}% EGM · ${formatCurrency(c.under25Rev, true)} below 25%`}
                >
                  <span className="text-xs font-semibold">{c.label}</span>
                  <span className="ml-1.5 text-[11px] tabular opacity-80">{(c.egmPct * 100).toFixed(1)}%</span>
                  <span className="ml-1 text-[10px] tabular opacity-70">{formatCurrency(c.under25Rev, true)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-[12px] text-[var(--color-fg)]">
          <span className="font-medium">Board question. </span>
          Who can book under {EGM_FLOOR}% EGM without a VP override?
        </div>
      </CardContent>
    </Card>
  );
}

function HeatButton({
  cell,
  selected,
  onClick,
}: {
  cell: EgmHeatCell;
  selected: boolean;
  onClick: () => void;
}) {
  const tone = egmTone(cell.egmPct, cell.count);
  if (cell.count === 0) {
    return <span className="text-[11px] text-[var(--color-fg-subtle)]">—</span>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("inline-flex min-w-[4.5rem] flex-col items-end px-1.5 py-0.5", toneClass(tone, selected))}
    >
      <span className="text-xs font-semibold tabular">{(cell.egmPct * 100).toFixed(1)}%</span>
      <span className="text-[10px] tabular opacity-80">{formatCurrency(cell.revenue, true)}</span>
    </button>
  );
}

function CoHygieneTile({
  hygiene,
  active,
  onOpen,
}: {
  hygiene: ReturnType<typeof coHygieneReport>;
  active: boolean;
  onOpen: () => void;
}) {
  const signals = [
    {
      label: "Deferred loss",
      value: formatCurrency(Math.abs(hygiene.deferredLoss), true),
      hint: "CO / update leakage at month close",
      warn: hygiene.deferredLoss < 0,
    },
    {
      label: "Slippage",
      value: formatCurrency(hygiene.slippage, true),
      hint: "Start-month $ that did not close",
      warn: hygiene.slippage > 0,
    },
    {
      label: "Long cycle",
      value: formatCurrency(hygiene.longCycleRev, true),
      hint: `${hygiene.longCycleCount} jobs · ERD ≥ 120 days`,
      warn: hygiene.longCycleCount > 0,
    },
    {
      label: "Low EGM",
      value: formatCurrency(hygiene.lowEgmRev, true),
      hint: `${hygiene.lowEgmCount} jobs shipped under 20%`,
      warn: hygiene.lowEgmCount > 0,
    },
  ];

  return (
    <Card className={cn("xl:col-span-2", active && "ring-2 ring-[var(--color-primary)]")}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="size-4 text-[var(--color-warn)]" />
          Unupdated jobs at risk
        </CardTitle>
        <CardDescription>
          Four signals, one hygiene problem. Files that sat without a job update or a change order.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <button type="button" onClick={onOpen} className="w-full rounded-[var(--radius-md)] border border-[var(--color-warn)]/35 bg-[var(--color-warn-soft)] px-3 py-2.5 text-left">
          <p className="text-[11px] uppercase tracking-wide text-[var(--color-warn)]">Files to review</p>
          <p className="font-display text-2xl font-semibold tabular">
            {hygiene.jobsAtRiskCount}
            <span className="ml-2 text-base font-medium text-[var(--color-fg-muted)]">
              {formatCurrency(hygiene.jobsAtRiskRev, true)}
            </span>
          </p>
          <p className="text-[11px] text-[var(--color-fg-muted)]">
            Low EGM or ERD ≥ 120 days · plus {formatCurrency(hygiene.band20to25Rev, true)} still sitting in
            20–25%
          </p>
        </button>

        <div className="grid grid-cols-2 gap-2">
          {signals.map((s) => (
            <div
              key={s.label}
              className={cn(
                "rounded-[var(--radius-md)] border px-2.5 py-2",
                s.warn ? "border-[var(--color-warn)]/30" : "border-[var(--color-border)]",
              )}
            >
              <p className="text-[11px] text-[var(--color-fg-subtle)]">{s.label}</p>
              <p className="font-display text-base font-semibold tabular">{s.value}</p>
              <p className="text-[10px] leading-snug text-[var(--color-fg-muted)]">{s.hint}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--color-fg-subtle)]">
            Highest-risk files
          </p>
          <table className="w-full text-sm">
            <tbody>
              {hygiene.jobs.slice(0, 8).map((j) => (
                <tr key={`${j.id}-${j.month}`} className="border-b border-[var(--color-border)]/50">
                  <td className="py-1 pr-2 tabular">{j.id}</td>
                  <td className="py-1 pr-2 truncate max-w-[8rem]">{j.customer || "—"}</td>
                  <td className="py-1 pr-2 text-right tabular text-[var(--color-danger)]">{j.egmPct.toFixed(1)}%</td>
                  <td className="py-1 text-right tabular">{formatCurrency(j.revenue, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button type="button" size="sm" variant="secondary" className="w-full" onClick={onOpen}>
          Open all at-risk files
        </Button>
      </CardContent>
    </Card>
  );
}

function JobTable({
  jobs,
  showDays,
  showMeta,
}: {
  jobs: Array<ShipmentJob & { cycleDays?: number | null }>;
  showDays?: boolean;
  showMeta?: boolean;
}) {
  if (jobs.length === 0) {
    return <p className="text-sm text-[var(--color-fg-muted)]">No jobs in this slice.</p>;
  }
  return (
    <table className="w-full min-w-[520px] text-sm">
      <thead>
        <tr className="text-left text-xs uppercase text-[var(--color-fg-subtle)]">
          <th className="pb-2 pr-2">Job</th>
          <th className="pb-2 pr-2">Customer</th>
          {showMeta && <th className="pb-2 pr-2">St</th>}
          {showMeta && <th className="pb-2 pr-2">BSR</th>}
          <th className="pb-2 pr-2 text-right">EGM</th>
          {(showDays || showMeta) && <th className="pb-2 pr-2 text-right">Days</th>}
          <th className="pb-2 text-right">$</th>
        </tr>
      </thead>
      <tbody>
        {jobs.map((j) => {
          const days = j.cycleDays ?? jobCycleDays(j);
          const hot = j.egmPct > 0 && j.egmPct < EGM_FLOOR;
          return (
            <tr key={`${j.id}-${j.month}`} className="border-b border-[var(--color-border)]/60">
              <td className="py-1.5 pr-2 tabular">
                <span className="inline-flex items-center gap-1">
                  {j.id}
                  {j.kind === "component" && (
                    <Badge variant="default" className="text-[9px]">
                      C
                    </Badge>
                  )}
                </span>
              </td>
              <td className="py-1.5 pr-2">{j.customer || "—"}</td>
              {showMeta && <td className="py-1.5 pr-2">{j.state || "—"}</td>}
              {showMeta && <td className="py-1.5 pr-2">{j.bsr || "—"}</td>}
              <td
                className={cn(
                  "py-1.5 pr-2 text-right tabular",
                  hot && "text-[var(--color-danger)]",
                )}
              >
                {j.egmPct.toFixed(1)}%
              </td>
              {(showDays || showMeta) && (
                <td className="py-1.5 pr-2 text-right tabular">{days != null && days >= 0 ? days : "—"}</td>
              )}
              <td className="py-1.5 text-right tabular">{formatCurrency(j.revenue, true)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
