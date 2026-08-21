import { Building2 } from "lucide-react";
import { mbsdYtd2026 } from "@/data/bookings";

function fmt(n: number, compact = true) {
  if (compact && Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export function MbsdStrip() {
  const m = mbsdYtd2026;
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-[var(--color-primary)]" />
          <h3 className="text-sm font-semibold tracking-tight">MBSD · Metal Building Solutions Direct</h3>
        </div>
        <span className="text-xs text-[var(--color-fg-muted)] tabular">
          Jan–Jul 2026 · {(m.contributionPct * 100).toFixed(1)}% of company YTD
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-fg-subtle)]">Sell</p>
          <p className="mt-0.5 text-lg font-semibold tabular">{fmt(m.sell)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-fg-subtle)]">Gross Margin</p>
          <p className="mt-0.5 text-lg font-semibold tabular text-[var(--color-success)]">{fmt(m.gm)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-fg-subtle)]">GM Rate</p>
          <p className="mt-0.5 text-lg font-semibold tabular">{(m.gmPct * 100).toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-fg-subtle)]">Fab Tons</p>
          <p className="mt-0.5 text-lg font-semibold tabular">{m.fabTons.toLocaleString("en-US", { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-[var(--color-fg-muted)]">
        Direct-channel bookings. Margin rate in line with company average (25.5%). Peak months: March & July.
      </p>
    </div>
  );
}
