/**
 * Client-side Excel / PDF / CSV export for steel cost forecast executive reports.
 * Excel: ExcelJS multi-sheet workbook with Ascent design tokens (#c8102e headers).
 */

import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { RiskFactors, SteelAdjustedRow, TornadoRow } from "@/data/steel-forecast";
import { STEEL_CATEGORIES, tornadoImpacts } from "@/data/steel-forecast";

// ── Design tokens (match styles.css) ────────────────────────────────────────

const ASCENT_RED = "C8102E";
const INK = "1A1A1A";
const FG = "141210";
const FG_MUTED = "5C574F";
const BORDER = "D9D3CA";
const SOFT_RED = "FCE8EB";
const WHITE = "FFFFFF";
const BG_SUBTLE = "EBE8E3";

export interface StateSteelSheetRow {
  code: string;
  name: string;
  region: string;
  demand: number;
  pembShare: number;
  focusCategories: string[];
  talkingPoints: string[];
  recommendedAction: string;
  riskLevel: "Low" | "Moderate" | "Elevated";
  avgUplift: number;
  overallAdjPrice: number;
}

export interface ExportSteelForecastInput {
  forecastRows: SteelAdjustedRow[];
  risks: RiskFactors;
  stateSummaries: StateSteelSheetRow[];
  /** Focus category for overview emphasis */
  focusCategory?: string;
  modelSource?: string;
  /** Optional precomputed tornado; regenerated if omitted */
  tornado?: TornadoRow[];
  baseRowsForTornado?: SteelAdjustedRow[];
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function forecastTableRows(
  df: SteelAdjustedRow[],
  category?: string,
): SteelAdjustedRow[] {
  let data = df;
  if (category && category !== "ALL") {
    data = df.filter((r) => r.Category === category);
  }
  return data
    .slice()
    .sort((a, b) => a.Category.localeCompare(b.Category) || a.Month.localeCompare(b.Month));
}

function styleHeaderRow(row: ExcelJS.Row, colCount: number) {
  row.height = 22;
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${ASCENT_RED}` },
    };
    cell.font = { bold: true, color: { argb: `FF${WHITE}` }, name: "Calibri", size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      bottom: { style: "thin", color: { argb: `FF${BORDER}` } },
    };
  }
}

function styleTitle(cell: ExcelJS.Cell, size = 16) {
  cell.font = { bold: true, color: { argb: `FF${ASCENT_RED}` }, name: "Calibri", size };
  cell.alignment = { vertical: "middle" };
}

function moneyFmt(cell: ExcelJS.Cell) {
  cell.numFmt = "$#,##0.00";
  cell.alignment = { horizontal: "right" };
}

function pctFmt(cell: ExcelJS.Cell) {
  // values stored as percent points (e.g. 0.5 for 0.5%) — display as number + %
  cell.numFmt = '0.00"%"';
  cell.alignment = { horizontal: "right" };
}

function highlightUplift(cell: ExcelJS.Cell, upliftPct: number) {
  if (Math.abs(upliftPct) >= 3) {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${SOFT_RED}` },
    };
    cell.font = { bold: true, color: { argb: `FF${ASCENT_RED}` }, name: "Calibri", size: 10 };
  }
}

function autoWidth(ws: ExcelJS.Worksheet, min = 10, max = 42) {
  ws.columns.forEach((col) => {
    let longest = min;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const v = cell.value;
      const len = v == null ? 0 : String(v).length;
      if (len > longest) longest = len;
    });
    col.width = Math.min(max, Math.max(min, longest + 2));
  });
}

function addFooterNote(ws: ExcelJS.Worksheet, row: number, text: string) {
  const cell = ws.getCell(row, 1);
  cell.value = text;
  cell.font = { italic: true, color: { argb: `FF${FG_MUTED}` }, name: "Calibri", size: 9 };
  cell.alignment = { wrapText: true, vertical: "top" };
  ws.mergeCells(row, 1, row + 2, 6);
  ws.getRow(row).height = 48;
}

/**
 * Build the full executive multi-sheet workbook (ExcelJS).
 * Sheets: Cover/Methodology · Overview · Categories · Sensitivity · State sheets
 */
export async function exportSteelForecastWorkbook(
  input: ExportSteelForecastInput,
): Promise<void> {
  const {
    forecastRows,
    risks,
    stateSummaries,
    focusCategory = "Overall",
    modelSource = "Sample / Offline",
  } = input;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Ascent Buildings LLC";
  wb.created = new Date();
  wb.modified = new Date();
  wb.lastModifiedBy = "Ascent Steel Cost Forecast";

  const tornado =
    input.tornado ??
    tornadoImpacts(
      forecastRows.map((r) => ({
        Month: r.Month,
        Date: r.Date,
        Category: r.Category,
        Base_Price_per_Ton: r.Base_Price_per_Ton,
        MoM_Pct: r.MoM_Pct,
        GeoRiskPremium_Pct: r.GeoRiskPremium_Pct,
        Model_Source: r.Model_Source,
      })),
      focusCategory,
      risks,
    );

  // ── 1. Cover / Methodology ──────────────────────────────────────────────
  {
    const ws = wb.addWorksheet("Cover Methodology", {
      properties: { tabColor: { argb: `FF${ASCENT_RED}` } },
      views: [{ state: "frozen", ySplit: 1 }],
    });
    ws.getColumn(1).width = 32;
    ws.getColumn(2).width = 56;

    styleTitle(ws.getCell("A1"), 18);
    ws.getCell("A1").value = "Ascent Buildings LLC";
    ws.getCell("A2").value = "US Steel Cost 2-Year Forecast — Executive Workbook";
    ws.getCell("A2").font = { bold: true, size: 13, color: { argb: `FF${INK}` }, name: "Calibri" };
    ws.getCell("A3").value = "PEMB / CSI Division 13 Special Construction materials";
    ws.getCell("A3").font = { size: 11, color: { argb: `FF${FG_MUTED}` }, name: "Calibri" };

    const meta: [string, string | number][] = [
      ["Report generated", new Date().toLocaleString()],
      ["Model source", modelSource],
      ["Focus category", focusCategory],
      ["Plant / footprint", "Portland, TN · ~600-mile SE / lower Midwest service radius"],
      ["Product focus", "Pre-Engineered Metal Buildings (PEMB) / Division 13 metal building systems"],
      ["", ""],
      ["Risk assumptions", ""],
      ["Tariff change (%)", risks.tariff_change_pct],
      ["China dumping risk (%)", risks.china_dumping_risk_pct],
      ["Geo risk premium (%)", risks.geo_risk_premium_pct],
      ["Social / demand volatility (%)", risks.social_demand_vol_pct],
      ["", ""],
      ["Engine coefficients", ""],
      ["TARIFF_PASSTHROUGH", 0.38],
      ["DUMPING_PRICE_PRESSURE", -0.12],
      ["GEO_SENSITIVITY", 0.55],
      ["VOL_MEAN_PREMIUM", 0.1],
      ["VOL_OSC_AMPLITUDE", 0.06],
      ["Uplift clamp", "[−18%, +28%]"],
    ];

    let r = 5;
    ws.getCell(`A${r}`).value = "Field";
    ws.getCell(`B${r}`).value = "Value";
    styleHeaderRow(ws.getRow(r), 2);
    r++;
    for (const [k, v] of meta) {
      if (k === "" && v === "") {
        r++;
        continue;
      }
      if (v === "" && k !== "") {
        ws.getCell(`A${r}`).value = k;
        ws.getCell(`A${r}`).font = {
          bold: true,
          color: { argb: `FF${ASCENT_RED}` },
          name: "Calibri",
          size: 11,
        };
        r++;
        continue;
      }
      ws.getCell(`A${r}`).value = k;
      ws.getCell(`B${r}`).value = v;
      ws.getCell(`A${r}`).font = { color: { argb: `FF${FG_MUTED}` }, name: "Calibri", size: 10 };
      ws.getCell(`B${r}`).font = { bold: true, color: { argb: `FF${FG}` }, name: "Calibri", size: 10 };
      r++;
    }

    r += 1;
    addFooterNote(
      ws,
      r,
      "Methodology: Base path follows refined high-accuracy MoM patterns (±0.4–0.5%) aligned with Fast Markets and hybrid seasonal trains. Risk-adjusted path applies tariff pass-through, China dumping pressure/premium, geo risk premium (8–11% band), and social/demand volatility oscillation with category-specific multipliers and horizon weighting. Categories target PEMB/MBMA production mix (plates, beams/channels, sub-framing, sheet/trim, HSS, TNFAB). CONFIDENTIAL — internal Ascent Buildings LLC leadership review. Not licensed market data.",
    );
  }

  // ── 2. Overview (Base vs Adjusted) ──────────────────────────────────────
  {
    const ws = wb.addWorksheet("Overview", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    const overall = forecastTableRows(forecastRows, "Overall");
    const headers = [
      "Month",
      "Base $/ton",
      "MoM %",
      "Adjusted $/ton",
      "Adj MoM %",
      "Risk Uplift %",
      "Adj Factor",
      "Geo Premium %",
    ];
    ws.addRow(headers);
    styleHeaderRow(ws.getRow(1), headers.length);

    for (const row of overall) {
      const excelRow = ws.addRow([
        row.Month,
        row.Base_Price_per_Ton,
        row.MoM_Pct,
        row.Adjusted_Price_per_Ton,
        row.Adj_MoM_Pct,
        row.Risk_Uplift_Pct,
        row.Adjustment_Factor,
        row.GeoRiskPremium_Pct,
      ]);
      moneyFmt(excelRow.getCell(2));
      pctFmt(excelRow.getCell(3));
      moneyFmt(excelRow.getCell(4));
      pctFmt(excelRow.getCell(5));
      pctFmt(excelRow.getCell(6));
      excelRow.getCell(7).numFmt = "0.0000";
      pctFmt(excelRow.getCell(8));
      highlightUplift(excelRow.getCell(6), row.Risk_Uplift_Pct);
    }

    // KPI summary block
    const start = overall[0];
    const end = overall[overall.length - 1];
    const avgBase =
      overall.reduce((s, r) => s + r.Base_Price_per_Ton, 0) / Math.max(overall.length, 1);
    const avgAdj =
      overall.reduce((s, r) => s + r.Adjusted_Price_per_Ton, 0) / Math.max(overall.length, 1);
    const avgUplift =
      overall.reduce((s, r) => s + r.Risk_Uplift_Pct, 0) / Math.max(overall.length, 1);

    const kpiStart = overall.length + 3;
    ws.getCell(kpiStart, 1).value = "KPI summary (Overall)";
    styleTitle(ws.getCell(kpiStart, 1), 12);
    const kpis: [string, number, string][] = [
      ["Start base $/ton", start?.Base_Price_per_Ton ?? 0, "money"],
      ["End base $/ton", end?.Base_Price_per_Ton ?? 0, "money"],
      ["Start adj $/ton", start?.Adjusted_Price_per_Ton ?? 0, "money"],
      ["End adj $/ton", end?.Adjusted_Price_per_Ton ?? 0, "money"],
      ["24-mo avg base", avgBase, "money"],
      ["24-mo avg adjusted", avgAdj, "money"],
      ["24-mo avg risk uplift %", avgUplift, "pct"],
    ];
    let kr = kpiStart + 1;
    for (const [label, val, kind] of kpis) {
      ws.getCell(kr, 1).value = label;
      ws.getCell(kr, 1).font = { bold: true, name: "Calibri", size: 10 };
      ws.getCell(kr, 2).value = val;
      if (kind === "money") moneyFmt(ws.getCell(kr, 2));
      else pctFmt(ws.getCell(kr, 2));
      kr++;
    }

    autoWidth(ws);
    ws.getColumn(1).width = 14;
  }

  // ── 3. Categories (all) + major category sheets ─────────────────────────
  {
    const ws = wb.addWorksheet("All Categories", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    const headers = [
      "Month",
      "Category",
      "Base $/ton",
      "MoM %",
      "Adjusted $/ton",
      "Adj MoM %",
      "Risk Uplift %",
      "Factor",
      "Geo %",
      "PEMB / Div 13",
    ];
    ws.addRow(headers);
    styleHeaderRow(ws.getRow(1), headers.length);

    for (const row of forecastTableRows(forecastRows)) {
      const excelRow = ws.addRow([
        row.Month,
        row.Category,
        row.Base_Price_per_Ton,
        row.MoM_Pct,
        row.Adjusted_Price_per_Ton,
        row.Adj_MoM_Pct,
        row.Risk_Uplift_Pct,
        row.Adjustment_Factor,
        row.GeoRiskPremium_Pct,
        "Yes",
      ]);
      moneyFmt(excelRow.getCell(3));
      pctFmt(excelRow.getCell(4));
      moneyFmt(excelRow.getCell(5));
      pctFmt(excelRow.getCell(6));
      pctFmt(excelRow.getCell(7));
      excelRow.getCell(8).numFmt = "0.0000";
      pctFmt(excelRow.getCell(9));
      highlightUplift(excelRow.getCell(7), row.Risk_Uplift_Pct);
    }
    autoWidth(ws);
  }

  // One sheet per major category (skip Overall — covered in Overview)
  for (const cat of STEEL_CATEGORIES) {
    if (cat === "Overall") continue;
    const rows = forecastTableRows(forecastRows, cat);
    if (!rows.length) continue;
    const sheetName = cat.replace(/[\\/*?:\[\]]/g, "").slice(0, 31);
    const ws = wb.addWorksheet(sheetName, {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    const headers = [
      "Month",
      "Base $/ton",
      "MoM %",
      "Adjusted $/ton",
      "Adj MoM %",
      "Risk Uplift %",
      "Factor",
    ];
    ws.addRow(headers);
    styleHeaderRow(ws.getRow(1), headers.length);
    for (const row of rows) {
      const excelRow = ws.addRow([
        row.Month,
        row.Base_Price_per_Ton,
        row.MoM_Pct,
        row.Adjusted_Price_per_Ton,
        row.Adj_MoM_Pct,
        row.Risk_Uplift_Pct,
        row.Adjustment_Factor,
      ]);
      moneyFmt(excelRow.getCell(2));
      pctFmt(excelRow.getCell(3));
      moneyFmt(excelRow.getCell(4));
      pctFmt(excelRow.getCell(5));
      pctFmt(excelRow.getCell(6));
      excelRow.getCell(7).numFmt = "0.0000";
      highlightUplift(excelRow.getCell(6), row.Risk_Uplift_Pct);
    }
    autoWidth(ws);
  }

  // ── 4. Sensitivity / Tornado ────────────────────────────────────────────
  {
    const ws = wb.addWorksheet("Sensitivity Tornado", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    ws.getCell("A1").value = `Tornado impacts — ${focusCategory}`;
    styleTitle(ws.getCell("A1"), 12);
    ws.mergeCells("A1:F1");

    const headers = ["Factor", "Low $/ton", "High $/ton", "Base $/ton", "Downside", "Upside", "Range"];
    ws.addRow([]);
    const headerRow = ws.addRow(headers);
    styleHeaderRow(headerRow, headers.length);

    for (const t of [...tornado].sort((a, b) => b.Range - a.Range)) {
      const excelRow = ws.addRow([
        t.Factor,
        t.Low,
        t.High,
        t.Base,
        t.Downside,
        t.Upside,
        t.Range,
      ]);
      for (let c = 2; c <= 7; c++) moneyFmt(excelRow.getCell(c));
    }

    autoWidth(ws);
    addFooterNote(
      ws,
      tornado.length + 6,
      "Tornado: one-way low/high swings of each risk factor around the applied case. Low/High values are average adjusted $/ton across the 24-month path for the focus category.",
    );
  }

  // ── 5. State summary index + per-state sheets ───────────────────────────
  {
    const ws = wb.addWorksheet("State Summaries", {
      views: [{ state: "frozen", ySplit: 1 }],
      properties: { tabColor: { argb: `FF${INK}` } },
    });
    const headers = [
      "State",
      "Code",
      "Region",
      "Demand",
      "PEMB Share %",
      "Risk Level",
      "Avg Uplift %",
      "Overall Adj $/ton",
      "Focus Categories",
      "Recommended Action",
    ];
    ws.addRow(headers);
    styleHeaderRow(ws.getRow(1), headers.length);

    for (const s of stateSummaries) {
      const excelRow = ws.addRow([
        s.name,
        s.code,
        s.region,
        s.demand,
        Math.round(s.pembShare * 1000) / 10,
        s.riskLevel,
        Math.round(s.avgUplift * 100) / 100,
        s.overallAdjPrice,
        s.focusCategories.join("; "),
        s.recommendedAction,
      ]);
      pctFmt(excelRow.getCell(7));
      moneyFmt(excelRow.getCell(8));
      if (s.riskLevel === "Elevated") {
        excelRow.getCell(6).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: `FF${SOFT_RED}` },
        };
      }
    }
    autoWidth(ws, 10, 48);
  }

  for (const s of stateSummaries) {
    const sheetName = `ST ${s.code}`.slice(0, 31);
    const ws = wb.addWorksheet(sheetName, {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    ws.getColumn(1).width = 28;
    ws.getColumn(2).width = 72;

    styleTitle(ws.getCell("A1"), 14);
    ws.getCell("A1").value = `${s.name} (${s.code}) — Steel Cost Sales Sheet`;
    ws.getCell("A2").value = "VP Sales → Regional rep handoff · PEMB / CSI Division 13";
    ws.getCell("A2").font = { color: { argb: `FF${FG_MUTED}` }, name: "Calibri", size: 10 };

    const fields: [string, string | number][] = [
      ["Region tier", s.region],
      ["Demand score", s.demand],
      ["PEMB share", `${Math.round(s.pembShare * 100)}%`],
      ["Risk level", s.riskLevel],
      ["Avg risk uplift %", s.avgUplift],
      ["Overall adj $/ton (end)", s.overallAdjPrice],
      ["Focus PEMB categories", s.focusCategories.join(", ")],
      ["Recommended action", s.recommendedAction],
    ];

    ws.getCell("A4").value = "Field";
    ws.getCell("B4").value = "Value";
    styleHeaderRow(ws.getRow(4), 2);

    let r = 5;
    for (const [k, v] of fields) {
      ws.getCell(r, 1).value = k;
      ws.getCell(r, 1).font = { bold: true, name: "Calibri", size: 10, color: { argb: `FF${FG_MUTED}` } };
      ws.getCell(r, 2).value = v;
      if (k.includes("$/ton")) moneyFmt(ws.getCell(r, 2));
      if (k.includes("uplift")) {
        ws.getCell(r, 2).value = typeof v === "number" ? v : v;
        pctFmt(ws.getCell(r, 2));
      }
      if (k === "Recommended action") {
        ws.getCell(r, 2).alignment = { wrapText: true };
        ws.getRow(r).height = 36;
      }
      r++;
    }

    r += 1;
    ws.getCell(r, 1).value = "Talking points for sales rep";
    styleTitle(ws.getCell(r, 1), 11);
    r++;
    ws.getCell(r, 1).value = "#";
    ws.getCell(r, 2).value = "Point";
    styleHeaderRow(ws.getRow(r), 2);
    r++;
    s.talkingPoints.forEach((t, i) => {
      ws.getCell(r, 1).value = i + 1;
      ws.getCell(r, 2).value = t;
      ws.getCell(r, 2).alignment = { wrapText: true };
      ws.getRow(r).height = 32;
      r++;
    });

    r += 1;
    addFooterNote(
      ws,
      r,
      "Illustrative steel cost outlook for handoff — not booked revenue by state. Pair with Sales sheets tab for pipeline / call list / quota. Generated offline from Ascent risk engine.",
    );
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, "ascent_steel_cost_forecast.xlsx");
}

/** Convenience: full workbook with state handoff sheets included. */
export async function downloadStateSteelSheetsExcel(
  sheets: StateSteelSheetRow[],
  risks: RiskFactors,
  forecastRows: SteelAdjustedRow[],
  modelSource = "State pack export",
): Promise<void> {
  await exportSteelForecastWorkbook({
    forecastRows,
    risks,
    stateSummaries: sheets,
    focusCategory: "Overall",
    modelSource,
  });
}

// ── CSV ─────────────────────────────────────────────────────────────────────

export function buildSteelCsv(df: SteelAdjustedRow[], category?: string): string {
  const rows = forecastTableRows(df, category);
  const headers = [
    "Month",
    "Category",
    "Base_Price_per_Ton",
    "MoM_Pct",
    "GeoRiskPremium_Pct",
    "Adjusted_Price_per_Ton",
    "Adj_MoM_Pct",
    "Risk_Uplift_Pct",
    "Adjustment_Factor",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.Month,
        r.Category,
        r.Base_Price_per_Ton,
        r.MoM_Pct,
        r.GeoRiskPremium_Pct,
        r.Adjusted_Price_per_Ton,
        r.Adj_MoM_Pct,
        r.Risk_Uplift_Pct,
        r.Adjustment_Factor,
      ]
        .map((v) => {
          const s = String(v);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    );
  }
  return lines.join("\n");
}

export function downloadSteelCsv(df: SteelAdjustedRow[], category?: string) {
  const csv = buildSteelCsv(df, category);
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "ascent_steel_forecast.csv");
}

/** @deprecated Use exportSteelForecastWorkbook — kept as sync-named async wrapper for call sites */
export async function downloadSteelExcel(
  df: SteelAdjustedRow[],
  risks: RiskFactors,
  category: string,
  modelSource: string,
  stateSummaries: StateSteelSheetRow[] = [],
): Promise<void> {
  await exportSteelForecastWorkbook({
    forecastRows: df,
    risks,
    stateSummaries,
    focusCategory: category,
    modelSource,
  });
}

// ── PDF ─────────────────────────────────────────────────────────────────────

export function downloadSteelPdf(
  df: SteelAdjustedRow[],
  risks: RiskFactors,
  category: string,
  modelSource: string,
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(200, 16, 46);
  doc.text("Ascent Buildings LLC", pageW / 2, 36, { align: "center" });
  doc.setFontSize(12);
  doc.setTextColor(92, 87, 79);
  doc.text("US Steel Cost 2-Year Forecast — Executive Report", pageW / 2, 54, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(20, 18, 16);
  doc.text(
    `Generated ${new Date().toLocaleString()}  |  Source: ${modelSource}  |  Focus: ${category}  |  PEMB / CSI Div 13`,
    pageW / 2,
    70,
    { align: "center" },
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(200, 16, 46);
  doc.text("Risk Factor Settings", 40, 96);
  autoTable(doc, {
    startY: 104,
    head: [["Factor", "Value"]],
    body: [
      ["Tariff Change (%)", risks.tariff_change_pct.toFixed(1)],
      ["China Dumping Risk (%)", risks.china_dumping_risk_pct.toFixed(1)],
      ["Geo Risk Premium (%)", risks.geo_risk_premium_pct.toFixed(1)],
      ["Social/Demand Volatility (%)", risks.social_demand_vol_pct.toFixed(1)],
    ],
    theme: "grid",
    headStyles: { fillColor: [200, 16, 46], textColor: 255, fontSize: 9 },
    styles: { fontSize: 8, cellPadding: 4 },
    margin: { left: 40, right: 40 },
  });

  const cat = forecastTableRows(df, category.length ? category : "Overall");
  const tableBody = cat.map((r) => [
    r.Month,
    r.Base_Price_per_Ton.toLocaleString(undefined, { maximumFractionDigits: 0 }),
    r.MoM_Pct.toFixed(2),
    r.Adjusted_Price_per_Ton.toLocaleString(undefined, { maximumFractionDigits: 0 }),
    r.Adj_MoM_Pct.toFixed(2),
    r.Risk_Uplift_Pct.toFixed(2),
    r.GeoRiskPremium_Pct.toFixed(1),
  ]);

  const afterRisk =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 160;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(200, 16, 46);
  doc.text(`Forecast Table — ${category}`, 40, afterRisk + 20);

  autoTable(doc, {
    startY: afterRisk + 28,
    head: [["Month", "Base $/ton", "MoM %", "Adj $/ton", "Adj MoM %", "Risk Uplift %", "Geo %"]],
    body: tableBody,
    theme: "grid",
    headStyles: { fillColor: [26, 26, 26], textColor: 255, fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 3, halign: "right" },
    columnStyles: { 0: { halign: "left" } },
    margin: { left: 40, right: 40 },
  });

  const y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 400;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(92, 87, 79);
  const notes =
    "Methodology: Base path follows refined high-accuracy MoM patterns (±0.4–0.5%) aligned with Fast Markets and hybrid seasonal trains. Risk-adjusted path applies tariff pass-through (0.38), China dumping pressure/premium, geo risk premium (8–11%), and social/demand volatility oscillation. Categories target PEMB/MBMA production mix. CONFIDENTIAL — internal Ascent Buildings LLC leadership review.";
  doc.text(notes, 40, y + 18, { maxWidth: pageW - 80 });

  doc.save("ascent_steel_cost_forecast.pdf");
}
