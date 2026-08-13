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

/** Board floor — cells under this print red. */
export const EGM_FLOOR = 25;
export const EGM_CRITICAL = 20;
export const LONG_CYCLE_DAYS = 120;

/** Core Southeast plant states. Everything else is long-haul. */
export const CORE_SE_STATES = new Set(["AL", "FL", "GA", "KY", "NC", "SC", "TN", "VA"]);

export type EgmBandId = "under20" | "20-25" | "25-30" | "30plus";
export type HygieneFlag = "low-egm" | "long-cycle" | "band-20-25";
export type ShipmentRegion = "core-se" | "long-haul";

export interface ShipmentJobFilter {
  band?: EgmBandId | "under25";
  state?: string;
  bsr?: string;
  kind?: JobKind;
  region?: ShipmentRegion;
  hygiene?: boolean;
}

export interface EgmBandRow {
  id: EgmBandId;
  label: string;
  hint: string;
  revenue: number;
  count: number;
  egm: number;
  egmPct: number;
}

export interface EgmHeatCell {
  key: string;
  label: string;
  state?: string;
  kind?: JobKind;
  bsr?: string;
  region?: ShipmentRegion;
  revenue: number;
  count: number;
  egm: number;
  /** Weighted EGM 0–1 */
  egmPct: number;
  under25Rev: number;
  under25Count: number;
}

export interface EgmStateRow {
  state: string;
  total: EgmHeatCell;
  byKind: Record<JobKind, EgmHeatCell>;
}

export interface HygieneJob extends ShipmentJob {
  cycleDays: number | null;
  flags: HygieneFlag[];
  riskScore: number;
}

export interface CoHygieneReport {
  deferredLoss: number;
  slippage: number;
  longCycleRev: number;
  longCycleCount: number;
  lowEgmRev: number;
  lowEgmCount: number;
  band20to25Rev: number;
  band20to25Count: number;
  jobsAtRiskRev: number;
  jobsAtRiskCount: number;
  jobs: HygieneJob[];
}

export const KIND_LABEL: Record<JobKind, string> = {
  building: "Building / main",
  component: "Component (C)",
  insulation: "Insulation",
};

export const KIND_SHORT: Record<JobKind, string> = {
  building: "Building",
  component: "Comp",
  insulation: "Insul",
};

const BAND_DEFS: Array<{ id: EgmBandId; label: string; hint: string; min: number; max: number }> = [
  { id: "under20", label: "<20%", hint: "Critical — pricing or missing CO", min: 0, max: 20 },
  { id: "20-25", label: "20–25%", hint: "Below the 25% floor — the real leak", min: 20, max: 25 },
  { id: "25-30", label: "25–30%", hint: "At or just over the floor", min: 25, max: 30 },
  { id: "30plus", label: "30%+", hint: "Above the floor", min: 30, max: Infinity },
];

function closedMonthSet(): Set<string> {
  return new Set(CLOSED_2026.map((m) => m.month));
}

function closedJobs(): ShipmentJob[] {
  const closed = closedMonthSet();
  return SHIPMENT_JOBS.filter((j) => closed.has(j.month));
}

export function isCoreSe(state: string | null): boolean {
  return !!state && CORE_SE_STATES.has(state);
}

/** Days from ERD to month-end of the ship month. Null if no ERD. */
export function jobCycleDays(job: ShipmentJob): number | null {
  if (!job.erd) return null;
  const erd = new Date(`${job.erd}T12:00:00`).getTime();
  if (Number.isNaN(erd)) return null;
  const ship = new Date(2026, job.monthIndex + 1, 0).getTime();
  return Math.round((ship - erd) / 86_400_000);
}

export function jobMatchesFilter(job: ShipmentJob, filter: ShipmentJobFilter): boolean {
  if (filter.band) {
    const e = job.egmPct;
    if (filter.band === "under20" && !(e > 0 && e < 20)) return false;
    if (filter.band === "20-25" && !(e >= 20 && e < 25)) return false;
    if (filter.band === "25-30" && !(e >= 25 && e < 30)) return false;
    if (filter.band === "30plus" && !(e >= 30)) return false;
    if (filter.band === "under25" && !(e > 0 && e < EGM_FLOOR)) return false;
  }
  if (filter.state && (job.state || "—") !== filter.state) return false;
  if (filter.bsr && (job.bsr || "—") !== filter.bsr) return false;
  if (filter.kind && job.kind !== filter.kind) return false;
  if (filter.region === "core-se" && !isCoreSe(job.state)) return false;
  if (filter.region === "long-haul" && isCoreSe(job.state)) return false;
  if (filter.hygiene) {
    const days = jobCycleDays(job);
    const low = job.egmPct > 0 && job.egmPct < EGM_CRITICAL;
    const long = days != null && days >= LONG_CYCLE_DAYS;
    if (!low && !long) return false;
  }
  return true;
}

export function filterShipmentJobs(filter: ShipmentJobFilter, limit?: number): ShipmentJob[] {
  const rows = closedJobs()
    .filter((j) => jobMatchesFilter(j, filter))
    .sort((a, b) => b.revenue - a.revenue);
  return limit != null ? rows.slice(0, limit) : rows;
}

function emptyBucket() {
  return { revenue: 0, egm: 0, count: 0, under25Rev: 0, under25Count: 0 };
}

type Bucket = ReturnType<typeof emptyBucket>;

function addToBucket(b: Bucket, job: ShipmentJob) {
  b.revenue += job.revenue;
  b.egm += (job.revenue * job.egmPct) / 100;
  b.count += 1;
  if (job.egmPct > 0 && job.egmPct < EGM_FLOOR) {
    b.under25Rev += job.revenue;
    b.under25Count += 1;
  }
}

function cellFromBucket(
  key: string,
  label: string,
  b: Bucket,
  extra: Partial<Pick<EgmHeatCell, "state" | "kind" | "bsr" | "region">> = {},
): EgmHeatCell {
  return {
    key,
    label,
    ...extra,
    revenue: b.revenue,
    count: b.count,
    egm: b.egm,
    egmPct: b.revenue > 0 ? b.egm / b.revenue : 0,
    under25Rev: b.under25Rev,
    under25Count: b.under25Count,
  };
}

/** Revenue sitting in each EGM band — 20–25% is the leak. */
export function egmBandBreakdown(): EgmBandRow[] {
  const buckets: Record<EgmBandId, Bucket> = {
    under20: emptyBucket(),
    "20-25": emptyBucket(),
    "25-30": emptyBucket(),
    "30plus": emptyBucket(),
  };
  for (const j of closedJobs()) {
    const e = j.egmPct;
    if (e <= 0) continue;
    const id: EgmBandId = e < 20 ? "under20" : e < 25 ? "20-25" : e < 30 ? "25-30" : "30plus";
    addToBucket(buckets[id], j);
  }
  return BAND_DEFS.map((def) => {
    const b = buckets[def.id];
    return {
      id: def.id,
      label: def.label,
      hint: def.hint,
      revenue: b.revenue,
      count: b.count,
      egm: b.egm,
      egmPct: b.revenue > 0 ? b.egm / b.revenue : 0,
    };
  });
}

export function egmRegionHeat(): EgmHeatCell[] {
  const buckets: Record<ShipmentRegion, Bucket> = {
    "core-se": emptyBucket(),
    "long-haul": emptyBucket(),
  };
  for (const j of closedJobs()) {
    addToBucket(buckets[isCoreSe(j.state) ? "core-se" : "long-haul"], j);
  }
  return [
    cellFromBucket("core-se", "Core Southeast", buckets["core-se"], { region: "core-se" }),
    cellFromBucket("long-haul", "Long haul", buckets["long-haul"], { region: "long-haul" }),
  ];
}

/** State × product heat. States under $250k shipped roll into Other. */
export function egmStateHeat(minRevenue = 250_000): EgmStateRow[] {
  const kinds: JobKind[] = ["building", "component", "insulation"];
  const byState = new Map<string, { total: Bucket; byKind: Record<JobKind, Bucket> }>();
  const other = {
    total: emptyBucket(),
    byKind: {
      building: emptyBucket(),
      component: emptyBucket(),
      insulation: emptyBucket(),
    } as Record<JobKind, Bucket>,
  };

  const prelim = new Map<string, number>();
  for (const j of closedJobs()) {
    const st = j.state || "—";
    prelim.set(st, (prelim.get(st) ?? 0) + j.revenue);
  }

  for (const j of closedJobs()) {
    const st = j.state || "—";
    const keep = (prelim.get(st) ?? 0) >= minRevenue && st !== "—";
    const slot = keep
      ? byState.get(st) ??
        (() => {
          const created = {
            total: emptyBucket(),
            byKind: {
              building: emptyBucket(),
              component: emptyBucket(),
              insulation: emptyBucket(),
            } as Record<JobKind, Bucket>,
          };
          byState.set(st, created);
          return created;
        })()
      : other;
    addToBucket(slot.total, j);
    addToBucket(slot.byKind[j.kind] ?? slot.byKind.building, j);
  }

  const rows: EgmStateRow[] = [...byState.entries()]
    .map(([state, slot]) => ({
      state,
      total: cellFromBucket(`${state}-all`, state, slot.total, { state }),
      byKind: Object.fromEntries(
        kinds.map((k) => [k, cellFromBucket(`${state}-${k}`, `${state} ${KIND_SHORT[k]}`, slot.byKind[k], { state, kind: k })]),
      ) as Record<JobKind, EgmHeatCell>,
    }))
    .sort((a, b) => b.total.revenue - a.total.revenue);

  if (other.total.count > 0) {
    rows.push({
      state: "Other",
      total: cellFromBucket("other-all", "Other", other.total),
      byKind: Object.fromEntries(
        kinds.map((k) => [k, cellFromBucket(`other-${k}`, `Other ${KIND_SHORT[k]}`, other.byKind[k], { kind: k })]),
      ) as Record<JobKind, EgmHeatCell>,
    });
  }
  return rows;
}

export function egmBsrHeat(minRevenue = 100_000): EgmHeatCell[] {
  const map = new Map<string, Bucket>();
  for (const j of closedJobs()) {
    const key = (j.bsr || "—").trim() || "—";
    const b = map.get(key) ?? emptyBucket();
    addToBucket(b, j);
    map.set(key, b);
  }
  return [...map.entries()]
    .map(([bsr, b]) => cellFromBucket(bsr, bsr, b, { bsr }))
    .filter((c) => c.revenue >= minRevenue)
    .sort((a, b) => b.under25Rev - a.under25Rev || a.egmPct - b.egmPct);
}

export function hygieneFlags(job: ShipmentJob): HygieneFlag[] {
  const flags: HygieneFlag[] = [];
  if (job.egmPct > 0 && job.egmPct < EGM_CRITICAL) flags.push("low-egm");
  if (job.egmPct >= EGM_CRITICAL && job.egmPct < EGM_FLOOR) flags.push("band-20-25");
  const days = jobCycleDays(job);
  if (days != null && days >= LONG_CYCLE_DAYS) flags.push("long-cycle");
  return flags;
}

function hygieneScore(job: ShipmentJob, flags: HygieneFlag[], days: number | null): number {
  let score = 0;
  if (flags.includes("low-egm")) score += (EGM_CRITICAL - job.egmPct) * 3 + 10;
  if (flags.includes("band-20-25")) score += 4;
  if (flags.includes("long-cycle") && days != null) score += Math.min(20, days / 30);
  score += Math.min(8, job.revenue / 200_000);
  return score;
}

/** Deferred loss + start-end slippage + long-cycle + low EGM — one hygiene picture. */
export function coHygieneReport(limit = 12): CoHygieneReport {
  const metrics = computeShipmentMetrics();
  const jobs: HygieneJob[] = [];
  let longCycleRev = 0;
  let longCycleCount = 0;
  let lowEgmRev = 0;
  let lowEgmCount = 0;
  let band20to25Rev = 0;
  let band20to25Count = 0;
  let jobsAtRiskRev = 0;
  let jobsAtRiskCount = 0;

  for (const j of closedJobs()) {
    const days = jobCycleDays(j);
    const flags = hygieneFlags(j);
    if (flags.includes("low-egm")) {
      lowEgmRev += j.revenue;
      lowEgmCount += 1;
    }
    if (flags.includes("band-20-25")) {
      band20to25Rev += j.revenue;
      band20to25Count += 1;
    }
    if (flags.includes("long-cycle")) {
      longCycleRev += j.revenue;
      longCycleCount += 1;
    }
    const atRisk = flags.includes("low-egm") || flags.includes("long-cycle");
    if (atRisk) {
      jobsAtRiskRev += j.revenue;
      jobsAtRiskCount += 1;
      jobs.push({
        ...j,
        cycleDays: days,
        flags,
        riskScore: hygieneScore(j, flags, days),
      });
    }
  }

  jobs.sort((a, b) => b.riskScore - a.riskScore || b.revenue - a.revenue);

  return {
    deferredLoss: metrics.deferredLoss,
    slippage: metrics.slippage,
    longCycleRev,
    longCycleCount,
    lowEgmRev,
    lowEgmCount,
    band20to25Rev,
    band20to25Count,
    jobsAtRiskRev,
    jobsAtRiskCount,
    jobs: jobs.slice(0, limit),
  };
}

/** Jobs with EGM under 20% — pricing / scope / missing CO risk. */
export function lowEgmJobs(threshold = 20, limit = 12) {
  return closedJobs()
    .filter((j) => j.egmPct > 0 && j.egmPct < threshold)
    .sort((a, b) => a.egmPct - b.egmPct)
    .slice(0, limit);
}

/** Long-cycle signal: ERD ≥ 120 days before month-end of the ship window. */
export function longCycleJobs(limit = 10) {
  return closedJobs()
    .map((j) => ({ ...j, cycleDays: jobCycleDays(j) ?? -1 }))
    .filter((j) => j.cycleDays >= LONG_CYCLE_DAYS)
    .sort((a, b) => b.cycleDays - a.cycleDays)
    .slice(0, limit);
}


