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
      id: "revenue",
      label: "Total revenue",
      value: formatCurrency(metrics.revenue, true),
      full: formatCurrency(metrics.revenue),
      hint: `vs ${formatCurrency(metrics.priorRevenue, true)} prior period`,
      icon: DollarSign,
      accent: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
      footer: <Delta value={metrics.growth} />,
      footerLabel: "YoY growth",
    },
    {
      id: "growth",
      label: "Revenue growth",
      value: formatPercent(metrics.growth),
      full: `${formatPercent(metrics.growth, 2)} year-over-year`,
      hint: metrics.priorRevenue > 0 ? "Compared to same months prior year" : "No prior-year baseline",
      icon: metrics.growth >= 0 ? TrendingUp : TrendingDown,
      accent:
        metrics.growth >= 0
          ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
          : "bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
      footer: (
        <span className="text-xs text-[var(--color-fg-subtle)] tabular">
          Avg {formatCurrency(metrics.avgMonthly, true)}/mo
        </span>
      ),
      footerLabel: "Monthly avg",
    },
    {
      id: "churn",
      label: "Volume churn",
      value: formatPercent(metrics.churn).replace("+", ""),
      full: `${(metrics.churn * 100).toFixed(1)}% of prior-year revenue not retained on declining months`,
      hint: "Share of prior-year booking volume lost on YoY declines",
      icon: TrendingDown,
      accent:
        metrics.churn <= 0.15
          ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
          : metrics.churn <= 0.3
            ? "bg-[var(--color-warn-soft)] text-[var(--color-warn)]"
            : "bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
      footer: <Delta value={-metrics.churn} invert />,
      footerLabel: "Lower is better",
    },
    {
      id: "gm",
      label: "Gross margin",
      value: `${(metrics.gmPct * 100).toFixed(1)}%`,
      full: `${formatCurrency(metrics.gm)} GM · ${(metrics.gmPct * 100).toFixed(2)}%`,
      hint: "Gross margin on bookings in range",
      icon: Percent,
      accent: "bg-[var(--color-info-soft)] text-[var(--color-info)]",
      footer: (
        <span className="text-xs text-[var(--color-fg-subtle)] tabular">{formatCurrency(metrics.gm, true)}</span>
      ),
      footerLabel: "GM dollars",
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
