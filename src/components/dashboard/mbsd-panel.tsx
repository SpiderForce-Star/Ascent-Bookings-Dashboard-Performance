import { Building2, TrendingUp, Scale, Percent, DollarSign } from "lucide-react";
import { mbsd2026, mbsdYtd2026 } from "@/data/bookings";
import { cn } from "@/lib/utils";

function fmt(n: number, compact = true) {
  if (compact && Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (compact && Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof DollarSign;
  accent?: string;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-fg-subtle)]">
          {label}
        </p>
        <Icon className={cn("size-4", accent ?? "text-[var(--color-fg-muted)]")} />
      </div>
      <p className="mt-1.5 text-2xl font-semibold tabular tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs text-[var(--color-fg-muted)]">{sub}</p>}
    </div>
  );
}

export function MbsdPanel() {
  const y = mbsdYtd2026;
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-[var(--color-primary)]" />
            <h2 className="text-lg font-semibold tracking-tight">
              MBSD · Metal Building Solutions Direct
            </h2>
          </div>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            Direct-channel bookings · January – July 2026 ·{" "}
            {(y.contributionPct * 100).toFixed(1)}% of company YTD sales
          </p>
        </div>
        <div className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-medium text-[var(--color-primary)]">
          YTD actuals
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Sell"
          value={fmt(y.sell)}
          sub="Freight & Eng excluded base"
          icon={DollarSign}
        />
        <MetricCard
          label="Gross Margin"
          value={fmt(y.gm)}
          sub={`${(y.gmPct * 100).toFixed(1)}% rate`}
          icon={TrendingUp}
          accent="text-[var(--color-success)]"
        />
        <MetricCard
          label="GM Rate"
          value={`${(y.gmPct * 100).toFixed(1)}%`}
          sub="In line with company 25.5%"
          icon={Percent}
        />
        <MetricCard
          label="Fab Tons"
          value={y.fabTons.toLocaleString()}
          sub={`${(y.weight / 2000).toFixed(0)} short tons`}
          icon={Scale}
        />
      </div>

      {/* Unit economics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-[var(--color-fg-subtle)]">
            Cost / lb
          </p>
          <p className="mt-0.5 font-semibold tabular">
            ${(y.cost / y.weight).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-[var(--color-fg-subtle)]">
            Sell / lb
          </p>
          <p className="mt-0.5 font-semibold tabular">
            ${(y.sell / y.weight).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-[var(--color-fg-subtle)]">
            GM / lb
          </p>
          <p className="mt-0.5 font-semibold tabular text-[var(--color-success)]">
            ${(y.gm / y.weight).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-[var(--color-fg-subtle)]">
            Sell / ton
          </p>
          <p className="mt-0.5 font-semibold tabular">
            ${(y.sell / y.fabTons).toFixed(0)}
          </p>
        </div>
      </div>

      {/* Monthly table */}
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-2.5">
          <h3 className="text-sm font-semibold">Monthly detail · 2026</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[11px] uppercase tracking-wide text-[var(--color-fg-subtle)]">
                <th className="px-4 py-2.5 font-medium">Month</th>
                <th className="px-4 py-2.5 font-medium text-right">Weight (lbs)</th>
                <th className="px-4 py-2.5 font-medium text-right">Sell</th>
                <th className="px-4 py-2.5 font-medium text-right">GM $</th>
                <th className="px-4 py-2.5 font-medium text-right">GM %</th>
                <th className="px-4 py-2.5 font-medium text-right">Fab Tons</th>
              </tr>
            </thead>
            <tbody>
              {mbsd2026.map((r) => (
                <tr
                  key={r.month}
                  className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-subtle)]/50"
                >
                  <td className="px-4 py-2.5 font-medium">{r.month}</td>
                  <td className="px-4 py-2.5 text-right tabular text-[var(--color-fg-muted)]">
                    {r.weight.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular">
                    {fmt(r.sell, false)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular text-[var(--color-success)]">
                    {fmt(r.gm, false)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular">
                    {(r.gmPct * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-2.5 text-right tabular">
                    {r.fabTons.toLocaleString()}
                  </td>
                </tr>
              ))}
              <tr className="bg-[var(--color-bg-subtle)] font-semibold">
                <td className="px-4 py-2.5">YTD Total</td>
                <td className="px-4 py-2.5 text-right tabular">
                  {y.weight.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-right tabular">
                  {fmt(y.sell, false)}
                </td>
                <td className="px-4 py-2.5 text-right tabular text-[var(--color-success)]">
                  {fmt(y.gm, false)}
                </td>
                <td className="px-4 py-2.5 text-right tabular">
                  {(y.gmPct * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-2.5 text-right tabular">
                  {y.fabTons.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights */}
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
        <h3 className="text-sm font-semibold">Executive notes</h3>
        <ul className="mt-2 space-y-1.5 text-sm text-[var(--color-fg-muted)]">
          <li>
            • MBSD contributes ~13.6% of company YTD bookings ($8.47M of $62.18M).
          </li>
          <li>
            • Margin rate (25.8%) is essentially in line with the company average of 25.5%.
          </li>
          <li>
            • Strongest months by sell: March ($1.59M) and July ($1.17M).
          </li>
          <li>
            • Unit economics remain healthy: ~$2.41 sell / lb and ~$0.62 GM / lb.
          </li>
        </ul>
      </div>
    </div>
  );
}
