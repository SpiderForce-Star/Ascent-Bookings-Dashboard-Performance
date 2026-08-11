/**
 * Client-side Excel / PDF / CSV export for steel cost forecast executive reports.
 */

import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { RiskFactors, SteelAdjustedRow } from "@/data/steel-forecast";

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
  return data.slice().sort((a, b) => a.Category.localeCompare(b.Category) || a.Month.localeCompare(b.Month));
}

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

export function downloadSteelExcel(
  df: SteelAdjustedRow[],
  risks: RiskFactors,
  category: string,
  modelSource: string,
) {
  const wb = XLSX.utils.book_new();
  const summary = [
    ["Ascent Buildings LLC", "US Steel Cost 2-Year Forecast"],
    ["Report Generated", new Date().toISOString()],
    ["Model Source", modelSource],
    ["Focus Category", category],
    ["Industry Focus", "PEMB / CSI Division 13 Special Construction"],
    [],
    ["Risk Factor", "Value"],
    ["Tariff Change (%)", risks.tariff_change_pct],
    ["China Dumping Risk (%)", risks.china_dumping_risk_pct],
    ["Geo Risk Premium (%)", risks.geo_risk_premium_pct],
    ["Social/Demand Volatility (%)", risks.social_demand_vol_pct],
    [],
    [
      "Methodology",
      "Fast Markets + hybrid Bayesian / seasonal MoM (±0.4–0.5%); tariff pass-through 0.38; geo sensitivity 0.55",
    ],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Executive Summary");

  const catRows = forecastTableRows(df, category).map((r) => ({
    Month: r.Month,
    Category: r.Category,
    Base_Price_per_Ton: r.Base_Price_per_Ton,
    MoM_Pct: r.MoM_Pct,
    GeoRiskPremium_Pct: r.GeoRiskPremium_Pct,
    Adjusted_Price_per_Ton: r.Adjusted_Price_per_Ton,
    Adj_MoM_Pct: r.Adj_MoM_Pct,
    Risk_Uplift_Pct: r.Risk_Uplift_Pct,
    Adjustment_Factor: r.Adjustment_Factor,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(catRows), "Category Forecast");

  const fullRows = forecastTableRows(df).map((r) => ({
    Month: r.Month,
    Category: r.Category,
    Base_Price_per_Ton: r.Base_Price_per_Ton,
    MoM_Pct: r.MoM_Pct,
    GeoRiskPremium_Pct: r.GeoRiskPremium_Pct,
    Adjusted_Price_per_Ton: r.Adjusted_Price_per_Ton,
    Adj_MoM_Pct: r.Adj_MoM_Pct,
    Risk_Uplift_Pct: r.Risk_Uplift_Pct,
    Adjustment_Factor: r.Adjustment_Factor,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fullRows), "Full Forecast Detail");

  // Wide pivots
  const months = [...new Set(df.map((r) => r.Month))].sort();
  const cats = [...new Set(df.map((r) => r.Category))].sort();
  const baseWide: (string | number)[][] = [["Month", ...cats]];
  const adjWide: (string | number)[][] = [["Month", ...cats]];
  for (const m of months) {
    const br: (string | number)[] = [m];
    const ar: (string | number)[] = [m];
    for (const c of cats) {
      const row = df.find((r) => r.Month === m && r.Category === c);
      br.push(row?.Base_Price_per_Ton ?? "");
      ar.push(row?.Adjusted_Price_per_Ton ?? "");
    }
    baseWide.push(br);
    adjWide.push(ar);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(baseWide), "Base Prices Wide");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(adjWide), "Adjusted Prices Wide");

  XLSX.writeFile(wb, "ascent_steel_cost_forecast.xlsx");
}

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
  doc.setTextColor(200, 16, 46); // Ascent red
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
    "Methodology: Base path follows refined high-accuracy MoM patterns (±0.4–0.5%) aligned with Fast Markets and hybrid seasonal trains. Risk-adjusted path applies tariff pass-through (0.38), China dumping pressure/premium, geo risk premium (8–11%), and social/demand volatility oscillation. Categories target PEMB/MBMA production mix (plates, beams/channels, sub-framing, sheet/trim, HSS, TNFAB). CONFIDENTIAL — internal Ascent Buildings LLC leadership review.";
  doc.text(notes, 40, y + 18, { maxWidth: pageW - 80 });

  doc.save("ascent_steel_cost_forecast.pdf");
}

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

export function downloadStateSteelSheetsExcel(sheets: StateSteelSheetRow[], risks: RiskFactors) {
  const wb = XLSX.utils.book_new();
  const cover = [
    ["Ascent Buildings LLC — VP Sales Steel Cost State Pack"],
    ["Generated", new Date().toISOString()],
    ["Plant", "Portland, TN · ~600-mile PEMB / Div 13 footprint"],
    ["Tariff %", risks.tariff_change_pct],
    ["Dumping risk %", risks.china_dumping_risk_pct],
    ["Geo premium %", risks.geo_risk_premium_pct],
    ["Demand vol %", risks.social_demand_vol_pct],
    [],
    [
      "Note",
      "Illustrative steel cost outlook for rep handoff — not booked revenue. Use with Sales sheets tab.",
    ],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cover), "Cover");

  const summary = sheets.map((s) => ({
    State: s.name,
    Code: s.code,
    Region: s.region,
    Demand: s.demand,
    PEMB_Share_Pct: Math.round(s.pembShare * 100),
    Risk_Level: s.riskLevel,
    Avg_Uplift_Pct: Math.round(s.avgUplift * 100) / 100,
    Overall_Adj_Price: Math.round(s.overallAdjPrice),
    Focus_Categories: s.focusCategories.join("; "),
    Recommended_Action: s.recommendedAction,
    Talking_Points: s.talkingPoints.join(" | "),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "All States");

  for (const s of sheets) {
    const aoa = [
      [`${s.name} (${s.code}) — Steel Cost Sales Sheet`],
      ["Region", s.region],
      ["Demand score", s.demand],
      ["PEMB share", `${Math.round(s.pembShare * 100)}%`],
      ["Risk level", s.riskLevel],
      ["Avg risk uplift %", s.avgUplift],
      ["Overall adj $/ton", s.overallAdjPrice],
      ["Focus PEMB categories", s.focusCategories.join(", ")],
      ["Recommended action", s.recommendedAction],
      [],
      ["Talking points"],
      ...s.talkingPoints.map((t, i) => [`${i + 1}. ${t}`]),
    ];
    const name = s.code.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name);
  }

  XLSX.writeFile(wb, "ascent_steel_state_sales_sheets.xlsx");
}
