import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    const abs = Math.abs(value);
    if (abs >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(2)}B`;
    }
    if (abs >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`;
    }
    if (abs >= 1_000) {
      return `$${(value / 1_000).toFixed(1)}K`;
    }
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, digits = 1): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(digits)}%`;
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(value);
}
