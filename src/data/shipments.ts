/**
 * Plant shipments — out-the-door actuals from the 8-12-2026 Updated Shipping Report.
 * Complements bookings.ts (orders in). EGM = Estimated Gross Margin, not accounting GM.
 *
 * Closed months: January–July 2026. August is partial (through 8/12).
 * Cycle: typical 6–8 weeks; some jobs 12+ months. Slippage + deferred loss
 * flag jobs that sat without a change order / update.
 */

import { monthlyRecords, MONTHS, type MonthKey } from "./bookings";
import raw from "./shipments-2026.json";

export type JobKind = "building" | "component" | "insulation";

export interface ShipmentMonth {
  year: number;
  month: MonthKey;
  monthIndex: number;
  /** Month-close Total Shipped Rev (jobs + freight + deferred + discounts + other) */
  shipped: number;
  jobRevenue: number;
  egmDollars: number;
  /** Weighted EGM on job lines (0–1) */
  egmPct: number;
  jobCount: number;
  freight: number;
  deferredLoss: number;
  deferredGain: number;
  discounts: number;
  claims: number;
  otherRevenue: number;
  startRev: number | null;
  endRev: number | null;
  actual: boolean;
  partial?: boolean;
}

export interface ShipmentJob {
  id: string;
  month: string;
  monthIndex: number;
  year: number;
  egmPct: number;
  dm: string;
  bsr: string;
  credit: string;
  revenue: number;
  customer: string;
  project: string;
  city: string;
  state: string | null;
  kind: JobKind;
  erd: string | null;
  fabStart: string | null;
  wtw: boolean;
}

export interface ShipmentMetrics {
  shipped: number;
  jobRevenue: number;
  egmDollars: number;
  egmPct: number;
  jobCount: number;
  freight: number;
  deferredLoss: number;
  deferredGain: number;
  netDeferred: number;
  discounts: number;
  booked: number;
  bookedGm: number;
  bookedGmPct: number;
  /** Booked − shipped (positive = still in plant / backlog) */
  dockGap: number;
  dockGapPct: number;
  /** Sum of max(0, start − end) — scheduled $ that did not close */
  slippage: number;
  priorShipped: number;
  growth: number;
  monthCount: number;
  avgMonthly: number;
}

const bundle = raw as {
  source: string;
  asOf: string;
  notes: string;
  monthly: ShipmentMonth[];
  historyShipped: Array<{ year: number; month: string; monthIndex: number; shipped: number; actual: boolean }>;
  forwardStart: Array<{ month: string; monthIndex: number; startRev: number }>;
  jobs: ShipmentJob[];
};

export const SHIPMENT_SOURCE = bundle.source;
export const SHIPMENT_AS_OF = bundle.asOf;
export const SHIPMENT_NOTES = bundle.notes;
export const SHIPMENT_MONTHS: ShipmentMonth[] = bundle.monthly;
export const SHIPMENT_JOBS: ShipmentJob[] = bundle.jobs;
export const SHIPMENT_FORWARD = bundle.forwardStart;
export const SHIPMENT_HISTORY = bundle.historyShipped;

export const LATEST_SHIPPED_2026_MONTH = 6; // July closed
export const CLOSED_2026 = SHIPMENT_MONTHS.filter((m) => m.year === 2026 && m.actual);

export function bookedForMonth(year: number, monthIndex: number): { sales: number; gm: number } {
  const r = monthlyRecords.find((x) => x.year === year && x.monthIndex === monthIndex);
  return { sales: r?.sales ?? 0, gm: r?.gm ?? 0 };
}

export function computeShipmentMetrics(throughMonth = LATEST_SHIPPED_2026_MONTH): ShipmentMetrics {
  const months = SHIPMENT_MONTHS.filter((m) => m.year === 2026 && m.actual && m.monthIndex <= throughMonth);
  const shipped = months.reduce((s, m) => s + m.shipped, 0);
  const jobRevenue = months.reduce((s, m) => s + m.jobRevenue, 0);
  const egmDollars = months.reduce((s, m) => s + m.egmDollars, 0);
  const freight = months.reduce((s, m) => s + m.freight, 0);
  const deferredLoss = months.reduce((s, m) => s + m.deferredLoss, 0);
  const deferredGain = months.reduce((s, m) => s + m.deferredGain, 0);
  const discounts = months.reduce((s, m) => s + m.discounts, 0);
  const jobCount = months.reduce((s, m) => s + m.jobCount, 0);
  const booked = months.reduce((s, m) => s + bookedForMonth(m.year, m.monthIndex).sales, 0);
  const bookedGm = months.reduce((s, m) => s + bookedForMonth(m.year, m.monthIndex).gm, 0);
  const slippage = months.reduce((s, m) => {
    if (m.startRev == null || m.endRev == null) return s;
    return s + Math.max(0, m.startRev - m.endRev);
  }, 0);

  const prior = SHIPMENT_HISTORY.filter((h) =>
    months.some((m) => m.monthIndex === h.monthIndex),
  ).reduce((s, h) => s + h.shipped, 0);
  const priorMonths = new Set(SHIPMENT_HISTORY.map((h) => h.monthIndex));
  const currentForYoy = months.filter((m) => priorMonths.has(m.monthIndex)).reduce((s, m) => s + m.shipped, 0);
  const growth = prior > 0 ? (currentForYoy - prior) / prior : 0;

  return {
    shipped,
    jobRevenue,
    egmDollars,
    egmPct: jobRevenue > 0 ? egmDollars / jobRevenue : 0,
    jobCount,
    freight,
    deferredLoss,
    deferredGain,
    netDeferred: deferredLoss + deferredGain,
    discounts,
    booked,
    bookedGm,
    bookedGmPct: booked > 0 ? bookedGm / booked : 0,
    dockGap: booked - shipped,
    dockGapPct: booked > 0 ? (booked - shipped) / booked : 0,
    slippage,
    priorShipped: prior,
    growth,
    monthCount: months.length,
    avgMonthly: months.length ? shipped / months.length : 0,
  };
}

export function shipmentChartSeries() {
  return CLOSED_2026.map((m) => {
    const b = bookedForMonth(m.year, m.monthIndex);
    const prior = SHIPMENT_HISTORY.find((h) => h.monthIndex === m.monthIndex)?.shipped ?? 0;
    const slip = m.startRev != null && m.endRev != null ? m.startRev - m.endRev : 0;
    return {
      key: `${m.month.slice(0, 3)} ${m.year}`,
      month: m.month,
      monthIndex: m.monthIndex,
      shipped: m.shipped,
      booked: b.sales,
      egm: m.egmDollars,
      egmPct: m.egmPct * 100,
      freight: m.freight,
      priorShipped: prior,
      startRev: m.startRev ?? 0,
      endRev: m.endRev ?? m.shipped,
      slippage: slip,
      jobCount: m.jobCount,
    };
  });
}

export function mixBreakdown() {
  const closed = new Set<string>(CLOSED_2026.map((m) => m.month));
  const buckets: Record<JobKind, { revenue: number; egm: number; count: number }> = {
    building: { revenue: 0, egm: 0, count: 0 },
    component: { revenue: 0, egm: 0, count: 0 },
    insulation: { revenue: 0, egm: 0, count: 0 },
  };
  for (const j of SHIPMENT_JOBS) {
    if (!closed.has(j.month)) continue;
    const b = buckets[j.kind] ?? buckets.building;
    b.revenue += j.revenue;
    b.egm += (j.revenue * j.egmPct) / 100;
    b.count += 1;
  }
  return (Object.keys(buckets) as JobKind[]).map((kind) => {
    const b = buckets[kind];
    return {
      kind,
      label: kind === "building" ? "Building / main" : kind === "component" ? "Component (C)" : "Insulation",
      revenue: b.revenue,
      egm: b.egm,
      egmPct: b.revenue > 0 ? b.egm / b.revenue : 0,
      count: b.count,
    };
  });
}

export function topCustomers(n = 10) {
  const closed = new Set<string>(CLOSED_2026.map((m) => m.month));
  const map = new Map<string, { revenue: number; egm: number; count: number }>();
  for (const j of SHIPMENT_JOBS) {
    if (!closed.has(j.month) || !j.customer) continue;
    const name = normalizeCustomer(j.customer);
    const cur = map.get(name) ?? { revenue: 0, egm: 0, count: 0 };
    cur.revenue += j.revenue;
    cur.egm += (j.revenue * j.egmPct) / 100;
    cur.count += 1;
    map.set(name, cur);
  }
  return [...map.entries()]
    .map(([name, v]) => ({
      name,
      revenue: v.revenue,
      egmPct: v.revenue > 0 ? v.egm / v.revenue : 0,
      count: v.count,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, n);
}

export function topStates(n = 10) {
  const closed = new Set<string>(CLOSED_2026.map((m) => m.month));
  const map = new Map<string, { revenue: number; egm: number; count: number }>();
  for (const j of SHIPMENT_JOBS) {
    if (!closed.has(j.month)) continue;
    const name = j.state || "—";
    const cur = map.get(name) ?? { revenue: 0, egm: 0, count: 0 };
    cur.revenue += j.revenue;
    cur.egm += (j.revenue * j.egmPct) / 100;
    cur.count += 1;
    map.set(name, cur);
  }
  return [...map.entries()]
    .map(([name, v]) => ({
      name,
      revenue: v.revenue,
      egmPct: v.revenue > 0 ? v.egm / v.revenue : 0,
      count: v.count,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, n);
}

function normalizeCustomer(name: string): string {
  const n = name.replace(/\s+/g, " ").trim();
  if (/j\.?\s*a\.?\s*street/i.test(n)) return "JA Street & Associates";
  if (/chatahoochee|chattahoochee/i.test(n)) return "Chattahoochee Group";
  return n;
}

/** Jobs with EGM under 20% — pricing / scope / missing CO risk. */
export function lowEgmJobs(threshold = 20, limit = 12) {
  const closed = new Set<string>(CLOSED_2026.map((m) => m.month));
  return SHIPMENT_JOBS.filter((j) => closed.has(j.month) && j.egmPct > 0 && j.egmPct < threshold)
    .sort((a, b) => a.egmPct - b.egmPct)
    .slice(0, limit);
}

/** Long-cycle signal: ERD more than 180 days before month-end ship window. */
export function longCycleJobs(limit = 10) {
  const closed = new Set<string>(CLOSED_2026.map((m) => m.month));
  const scored = SHIPMENT_JOBS.filter((j) => closed.has(j.month) && j.erd).map((j) => {
    const erd = new Date(j.erd! + "T12:00:00").getTime();
    const ship = new Date(2026, j.monthIndex + 1, 0).getTime();
    const days = Math.round((ship - erd) / 86_400_000);
    return { ...j, cycleDays: days };
  });
  return scored
    .filter((j) => j.cycleDays >= 120)
    .sort((a, b) => b.cycleDays - a.cycleDays)
    .slice(0, limit);
}

export const KIND_LABEL: Record<JobKind, string> = {
  building: "Building / main",
  component: "Component (C)",
  insulation: "Insulation",
};


