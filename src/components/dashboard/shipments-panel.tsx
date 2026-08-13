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
  SHIPMENT_AS_OF,
  SHIPMENT_FORWARD,
  SHIPMENT_NOTES,
  SHIPMENT_SOURCE,
  computeShipmentMetrics,
  longCycleJobs,
  lowEgmJobs,
  mixBreakdown,
  shipmentChartSeries,
  topCustomers,
  topStates,
} from "@/data/shipments";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { AlertTriangle, Factory, Truck } from "lucide-react";

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
  const m = useMemo(() => computeShipmentMetrics(), []);
  const series = useMemo(() => shipmentChartSeries(), []);
  const mix = useMemo(() => mixBreakdown(), []);
  const customers = useMemo(() => topCustomers(10), []);
  const states = useMemo(() => topStates(10), []);
  const low = useMemo(() => lowEgmJobs(20, 12), []);
  const long = useMemo(() => longCycleJobs(10), []);
  const calendar = SHIPMENT_FORWARD.filter((f) => f.monthIndex >= 7);

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

      <div className="flex flex-wrap gap-1.5">
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
              <CardHeader>
                <CardTitle className="text-base">Mix</CardTitle>
                <CardDescription>Building vs component vs insulation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {mix.map((row) => (
                  <div key={row.kind}>
                    <div className="flex justify-between text-sm">
                      <span>{row.label}</span>
                      <span className="tabular font-medium">{formatCurrency(row.revenue, true)}</span>
                    </div>
                    <p className="text-[11px] text-[var(--color-fg-subtle)]">
                      {row.count} lines · {(row.egmPct * 100).toFixed(1)}% EGM
                    </p>
                  </div>
                ))}
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

      {view === "jobs" && (
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
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-[var(--color-fg-subtle)]">
                    <th className="pb-2 pr-2">Job</th>
                    <th className="pb-2 pr-2">Customer</th>
                    <th className="pb-2 pr-2 text-right">EGM</th>
                    <th className="pb-2 text-right">$</th>
                  </tr>
                </thead>
                <tbody>
                  {low.map((j) => (
                    <tr key={`${j.id}-${j.month}`} className="border-b border-[var(--color-border)]/60">
                      <td className="py-1.5 pr-2 tabular">{j.id}</td>
                      <td className="py-1.5 pr-2">{j.customer || "—"}</td>
                      <td className="py-1.5 pr-2 text-right tabular text-[var(--color-danger)]">{j.egmPct.toFixed(1)}%</td>
                      <td className="py-1.5 text-right tabular">{formatCurrency(j.revenue, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-[var(--color-fg-subtle)]">
                    <th className="pb-2 pr-2">Job</th>
                    <th className="pb-2 pr-2">Customer</th>
                    <th className="pb-2 pr-2 text-right">Days</th>
                    <th className="pb-2 text-right">$</th>
                  </tr>
                </thead>
                <tbody>
                  {long.map((j) => (
                    <tr key={`${j.id}-${j.month}`} className="border-b border-[var(--color-border)]/60">
                      <td className="py-1.5 pr-2 tabular">{j.id}</td>
                      <td className="py-1.5 pr-2">{j.customer || "—"}</td>
                      <td className="py-1.5 pr-2 text-right tabular">{j.cycleDays}</td>
                      <td className="py-1.5 text-right tabular">{formatCurrency(j.revenue, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      <p className="text-[11px] text-[var(--color-fg-subtle)]">{SHIPMENT_NOTES}</p>
    </div>
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
