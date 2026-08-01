/**
 * Ascent Buildings LLC — 2nd Quarterly 2026 Bookings / Margin Report data.
 * Embedded offline so the dashboard works without network or Excel.
 */

export type MonthKey =
  | "January"
  | "February"
  | "March"
  | "April"
  | "May"
  | "June"
  | "July"
  | "August"
  | "September"
  | "October"
  | "November"
  | "December";

export const MONTHS: MonthKey[] = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const MONTH_INDEX: Record<MonthKey, number> = {
  January: 0,
  February: 1,
  March: 2,
  April: 3,
  May: 4,
  June: 5,
  July: 6,
  August: 7,
  September: 8,
  October: 9,
  November: 10,
  December: 11,
};

export interface MonthlyRecord {
  year: number;
  month: MonthKey;
  monthIndex: number;
  /** Total contract / sales amount (includes eng + freight where reported) */
  sales: number;
  /** Gross margin dollars */
  gm: number;
  /** Gross margin % of sales */
  gmPct: number;
}

/** Sales Graph + GM Graph from the quarterly workbook (full contract totals). */
export const monthlyRecords: MonthlyRecord[] = [
  // 2023
  { year: 2023, month: "January", monthIndex: 0, sales: 5993075.42, gm: 1681477.9, gmPct: 0.2806 },
  { year: 2023, month: "February", monthIndex: 1, sales: 6931708.4, gm: 1898543.73, gmPct: 0.2739 },
  { year: 2023, month: "March", monthIndex: 2, sales: 8167352.65, gm: 2262410.5, gmPct: 0.2771 },
  { year: 2023, month: "April", monthIndex: 3, sales: 5230279.43, gm: 1455345.95, gmPct: 0.2783 },
  { year: 2023, month: "May", monthIndex: 4, sales: 8122073.89, gm: 2200433.27, gmPct: 0.2709 },
  { year: 2023, month: "June", monthIndex: 5, sales: 8716303.74, gm: 2752444.3, gmPct: 0.3158 },
  { year: 2023, month: "July", monthIndex: 6, sales: 4523974.88, gm: 1145649.71, gmPct: 0.2532 },
  { year: 2023, month: "August", monthIndex: 7, sales: 9918658.03, gm: 3177306.39, gmPct: 0.3203 },
  { year: 2023, month: "September", monthIndex: 8, sales: 5011493.79, gm: 1327537.23, gmPct: 0.2649 },
  { year: 2023, month: "October", monthIndex: 9, sales: 5043747.48, gm: 1109676.96, gmPct: 0.2200 },
  { year: 2023, month: "November", monthIndex: 10, sales: 6423288.14, gm: 1860899.1, gmPct: 0.2897 },
  { year: 2023, month: "December", monthIndex: 11, sales: 5286210.23, gm: 1505260.36, gmPct: 0.2847 },
  // 2024
  { year: 2024, month: "January", monthIndex: 0, sales: 9005293.37, gm: 2429668.18, gmPct: 0.2698 },
  { year: 2024, month: "February", monthIndex: 1, sales: 5215304.04, gm: 1352295.82, gmPct: 0.2593 },
  { year: 2024, month: "March", monthIndex: 2, sales: 8523964.59, gm: 2373675.16, gmPct: 0.2785 },
  { year: 2024, month: "April", monthIndex: 3, sales: 5663410.86, gm: 1679212.48, gmPct: 0.2965 },
  { year: 2024, month: "May", monthIndex: 4, sales: 15128383.88, gm: 4239049.53, gmPct: 0.2802 },
  { year: 2024, month: "June", monthIndex: 5, sales: 4292785.71, gm: 1218899.45, gmPct: 0.2840 },
  { year: 2024, month: "July", monthIndex: 6, sales: 4951247.35, gm: 1232909.69, gmPct: 0.2490 },
  { year: 2024, month: "August", monthIndex: 7, sales: 6732046.15, gm: 1823990.22, gmPct: 0.2710 },
  { year: 2024, month: "September", monthIndex: 8, sales: 8906478.38, gm: 2281998.49, gmPct: 0.2562 },
  { year: 2024, month: "October", monthIndex: 9, sales: 7013983.75, gm: 1955757.17, gmPct: 0.2788 },
  { year: 2024, month: "November", monthIndex: 10, sales: 5854254.1, gm: 1521635.76, gmPct: 0.2600 },
  { year: 2024, month: "December", monthIndex: 11, sales: 5088062.59, gm: 1496870, gmPct: 0.2942 },
  // 2025
  { year: 2025, month: "January", monthIndex: 0, sales: 8917232.16, gm: 2544956.54, gmPct: 0.2855 },
  { year: 2025, month: "February", monthIndex: 1, sales: 8192031, gm: 2330489.83, gmPct: 0.2845 },
  { year: 2025, month: "March", monthIndex: 2, sales: 7240307.69, gm: 1950500.2, gmPct: 0.2694 },
  { year: 2025, month: "April", monthIndex: 3, sales: 5487438.26, gm: 1349303.25, gmPct: 0.2459 },
  { year: 2025, month: "May", monthIndex: 4, sales: 6504354.68, gm: 1579532.38, gmPct: 0.2428 },
  { year: 2025, month: "June", monthIndex: 5, sales: 4868985.11, gm: 1197965.37, gmPct: 0.2460 },
  { year: 2025, month: "July", monthIndex: 6, sales: 7090455.01, gm: 1842850.83, gmPct: 0.2599 },
  { year: 2025, month: "August", monthIndex: 7, sales: 7095389.87, gm: 1786472.64, gmPct: 0.2518 },
  { year: 2025, month: "September", monthIndex: 8, sales: 10826059.02, gm: 2861414.39, gmPct: 0.2643 },
  { year: 2025, month: "October", monthIndex: 9, sales: 8947402.3, gm: 2261818.88, gmPct: 0.2528 },
  { year: 2025, month: "November", monthIndex: 10, sales: 8814768.76, gm: 2184405.03, gmPct: 0.2478 },
  { year: 2025, month: "December", monthIndex: 11, sales: 6595205.27, gm: 1594799.53, gmPct: 0.2418 },
  // 2026 (through June — report period)
  { year: 2026, month: "January", monthIndex: 0, sales: 7339581.19, gm: 1903606.97, gmPct: 0.2594 },
  { year: 2026, month: "February", monthIndex: 1, sales: 11338903.11, gm: 2944775.69, gmPct: 0.2597 },
  { year: 2026, month: "March", monthIndex: 2, sales: 10218505.75, gm: 2434321.2, gmPct: 0.2382 },
  { year: 2026, month: "April", monthIndex: 3, sales: 6725240.88, gm: 1638639.85, gmPct: 0.2437 },
  { year: 2026, month: "May", monthIndex: 4, sales: 9201568.71, gm: 2618951.2, gmPct: 0.2846 },
  { year: 2026, month: "June", monthIndex: 5, sales: 8237608.08, gm: 2101289.32, gmPct: 0.2551 },
];

export interface SegmentRow {
  id: string;
  name: string;
  category: "product" | "plant" | "service" | "region";
  weight: number;
  cost: number;
  gm: number;
  sell: number;
  gmPct: number;
  fabTons: number;
}

/** YTD 2026 (Jan–Jun) product / plant breakdown from workbook sheets. */
export const segmentYtd2026: SegmentRow[] = [
  {
    id: "bldgs",
    name: "Buildings Only",
    category: "product",
    weight: 20357347,
    cost: 34883929.51,
    gm: 13208982.89,
    sell: 48103919.4,
    gmPct: 0.2746,
    fabTons: 10178.67,
  },
  {
    id: "total-fab",
    name: "Total Fabrication",
    category: "plant",
    weight: 18646878.9,
    cost: 28432291.54,
    gm: 11004231.33,
    sell: 39436522.88,
    gmPct: 0.2790,
    fabTons: 9323.44,
  },
  {
    id: "tn-fab",
    name: "TN Fabrication",
    category: "plant",
    weight: 8312517.74,
    cost: 12909363.43,
    gm: 5120160.88,
    sell: 18029524.31,
    gmPct: 0.2840,
    fabTons: 4156.26,
  },
  {
    id: "primary",
    name: "Primary Steel",
    category: "product",
    weight: 5697970.24,
    cost: 8730762.24,
    gm: 3432014.72,
    sell: 12162726.96,
    gmPct: 0.2822,
    fabTons: 2848.99,
  },
  {
    id: "central",
    name: "Central States",
    category: "region",
    weight: 4930866.77,
    cost: 9234585.68,
    gm: 3573245.31,
    sell: 12807830.99,
    gmPct: 0.2790,
    fabTons: 2465.43,
  },
  {
    id: "buyouts",
    name: "Buy-Outs",
    category: "service",
    weight: 1639818.01,
    cost: 7052070.11,
    gm: 2424140.11,
    sell: 9476210.22,
    gmPct: 0.2558,
    fabTons: 819.91,
  },
  {
    id: "cf-roll",
    name: "CF Roll",
    category: "product",
    weight: 4436167.9,
    cost: 4501634.55,
    gm: 1731697.51,
    sell: 6233332.06,
    gmPct: 0.2778,
    fabTons: 2218.08,
  },
  {
    id: "mbsd",
    name: "MBSD",
    category: "product",
    weight: 2702979.8,
    cost: 4642269.53,
    gm: 1572179.5,
    sell: 6214451.03,
    gmPct: 0.2530,
    fabTons: 1351.49,
  },
  {
    id: "imps",
    name: "IMPs",
    category: "product",
    weight: 471650,
    cost: 2348085.64,
    gm: 771949.52,
    sell: 3120035.17,
    gmPct: 0.2474,
    fabTons: 235.83,
  },
  {
    id: "hot-rolled",
    name: "Hot Rolled",
    category: "product",
    weight: 2181972,
    cost: 3558676.26,
    gm: 1442844.18,
    sell: 5002190.36,
    gmPct: 0.2884,
    fabTons: 1090.99,
  },
  {
    id: "insulation",
    name: "Insulation",
    category: "product",
    weight: 4360,
    cost: 1086315.87,
    gm: 305961.95,
    sell: 1392277.79,
    gmPct: 0.2198,
    fabTons: 2.18,
  },
  {
    id: "comp",
    name: "Components Only",
    category: "product",
    weight: 189639.82,
    cost: 946979.53,
    gm: 423315.27,
    sell: 1370294.8,
    gmPct: 0.3089,
    fabTons: 94.82,
  },
  {
    id: "eng",
    name: "Engineering",
    category: "service",
    weight: 0,
    cost: 0,
    gm: 0,
    sell: 1052520.14,
    gmPct: 0,
    fabTons: 0,
  },
  {
    id: "clips",
    name: "Clips",
    category: "product",
    weight: 327688.9,
    cost: 462361.71,
    gm: 183371.98,
    sell: 645733.69,
    gmPct: 0.2840,
    fabTons: 163.84,
  },
  {
    id: "hr-crane",
    name: "HR Crane",
    category: "product",
    weight: 91412.8,
    cost: 128138.32,
    gm: 49636.77,
    sell: 177775.09,
    gmPct: 0.2792,
    fabTons: 45.71,
  },
];

/** Quarter rollups for quick filters. */
export interface QuarterSummary {
  id: string;
  label: string;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  startMonth: number;
  endMonth: number;
  sales: number;
  gm: number;
  gmPct: number;
}

export const quarterSummaries: QuarterSummary[] = (() => {
  const out: QuarterSummary[] = [];
  for (const year of [2023, 2024, 2025, 2026]) {
    for (const q of [1, 2, 3, 4] as const) {
      const start = (q - 1) * 3;
      const end = start + 2;
      const rows = monthlyRecords.filter(
        (r) => r.year === year && r.monthIndex >= start && r.monthIndex <= end && r.sales > 0,
      );
      if (rows.length === 0) continue;
      const sales = rows.reduce((s, r) => s + r.sales, 0);
      const gm = rows.reduce((s, r) => s + r.gm, 0);
      out.push({
        id: `${year}-Q${q}`,
        label: `Q${q} ${year}`,
        year,
        quarter: q,
        startMonth: start,
        endMonth: end,
        sales,
        gm,
        gmPct: sales > 0 ? gm / sales : 0,
      });
    }
  }
  return out;
})();

/** 2026 H1 monthly detail (freight & eng excluded sell amounts from Total Booked sheet). */
export interface MonthlyDetail2026 {
  month: MonthKey;
  monthIndex: number;
  weight: number;
  cost: number;
  gm: number;
  sell: number;
  gmPct: number;
  costPerLb: number;
  sellPerLb: number;
}

export const detail2026: MonthlyDetail2026[] = [
  {
    month: "January",
    monthIndex: 0,
    weight: 2939731.46,
    cost: 4976264.16,
    gm: 1903606.97,
    sell: 6874654.83,
    gmPct: 0.2769,
    costPerLb: 1.6928,
    sellPerLb: 2.3385,
  },
  {
    month: "February",
    monthIndex: 1,
    weight: 4887249.8,
    cost: 7870413.84,
    gm: 2947886.68,
    sell: 10815189.53,
    gmPct: 0.2726,
    costPerLb: 1.6104,
    sellPerLb: 2.2129,
  },
  {
    month: "March",
    monthIndex: 2,
    weight: 4110366.85,
    cost: 7167601.89,
    gm: 2456652.9,
    sell: 9624254.79,
    gmPct: 0.2553,
    costPerLb: 1.7438,
    sellPerLb: 2.3415,
  },
  {
    month: "April",
    monthIndex: 3,
    weight: 2554974.27,
    cost: 4568086.99,
    gm: 1638639.85,
    sell: 6246507.75,
    gmPct: 0.2623,
    costPerLb: 1.7879,
    sellPerLb: 2.4448,
  },
  {
    month: "May",
    monthIndex: 4,
    weight: 3306464,
    cost: 5970094.67,
    gm: 2618951.2,
    sell: 8597702.87,
    gmPct: 0.3046,
    costPerLb: 1.8056,
    sellPerLb: 2.6003,
  },
  {
    month: "June",
    monthIndex: 5,
    weight: 2817105.44,
    cost: 5512666.03,
    gm: 2096011.57,
    sell: 7608677.6,
    gmPct: 0.2755,
    costPerLb: 1.9569,
    sellPerLb: 2.7009,
  },
];

/** Engineering & freight ancillary totals 2026 YTD. */
export const ancillary2026 = {
  engineering: 1052520.14,
  freight: 2047101.73,
  wtw: 131884.6,
  finderFees: 72715,
  compGmFrt: 24639.05,
};

export type DatePreset =
  | "ytd-2026"
  | "q2-2026"
  | "q1-2026"
  | "h1-2026"
  | "full-2025"
  | "full-2024"
  | "full-2023"
  | "trailing-12"
  | "all"
  | "custom";

export interface DateRange {
  startYear: number;
  startMonth: number; // 0-11
  endYear: number;
  endMonth: number; // 0-11
}

export const PRESETS: { id: DatePreset; label: string; range: DateRange | null }[] = [
  { id: "ytd-2026", label: "YTD 2026", range: { startYear: 2026, startMonth: 0, endYear: 2026, endMonth: 5 } },
  { id: "q2-2026", label: "Q2 2026", range: { startYear: 2026, startMonth: 3, endYear: 2026, endMonth: 5 } },
  { id: "q1-2026", label: "Q1 2026", range: { startYear: 2026, startMonth: 0, endYear: 2026, endMonth: 2 } },
  { id: "h1-2026", label: "H1 2026", range: { startYear: 2026, startMonth: 0, endYear: 2026, endMonth: 5 } },
  { id: "full-2025", label: "FY 2025", range: { startYear: 2025, startMonth: 0, endYear: 2025, endMonth: 11 } },
  { id: "full-2024", label: "FY 2024", range: { startYear: 2024, startMonth: 0, endYear: 2024, endMonth: 11 } },
  { id: "full-2023", label: "FY 2023", range: { startYear: 2023, startMonth: 0, endYear: 2023, endMonth: 11 } },
  {
    id: "trailing-12",
    label: "Trailing 12",
    range: { startYear: 2025, startMonth: 6, endYear: 2026, endMonth: 5 },
  },
  { id: "all", label: "All data", range: { startYear: 2023, startMonth: 0, endYear: 2026, endMonth: 5 } },
  { id: "custom", label: "Custom", range: null },
];

function toOrdinal(year: number, month: number): number {
  return year * 12 + month;
}

export function inRange(r: MonthlyRecord, range: DateRange): boolean {
  const t = toOrdinal(r.year, r.monthIndex);
  return t >= toOrdinal(range.startYear, range.startMonth) && t <= toOrdinal(range.endYear, range.endMonth);
}

export function priorYearRange(range: DateRange): DateRange {
  return {
    startYear: range.startYear - 1,
    startMonth: range.startMonth,
    endYear: range.endYear - 1,
    endMonth: range.endMonth,
  };
}

export interface DashboardMetrics {
  revenue: number;
  gm: number;
  gmPct: number;
  priorRevenue: number;
  growth: number;
  /** Volume churn: share of prior-year revenue lost on YoY-declining months */
  churn: number;
  months: MonthlyRecord[];
  priorMonths: MonthlyRecord[];
  monthCount: number;
  avgMonthly: number;
}

export function computeMetrics(range: DateRange): DashboardMetrics {
  const months = monthlyRecords.filter((r) => inRange(r, range) && r.sales > 0);
  const priorRange = priorYearRange(range);
  const priorMonths = monthlyRecords.filter((r) => inRange(r, priorRange) && r.sales > 0);

  const revenue = months.reduce((s, r) => s + r.sales, 0);
  const gm = months.reduce((s, r) => s + r.gm, 0);
  const priorRevenue = priorMonths.reduce((s, r) => s + r.sales, 0);
  const growth = priorRevenue > 0 ? (revenue - priorRevenue) / priorRevenue : 0;

  // Churn proxy: for each month present in both periods, sum prior revenue that declined
  let lost = 0;
  let base = 0;
  for (const p of priorMonths) {
    const cur = months.find((m) => m.monthIndex === p.monthIndex);
    base += p.sales;
    if (cur && cur.sales < p.sales) {
      lost += p.sales - cur.sales;
    } else if (!cur) {
      lost += p.sales;
    }
  }
  const churn = base > 0 ? lost / base : 0;

  return {
    revenue,
    gm,
    gmPct: revenue > 0 ? gm / revenue : 0,
    priorRevenue,
    growth,
    churn,
    months,
    priorMonths,
    monthCount: months.length,
    avgMonthly: months.length > 0 ? revenue / months.length : 0,
  };
}

export function chartSeries(range: DateRange) {
  const months = monthlyRecords.filter((r) => inRange(r, range) && r.sales > 0);
  const priorRange = priorYearRange(range);
  const prior = monthlyRecords.filter((r) => inRange(r, priorRange) && r.sales > 0);

  return months.map((m) => {
    const p = prior.find((x) => x.monthIndex === m.monthIndex);
    return {
      key: `${m.month.slice(0, 3)} ${m.year}`,
      month: m.month,
      year: m.year,
      monthIndex: m.monthIndex,
      revenue: m.sales,
      gm: m.gm,
      gmPct: m.gmPct * 100,
      priorRevenue: p?.sales ?? 0,
      priorGm: p?.gm ?? 0,
    };
  });
}

/** Scale YTD segment mix to the selected range when it falls inside 2026 H1. */
export function scaledSegments(metrics: DashboardMetrics): SegmentRow[] {
  const ytdSales = monthlyRecords
    .filter((r) => r.year === 2026 && r.sales > 0)
    .reduce((s, r) => s + r.sales, 0);
  const ratio = ytdSales > 0 && metrics.months.every((m) => m.year === 2026) ? metrics.revenue / ytdSales : 1;

  // Only show segment table when selection is primarily 2026
  if (!metrics.months.some((m) => m.year === 2026)) {
    // Fall back: synthesize segment-like rows from annual totals by month share
    return [];
  }

  return segmentYtd2026.map((seg) => ({
    ...seg,
    weight: seg.weight * ratio,
    cost: seg.cost * ratio,
    gm: seg.gm * ratio,
    sell: seg.sell * ratio,
    fabTons: seg.fabTons * ratio,
  }));
}
