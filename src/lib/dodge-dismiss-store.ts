/**
 * Persist dismissed Dodge project ids so Active board stays clean.
 * Works for demo (demo-001…) and live project ids. Does not delete source data.
 */

import { useSyncExternalStore } from "react";

export const DODGE_DISMISS_STORAGE_KEY = "ascent-dodge-dismissed-v1";

type Listener = () => void;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function loadIds(): Set<string> {
  if (!canUseStorage()) return new Set();
  try {
    const raw = localStorage.getItem(DODGE_DISMISS_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string" && x.length > 0));
  } catch {
    return new Set();
  }
}

function saveIds(ids: Set<string>): void {
  if (!canUseStorage()) return;
  try {
    if (ids.size === 0) localStorage.removeItem(DODGE_DISMISS_STORAGE_KEY);
    else localStorage.setItem(DODGE_DISMISS_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* quota / private mode */
  }
}

let dismissed = loadIds();
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

export function getDismissedIds(): string[] {
  return [...dismissed];
}

export function isDismissed(id: string): boolean {
  return dismissed.has(id);
}

export function dismissProject(id: string): void {
  if (!id || dismissed.has(id)) return;
  dismissed = new Set(dismissed);
  dismissed.add(id);
  saveIds(dismissed);
  emit();
}

export function restoreProject(id: string): void {
  if (!dismissed.has(id)) return;
  dismissed = new Set(dismissed);
  dismissed.delete(id);
  saveIds(dismissed);
  emit();
}

export function restoreAllDismissed(): void {
  if (dismissed.size === 0) return;
  dismissed = new Set();
  saveIds(dismissed);
  emit();
}

export function subscribeDismissed(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function reloadDismissedFromStorage(): void {
  dismissed = loadIds();
  emit();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === DODGE_DISMISS_STORAGE_KEY) reloadDismissedFromStorage();
  });
}

function getSnapshot(): string[] {
  return getDismissedIds();
}

/** React hook — re-renders when dismiss list changes. */
export function useDodgeDismissed(): {
  dismissedIds: Set<string>;
  dismissedCount: number;
  dismiss: (id: string) => void;
  restore: (id: string) => void;
  restoreAll: () => void;
  isDismissed: (id: string) => boolean;
} {
  const ids = useSyncExternalStore(subscribeDismissed, getSnapshot, getSnapshot);
  const set = new Set(ids);
  return {
    dismissedIds: set,
    dismissedCount: set.size,
    dismiss: dismissProject,
    restore: restoreProject,
    restoreAll: restoreAllDismissed,
    isDismissed: (id: string) => set.has(id),
  };
}
