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
              ? "Monthly bookings in the selected range · Grand Total matches the KPI cards"
              : "Product / plant mix scaled to 2026 selection · Components Only is a product line, not extra revenue"}
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
                <tr className="border-t-2 border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)] text-sm font-semibold">
                  <td className="py-3 pr-3">Grand Total</td>
                  <td className="py-3 pr-3 text-right tabular">
                    {formatCurrency(monthlyRows.reduce((s, r) => s + r.revenue, 0))}
                  </td>
                  <td className="py-3 pr-3 text-right tabular text-[var(--color-fg-muted)]">
                    {formatCurrency(monthlyRows.reduce((s, r) => s + r.priorRevenue, 0))}
                  </td>
                  <td className="py-3 pr-3" />
                  <td className="py-3 pr-3 text-right tabular">
                    {formatCurrency(monthlyRows.reduce((s, r) => s + r.gm, 0))}
                  </td>
                  <td className="py-3 text-right tabular">
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
          <>
            {(() => {
              const comp = rows.find((r) => r.id === "comp");
              const rangeRev = monthlyRows.reduce((s, r) => s + r.revenue, 0);
              const rangeGm = monthlyRows.reduce((s, r) => s + r.gm, 0);
              if (!comp || rangeRev <= 0) return null;
              const share = comp.sell / rangeRev;
              return (
                <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]/50 px-3 py-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-primary)]">
                    Components Only · scaled to this range
                  </p>
                  <p className="mt-0.5 text-sm">
                    <span className="font-display text-lg font-semibold tabular">{formatCurrency(comp.sell, true)}</span>
                    <span className="text-[var(--color-fg-muted)]">
                      {" "}
                      · {formatCurrency(comp.gm, true)} GM · {(comp.gmPct * 100).toFixed(1)}% ·{" "}
                      {(share * 100).toFixed(1)}% of Grand Total
                    </span>
                  </p>
                  <p className="text-[11px] text-[var(--color-fg-subtle)]">
                    Product-line slice of booked work — already inside the {formatCurrency(rangeRev, true)} Grand
                    Total ({formatCurrency(rangeGm, true)} GM). Not extra bookings.
                  </p>
                </div>
              );
            })()}
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
              {sorted.map((row) => {
                const isComp = row.id === "comp";
                return (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-[var(--color-border)]/70 transition-colors hover:bg-[var(--color-bg-subtle)]/60",
                    isComp && "bg-[var(--color-primary-soft)]/40",
                  )}
                  title={`${row.name} · ${categoryLabel[row.category]}`}
                >
                  <td className="py-3 pr-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        {isComp ? "Components Only (C)" : row.name}
                        {isComp && (
                          <Badge variant="default" className="text-[10px]">
                            C
                          </Badge>
                        )}
                      </span>
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
                );
              })}
            </tbody>
            {monthlyRows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)] text-sm font-semibold">
                  <td className="py-3 pr-3">
                    Grand Total
                    <span className="block text-xs font-normal text-[var(--color-fg-subtle)]">
                      Range bookings — segments overlap and do not sum to this
                    </span>
                  </td>
                  <td className="py-3 pl-3 text-right tabular">
                    {formatCurrency(monthlyRows.reduce((s, r) => s + r.revenue, 0))}
                  </td>
                  <td className="py-3 pl-3 text-right tabular">
                    {formatCurrency(monthlyRows.reduce((s, r) => s + r.gm, 0))}
                  </td>
                  <td className="py-3 pl-3 text-right tabular">
                    {(() => {
                      const rev = monthlyRows.reduce((s, r) => s + r.revenue, 0);
                      const gm = monthlyRows.reduce((s, r) => s + r.gm, 0);
                      return rev > 0 ? `${((gm / rev) * 100).toFixed(1)}%` : "—";
                    })()}
                  </td>
                  <td className="py-3 pl-3" />
                  <td className="py-3 pl-3" />
                </tr>
              </tfoot>
            )}
          </table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
