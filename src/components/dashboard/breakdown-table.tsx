import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SegmentRow } from "@/data/bookings";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";

type SortKey = "name" | "sell" | "gm" | "gmPct" | "fabTons" | "weight";

interface BreakdownTableProps {
  rows: SegmentRow[];
  monthlyRows: Array<{
    key: string;
    month: string;
    year: number;
    revenue: number;
    gm: number;
    gmPct: number;
    priorRevenue: number;
  }>;
}

const categoryLabel: Record<SegmentRow["category"], string> = {
  product: "Product",
  plant: "Plant",
  service: "Service",
  region: "Region",
};

export function BreakdownTable({ rows, monthlyRows }: BreakdownTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("sell");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [tab, setTab] = useState<"segments" | "months">("months");

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ArrowUpDown className="size-3.5 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Breakdown</CardTitle>
          <CardDescription>
            {tab === "months"
              ? "Monthly bookings in the selected range"
              : "Product / plant mix scaled to 2026 selection"}
          </CardDescription>
        </div>
        <div className="flex rounded-full bg-[var(--color-bg-subtle)] p-1">
          {(
            [
              ["months", "By month"],
              ["segments", "By segment"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                tab === id
                  ? "bg-[var(--color-bg-elevated)] text-[var(--color-fg)] shadow-[var(--shadow-sm)]"
                  : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto pt-0">
        {tab === "months" ? (
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-fg-subtle)]">
                <th className="pb-3 pr-3 font-medium">Period</th>
                <th className="pb-3 pr-3 text-right font-medium">Revenue</th>
                <th className="pb-3 pr-3 text-right font-medium">Prior year</th>
                <th className="pb-3 pr-3 text-right font-medium">Δ YoY</th>
                <th className="pb-3 pr-3 text-right font-medium">GM $</th>
                <th className="pb-3 text-right font-medium">GM %</th>
              </tr>
            </thead>
            <tbody>
              {monthlyRows.map((row) => {
                const delta = row.priorRevenue > 0 ? (row.revenue - row.priorRevenue) / row.priorRevenue : 0;
                return (
                  <tr
                    key={row.key}
                    className="border-b border-[var(--color-border)]/70 transition-colors hover:bg-[var(--color-bg-subtle)]/60"
                  >
                    <td className="py-3 pr-3 font-medium">{row.key}</td>
                    <td className="py-3 pr-3 text-right tabular">{formatCurrency(row.revenue)}</td>
                    <td className="py-3 pr-3 text-right tabular text-[var(--color-fg-muted)]">
                      {row.priorRevenue > 0 ? formatCurrency(row.priorRevenue) : "—"}
                    </td>
                    <td
                      className={cn(
                        "py-3 pr-3 text-right tabular font-medium",
                        delta >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]",
                      )}
                    >
                      {row.priorRevenue > 0 ? `${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(1)}%` : "—"}
                    </td>
                    <td className="py-3 pr-3 text-right tabular">{formatCurrency(row.gm)}</td>
                    <td className="py-3 text-right">
                      <Badge variant={row.gmPct >= 27 ? "success" : row.gmPct >= 24 ? "secondary" : "warn"}>
                        {row.gmPct.toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {monthlyRows.length > 0 && (
              <tfoot>
                <tr className="border-t border-[var(--color-border-strong)] text-sm font-semibold">
                  <td className="pt-3 pr-3">Total</td>
                  <td className="pt-3 pr-3 text-right tabular">
                    {formatCurrency(monthlyRows.reduce((s, r) => s + r.revenue, 0))}
                  </td>
                  <td className="pt-3 pr-3 text-right tabular text-[var(--color-fg-muted)]">
                    {formatCurrency(monthlyRows.reduce((s, r) => s + r.priorRevenue, 0))}
                  </td>
                  <td className="pt-3 pr-3" />
                  <td className="pt-3 pr-3 text-right tabular">
                    {formatCurrency(monthlyRows.reduce((s, r) => s + r.gm, 0))}
                  </td>
                  <td className="pt-3 text-right tabular">
                    {(() => {
                      const rev = monthlyRows.reduce((s, r) => s + r.revenue, 0);
                      const gm = monthlyRows.reduce((s, r) => s + r.gm, 0);
                      return rev > 0 ? `${((gm / rev) * 100).toFixed(1)}%` : "—";
                    })()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--color-fg-muted)]">
            Segment mix is available for 2026 ranges. Choose a 2026 preset to explore product and plant breakdowns.
          </p>
        ) : (
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-fg-subtle)]">
                {(
                  [
                    ["name", "Segment", "left"],
                    ["sell", "Sell amount", "right"],
                    ["gm", "GM $", "right"],
                    ["gmPct", "GM %", "right"],
                    ["fabTons", "Fab tons", "right"],
                    ["weight", "Weight (lb)", "right"],
                  ] as const
                ).map(([key, label, align]) => (
                  <th key={key} className={cn("pb-3 font-medium", align === "right" ? "pl-3 text-right" : "pr-3")}>
                    <button
                      type="button"
                      onClick={() => toggleSort(key)}
                      className={cn(
                        "inline-flex items-center gap-1 hover:text-[var(--color-fg)]",
                        align === "right" && "flex-row-reverse",
                      )}
                    >
                      {label}
                      <SortIcon k={key} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--color-border)]/70 transition-colors hover:bg-[var(--color-bg-subtle)]/60"
                  title={`${row.name} · ${categoryLabel[row.category]}`}
                >
                  <td className="py-3 pr-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{row.name}</span>
                      <span className="text-xs text-[var(--color-fg-subtle)]">{categoryLabel[row.category]}</span>
                    </div>
                  </td>
                  <td className="py-3 pl-3 text-right tabular">{formatCurrency(row.sell)}</td>
                  <td className="py-3 pl-3 text-right tabular">{formatCurrency(row.gm)}</td>
                  <td className="py-3 pl-3 text-right">
                    {row.gmPct > 0 ? (
                      <Badge variant={row.gmPct >= 0.27 ? "success" : row.gmPct >= 0.24 ? "secondary" : "warn"}>
                        {(row.gmPct * 100).toFixed(1)}%
                      </Badge>
                    ) : (
                      <span className="text-[var(--color-fg-subtle)]">—</span>
                    )}
                  </td>
                  <td className="py-3 pl-3 text-right tabular text-[var(--color-fg-muted)]">
                    {row.fabTons > 0 ? formatNumber(row.fabTons, 1) : "—"}
                  </td>
                  <td className="py-3 pl-3 text-right tabular text-[var(--color-fg-muted)]">
                    {row.weight > 0 ? formatNumber(row.weight, 0) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
