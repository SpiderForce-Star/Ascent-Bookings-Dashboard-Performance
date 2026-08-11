import type { ComponentType } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { plant, regionLabels, territoryStates, territoryTotals } from "@/data/territory";
import { MapPin, Navigation, Factory, Radius } from "lucide-react";
import { cn } from "@/lib/utils";

const regionTone: Record<string, string> = {
  core: "bg-[var(--color-primary)] text-[var(--color-primary-fg)]",
  primary: "bg-[var(--color-ink)] text-white",
  extended: "bg-[var(--color-bg-muted)] text-[var(--color-fg-muted)]",
};

export function TerritoryPanel() {
  const totals = territoryTotals();

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[var(--color-primary)]">
          <Navigation className="size-3.5" />
          Market territory
        </div>
        <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
          Portland, TN service footprint
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-fg-muted)]">
          Production facility in {plant.name}. Primary targeting radius ~{plant.radiusMiles} miles across the
          Southeast and lower Midwest — Arkansas through the Carolinas, Upper Florida, and East Texas. Product
          focus: <strong className="font-medium text-[var(--color-fg)]">PEMB / CSI Division 13</strong> metal
          building systems.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat icon={Factory} label="Plant" value="Portland, TN" />
        <Stat icon={Radius} label="Primary radius" value={`${plant.radiusMiles} mi`} />
        <Stat icon={MapPin} label="States covered" value={String(totals.stateCount)} />
        <Stat icon={Navigation} label="Avg demand score" value={totals.avgDemand.toFixed(0)} />
        <Stat icon={Factory} label="Avg PEMB share" value={`${(totals.avgPembShare * 100).toFixed(0)}%`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader>
            <CardTitle>Territory map</CardTitle>
            <CardDescription>Schematic of the ~600-mile commercial building market</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="relative aspect-square w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)]">
              <div className="absolute inset-[8%] rounded-full border border-dashed border-[var(--color-border-strong)]/60" />
              <div className="absolute inset-[22%] rounded-full border border-dashed border-[var(--color-primary)]/40" />
              <div className="absolute inset-[38%] rounded-full border border-[var(--color-primary)]/50 bg-[var(--color-primary-soft)]/30" />
              <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
                <div className="flex size-10 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-[var(--shadow-md)]">
                  <Factory className="size-5" />
                </div>
                <span className="mt-1 rounded-full bg-[var(--color-bg-elevated)] px-2 py-0.5 text-[10px] font-semibold shadow-sm">
                  Portland, TN
                </span>
              </div>
              {POSITIONS.map((p) => {
                const st = territoryStates.find((t) => t.code === p.code)!;
                return (
                  <div
                    key={p.code}
                    className="absolute z-[5] -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    title={`${st.name} · ${st.milesFromPlant} mi · demand ${st.demand}`}
                  >
                    <span
                      className={cn(
                        "inline-flex min-w-8 items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold shadow-sm",
                        regionTone[st.region],
                      )}
                    >
                      {p.code}
                    </span>
                  </div>
                );
              })}
              <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-2 text-[10px] text-[var(--color-fg-subtle)]">
                <span className="inline-flex items-center gap-1">
                  <span className="size-2 rounded-sm bg-[var(--color-primary)]" /> Core
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-2 rounded-sm bg-[var(--color-ink)]" /> Primary
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-2 rounded-sm bg-[var(--color-bg-muted)]" /> Extended
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>State demand & pipeline</CardTitle>
            <CardDescription>
              Relative commercial demand, pipeline index, and PEMB share (planning estimates — not booked
              revenue)
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[420px] overflow-y-auto pt-0">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead className="sticky top-0 bg-[var(--color-bg-elevated)]">
                <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-fg-subtle)]">
                  <th className="pb-2 pr-2 font-medium">State</th>
                  <th className="pb-2 pr-2 font-medium">Region</th>
                  <th className="pb-2 pr-2 text-right font-medium">Miles</th>
                  <th className="pb-2 pr-2 text-right font-medium">Demand</th>
                  <th className="pb-2 pr-2 text-right font-medium">Pipeline</th>
                  <th className="pb-2 text-right font-medium">PEMB</th>
                </tr>
              </thead>
              <tbody>
                {[...territoryStates]
                  .sort((a, b) => a.milesFromPlant - b.milesFromPlant)
                  .map((st) => (
                    <tr
                      key={st.code}
                      className="border-b border-[var(--color-border)]/70 hover:bg-[var(--color-bg-subtle)]/50"
                      title={st.notes}
                    >
                      <td className="py-2.5 pr-2">
                        <span className="font-medium">{st.name}</span>
                        <span className="ml-1.5 text-xs text-[var(--color-fg-subtle)]">{st.code}</span>
                      </td>
                      <td className="py-2.5 pr-2">
                        <Badge
                          variant={
                            st.region === "core" ? "default" : st.region === "primary" ? "secondary" : "outline"
                          }
                        >
                          {regionLabels[st.region].split(" ")[0]}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-2 text-right tabular text-[var(--color-fg-muted)]">
                        {st.milesFromPlant === 0 ? "—" : st.milesFromPlant}
                      </td>
                      <td className="py-2.5 pr-2 text-right">
                        <div className="inline-flex items-center gap-2">
                          <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-[var(--color-bg-muted)] sm:block">
                            <div
                              className="h-full rounded-full bg-[var(--color-primary)]"
                              style={{ width: `${st.demand}%` }}
                            />
                          </div>
                          <span className="tabular font-medium">{st.demand}</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-2 text-right tabular">{st.pipeline}</td>
                      <td className="py-2.5 text-right tabular text-[var(--color-fg-muted)]">
                        {(st.pembShare * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)]/25">
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-sm font-semibold text-[var(--color-fg)]">Top demand markets</p>
            <p className="text-xs text-[var(--color-fg-muted)]">
              Highest relative commercial demand within the Ascent footprint
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {totals.topMarkets.map((m, i) => (
              <Badge key={m.code} variant={i === 0 ? "default" : "secondary"} className="gap-1">
                {m.code}
                <span className="tabular opacity-80">{m.demand}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-bg-subtle)] text-[var(--color-primary)]">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-[var(--color-fg-subtle)]">{label}</p>
          <p className="truncate text-sm font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const POSITIONS: { code: string; x: number; y: number }[] = [
  { code: "TN", x: 50, y: 50 },
  { code: "KY", x: 52, y: 36 },
  { code: "AL", x: 48, y: 66 },
  { code: "GA", x: 60, y: 64 },
  { code: "MS", x: 38, y: 64 },
  { code: "AR", x: 32, y: 52 },
  { code: "MO", x: 36, y: 36 },
  { code: "IL", x: 44, y: 28 },
  { code: "IN", x: 54, y: 28 },
  { code: "OH", x: 62, y: 26 },
  { code: "WV", x: 68, y: 34 },
  { code: "PA", x: 74, y: 24 },
  { code: "VA", x: 72, y: 42 },
  { code: "NC", x: 70, y: 54 },
  { code: "SC", x: 66, y: 62 },
  { code: "FL", x: 62, y: 78 },
  { code: "TX", x: 18, y: 68 },
];
