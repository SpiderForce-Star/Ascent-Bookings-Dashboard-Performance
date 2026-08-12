/**
 * Client-side territory management store.
 * Seed defaults live in src/data/territory.ts (immutable).
 * VP overrides persist in localStorage and feed Territory + Sales Sheets.
 */

import { useSyncExternalStore } from "react";
import {
  plant,
  territoryStates as SEED_STATES,
  type TerritoryState,
} from "@/data/territory";

export const TERRITORY_STORAGE_KEY = "ascent-territory-overrides-v1";

export type TerritoryRegion = TerritoryState["region"];

/** Partial per-state overrides (only fields the VP edits). */
export interface TerritoryOverride {
  region?: TerritoryRegion;
  demand?: number;
  pipeline?: number;
  pembShare?: number;
  notes?: string;
  milesFromPlant?: number;
  /** Optional assigned rep — blank by default, never seeded with demo people */
  assignedRep?: string;
}

export type TerritoryOverridesMap = Record<string, TerritoryOverride>;

/** Seed + overrides (+ assignedRep). */
export interface ManagedTerritoryState extends TerritoryState {
  assignedRep: string;
  /** True if any override exists for this code */
  isOverridden: boolean;
}

export interface TerritorySnapshot {
  states: ManagedTerritoryState[];
  overrides: TerritoryOverridesMap;
  totals: {
    stateCount: number;
    avgDemand: number;
    avgPembShare: number;
    avgPipeline: number;
    sumPipeline: number;
    coreCount: number;
    primaryCount: number;
    extendedCount: number;
    topMarkets: ManagedTerritoryState[];
    overriddenCount: number;
  };
}

type Listener = () => void;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function loadOverrides(): TerritoryOverridesMap {
  if (!canUseStorage()) return {};
  try {
    const raw = localStorage.getItem(TERRITORY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as TerritoryOverridesMap;
  } catch {
    return {};
  }
}

function saveOverrides(map: TerritoryOverridesMap): void {
  if (!canUseStorage()) return;
  try {
    if (Object.keys(map).length === 0) {
      localStorage.removeItem(TERRITORY_STORAGE_KEY);
    } else {
      localStorage.setItem(TERRITORY_STORAGE_KEY, JSON.stringify(map));
    }
  } catch {
    // quota / private mode — keep in-memory only
  }
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function sanitizePartial(partial: TerritoryOverride): TerritoryOverride {
  const out: TerritoryOverride = {};
  if (partial.region === "core" || partial.region === "primary" || partial.region === "extended") {
    out.region = partial.region;
  }
  if (partial.demand != null) out.demand = clamp(Math.round(partial.demand), 0, 100);
  if (partial.pipeline != null) out.pipeline = clamp(Math.round(partial.pipeline), 0, 200);
  if (partial.pembShare != null) {
    // accept 0–1 or 0–100
    let p = partial.pembShare;
    if (p > 1) p = p / 100;
    out.pembShare = clamp(p, 0, 1);
  }
  if (partial.notes != null) out.notes = String(partial.notes).slice(0, 500);
  if (partial.milesFromPlant != null) {
    out.milesFromPlant = clamp(Math.round(partial.milesFromPlant), 0, 2000);
  }
  if (partial.assignedRep != null) {
    out.assignedRep = String(partial.assignedRep).trim().slice(0, 80);
  }
  return out;
}

function mergeState(seed: TerritoryState, ov?: TerritoryOverride): ManagedTerritoryState {
  const hasOv = Boolean(ov && Object.keys(ov).length > 0);
  return {
    code: seed.code,
    name: seed.name,
    region: ov?.region ?? seed.region,
    demand: ov?.demand ?? seed.demand,
    milesFromPlant: ov?.milesFromPlant ?? seed.milesFromPlant,
    pipeline: ov?.pipeline ?? seed.pipeline,
    pembShare: ov?.pembShare ?? seed.pembShare,
    notes: ov?.notes ?? seed.notes,
    assignedRep: ov?.assignedRep ?? "",
    isOverridden: hasOv,
  };
}

let overrides: TerritoryOverridesMap = loadOverrides();
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

export function getTerritoryOverrides(): TerritoryOverridesMap {
  return { ...overrides };
}

export function getTerritoryStates(): ManagedTerritoryState[] {
  return SEED_STATES.map((s) => mergeState(s, overrides[s.code]));
}

export function getTerritoryState(code: string): ManagedTerritoryState | undefined {
  const seed = SEED_STATES.find((s) => s.code === code);
  if (!seed) return undefined;
  return mergeState(seed, overrides[code]);
}

export function getTerritorySnapshot(): TerritorySnapshot {
  const states = getTerritoryStates();
  const core = states.filter((t) => t.region === "core");
  const primary = states.filter((t) => t.region === "primary");
  const extended = states.filter((t) => t.region === "extended");
  const avgDemand = states.reduce((s, t) => s + t.demand, 0) / Math.max(states.length, 1);
  const avgPembShare = states.reduce((s, t) => s + t.pembShare, 0) / Math.max(states.length, 1);
  const sumPipeline = states.reduce((s, t) => s + t.pipeline, 0);
  const avgPipeline = sumPipeline / Math.max(states.length, 1);
  return {
    states,
    overrides: getTerritoryOverrides(),
    totals: {
      stateCount: states.length,
      avgDemand,
      avgPembShare,
      avgPipeline,
      sumPipeline,
      coreCount: core.length,
      primaryCount: primary.length,
      extendedCount: extended.length,
      topMarkets: [...states].sort((a, b) => b.demand - a.demand).slice(0, 5),
      overriddenCount: states.filter((s) => s.isOverridden).length,
    },
  };
}

export function updateTerritoryState(code: string, partial: TerritoryOverride): void {
  const seed = SEED_STATES.find((s) => s.code === code);
  if (!seed) return;
  const clean = sanitizePartial(partial);
  if (Object.keys(clean).length === 0) return;

  const prev = { ...(overrides[code] ?? {}) };
  const next: TerritoryOverride = { ...prev, ...clean };

  // Drop keys that match seed defaults so "isOverridden" stays accurate
  const pruned = pruneToDiffs(seed, next);
  if (Object.keys(pruned).length === 0) {
    const { [code]: _, ...rest } = overrides;
    overrides = rest;
  } else {
    overrides = { ...overrides, [code]: pruned };
  }
  saveOverrides(overrides);
  emit();
}

function pruneToDiffs(seed: TerritoryState, ov: TerritoryOverride): TerritoryOverride {
  const out: TerritoryOverride = {};
  if (ov.region != null && ov.region !== seed.region) out.region = ov.region;
  if (ov.demand != null && ov.demand !== seed.demand) out.demand = ov.demand;
  if (ov.pipeline != null && ov.pipeline !== seed.pipeline) out.pipeline = ov.pipeline;
  if (ov.pembShare != null && Math.abs(ov.pembShare - seed.pembShare) > 0.0005) {
    out.pembShare = ov.pembShare;
  }
  if (ov.notes != null && ov.notes !== seed.notes) out.notes = ov.notes;
  if (ov.milesFromPlant != null && ov.milesFromPlant !== seed.milesFromPlant) {
    out.milesFromPlant = ov.milesFromPlant;
  }
  if (ov.assignedRep != null && ov.assignedRep !== "") out.assignedRep = ov.assignedRep;
  return out;
}

export function resetTerritoryState(code: string): void {
  if (!overrides[code]) return;
  const { [code]: _, ...rest } = overrides;
  overrides = rest;
  saveOverrides(overrides);
  emit();
}

export function resetAllTerritory(): void {
  if (Object.keys(overrides).length === 0) return;
  overrides = {};
  saveOverrides(overrides);
  emit();
}

export function subscribeTerritory(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Re-read localStorage (e.g. after multi-tab storage event). */
export function reloadTerritoryFromStorage(): void {
  overrides = loadOverrides();
  emit();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === TERRITORY_STORAGE_KEY) reloadTerritoryFromStorage();
  });
}

export function useTerritory(): TerritorySnapshot & {
  updateState: typeof updateTerritoryState;
  resetState: typeof resetTerritoryState;
  resetAll: typeof resetAllTerritory;
  plant: typeof plant;
} {
  const snapshot = useSyncExternalStore(
    subscribeTerritory,
    getTerritorySnapshot,
    getTerritorySnapshot,
  );
  return {
    ...snapshot,
    updateState: updateTerritoryState,
    resetState: resetTerritoryState,
    resetAll: resetAllTerritory,
    plant,
  };
}

/** CSV of current merged territory config */
export function territoryToCsv(states?: ManagedTerritoryState[]): string {
  const rows = states ?? getTerritoryStates();
  const header = [
    "Code",
    "Name",
    "Region",
    "Miles",
    "Demand",
    "Pipeline",
    "PEMB%",
    "Notes",
    "AssignedRep",
  ];
  const lines = [header.join(",")];
  for (const s of [...rows].sort((a, b) => a.code.localeCompare(b.code))) {
    lines.push(
      [
        s.code,
        s.name,
        s.region,
        String(s.milesFromPlant),
        String(s.demand),
        String(s.pipeline),
        (s.pembShare * 100).toFixed(1),
        s.notes,
        s.assignedRep,
      ]
        .map((v) => {
          const t = String(v);
          return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
        })
        .join(","),
    );
  }
  return lines.join("\n");
}

export function downloadTerritoryCsv(states?: ManagedTerritoryState[]): void {
  const csv = territoryToCsv(states);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ascent-territory-config.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadTerritoryOverridesJson(): void {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    plant,
    overrides: getTerritoryOverrides(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ascent-territory-overrides.json";
  a.click();
  URL.revokeObjectURL(url);
}
