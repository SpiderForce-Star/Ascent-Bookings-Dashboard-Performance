/**
 * State-level steel cost talking points for VP → rep handoff.
 * Reuses territory demand / PEMB share; steel outlook from risk-adjusted Overall path.
 */

import { territoryStates } from "./territory";
import type { SteelAdjustedRow } from "./steel-forecast";
import type { StateSteelSheetRow } from "@/lib/steel-export";

const FOCUS_BY_REGION: Record<"core" | "primary" | "extended", string[]> = {
  core: ["Hot Rolled Plates", "HR I-Beams/Channels", "TNFAB", "Sub Framing"],
  primary: ["Hot Rolled Plates", "HSS Square/Rect Tubes", "Sheet/Trim Painted", "TNFAB"],
  extended: ["HR I-Beams/Channels", "HSS Round Pipes", "Sub Framing"],
};

export function buildSteelStateSheets(adjusted: SteelAdjustedRow[]): StateSteelSheetRow[] {
  const overall = adjusted
    .filter((r) => r.Category === "Overall")
    .sort((a, b) => a.Date.localeCompare(b.Date));
  const avgUplift =
    overall.length > 0
      ? overall.reduce((s, r) => s + r.Risk_Uplift_Pct, 0) / overall.length
      : 0;
  const endAdj =
    overall.length > 0 ? overall[overall.length - 1]!.Adjusted_Price_per_Ton : 0;
  const startBase = overall.length > 0 ? overall[0]!.Base_Price_per_Ton : 0;
  const endBase =
    overall.length > 0 ? overall[overall.length - 1]!.Base_Price_per_Ton : 0;
  const basePath = endBase - startBase;

  // Category-level uplifts for talking points
  const catUplift = new Map<string, number>();
  for (const cat of new Set(adjusted.map((r) => r.Category))) {
    if (cat === "Overall") continue;
    const rows = adjusted.filter((r) => r.Category === cat);
    catUplift.set(cat, rows.reduce((s, r) => s + r.Risk_Uplift_Pct, 0) / rows.length);
  }
  const hottest = [...catUplift.entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];

  return territoryStates.map((st) => {
    const riskLevel: StateSteelSheetRow["riskLevel"] =
      Math.abs(avgUplift) >= 4 ? "Elevated" : Math.abs(avgUplift) >= 1.5 ? "Moderate" : "Low";
    const focus = FOCUS_BY_REGION[st.region];

    const talkingPoints = [
      `Plant freight from Portland, TN is ~${st.milesFromPlant === 0 ? "local" : `${st.milesFromPlant} mi`} — factor into package buy-outs when steel path is ${avgUplift >= 0 ? "risk-up" : "risk-down"}.`,
      `Overall risk-adjusted steel averages ${avgUplift >= 0 ? "+" : ""}${avgUplift.toFixed(1)}% vs base path; quote validity windows matter for PEMB / Div 13 packages.`,
      hottest
        ? `Watch ${hottest[0]} (${hottest[1] >= 0 ? "+" : ""}${hottest[1].toFixed(1)}% uplift) for ${st.region === "core" ? "home-market" : "territory"} structural content.`
        : "Review plates / HSS / TNFAB mix against current risk case.",
      `State demand score ${st.demand}/100 · PEMB share ~${Math.round(st.pembShare * 100)}% of commercial shell opportunity (planning).`,
      basePath > 0
        ? `Base path is rising through the 24-mo horizon — lock mill slots early on large warehouse / industrial shells.`
        : `Base path is flat-to-soft — use price relief as a closing tool on competitive SE bids.`,
    ];

    let recommendedAction: string;
    if (riskLevel === "Elevated") {
      recommendedAction =
        "Escalate large PEMB bids to estimating same-day; use shorter quote validity; prioritize firm mill coverage on plates & primary.";
    } else if (riskLevel === "Moderate") {
      recommendedAction =
        "Standard quote windows; call out steel contingency on design/bid packages; push self-storage & warehouse repeat product.";
    } else {
      recommendedAction =
        "Competitive pricing window — pursue share in industrial / ag metal buildings; highlight fab capacity from Portland plant.";
    }

    return {
      code: st.code,
      name: st.name,
      region: st.region,
      demand: st.demand,
      pembShare: st.pembShare,
      focusCategories: focus,
      talkingPoints,
      recommendedAction,
      riskLevel,
      avgUplift,
      overallAdjPrice: endAdj,
    };
  });
}
