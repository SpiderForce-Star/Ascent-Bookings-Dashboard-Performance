import { ArrowDownRight, ArrowUpRight, DollarSign, Percent, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import type { DashboardMetrics } from "@/data/bookings";

interface KpiCardsProps {
  metrics: DashboardMetrics;
}

function Delta({ value, invert = false }: { value: number; invert?: boolean }) {
  const positive = invert ? value <= 0 : value >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular",
        positive ? "text-[var(--color-success)]" : "text-[var(--color-danger)]",
      )}
    >
      <Icon className="size-3.5" strokeWidth={2.5} />
      {formatPercent(value)}
    </span>
  );
}

export function KpiCards({ metrics }: KpiCardsProps) {
  const cards = [
    {
      id: "sales",
      label: "Sales",
      value: formatCurrency(metrics.revenue, true),
      full: formatCurrency(metrics.revenue),
      hint: `${metrics.monthCount} mo · vs ${formatCurrency(metrics.priorRevenue, true)} prior year`,
      icon: DollarSign,
      accent: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
      footer: <Delta value={metrics.growth} />,
      footerLabel: "YoY",
    },
    {
      id: "gm-dollars",
      label: "Gross margin $",
      value: formatCurrency(metrics.gm, true),
      full: formatCurrency(metrics.gm),
      hint: `Avg ${formatCurrency(metrics.avgMonthly, true)} sales / month`,
      icon: DollarSign,
      accent: "bg-[var(--color-info-soft)] text-[var(--color-info)]",
      footer: (
        <span className="text-xs text-[var(--color-fg-subtle)] tabular">
          {(metrics.gmPct * 100).toFixed(1)}%
        </span>
      ),
      footerLabel: "GM rate",
    },
    {
      id: "gm-pct",
      label: "Gross margin %",
      value: `${(metrics.gmPct * 100).toFixed(1)}%`,
      full: `${(metrics.gmPct * 100).toFixed(2)}% · ${formatCurrency(metrics.gm)} GM`,
      hint: "Gross margin on bookings in range",
      icon: Percent,
      accent: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
      footer: (
        <span className="text-xs text-[var(--color-fg-subtle)] tabular">{formatCurrency(metrics.gm, true)}</span>
      ),
      footerLabel: "GM dollars",
    },
    {
      id: "yoy",
      label: "YoY growth",
      value: formatPercent(metrics.growth),
      full: `${formatPercent(metrics.growth, 2)} year-over-year vs same months prior year`,
      hint:
        metrics.priorRevenue > 0
          ? `Volume churn ${formatPercent(metrics.churn).replace("+", "")} on declining months`
          : "No prior-year baseline",
      icon: metrics.growth >= 0 ? TrendingUp : TrendingDown,
      accent:
        metrics.growth >= 0
          ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
          : "bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
      footer: <Delta value={metrics.growth} />,
      footerLabel: "Same months LY",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Tooltip key={card.id}>
            <TooltipTrigger asChild>
              <Card className="group cursor-default transition-shadow duration-200 hover:shadow-[var(--shadow-md)]">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-fg-subtle)]">
                        {card.label}
                      </p>
                      <p className="font-display text-2xl font-semibold tracking-tight tabular sm:text-[1.75rem]">
                        {card.value}
                      </p>
                      <div className="flex items-center gap-2">
                        {card.footer}
                        <span className="text-xs text-[var(--color-fg-subtle)]">{card.footerLabel}</span>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
                        card.accent,
                      )}
                    >
                      <Icon className="size-5" strokeWidth={2} />
                    </div>
                  </div>
                  <p className="mt-3 truncate text-xs text-[var(--color-fg-muted)]">{card.hint}</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              {card.full}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

export function MetricBadge({ metrics }: { metrics: DashboardMetrics }) {
  const positive = metrics.growth >= 0;
  return (
    <Badge variant={positive ? "success" : "danger"} className="gap-1">
      {positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
      {formatPercent(metrics.growth)} YoY
    </Badge>
  );
}
