import { FittedChoropleth } from "./mbma-map";
import { useMbmaGeo } from "@/hooks/use-mbma-geo";
import {
  COUNTIES,
  formatMbmaActual,
  type QuarterKey,
  type RadarStateCode,
  STATE_RECORDS,
} from "@/data/mbma";
import { cn } from "@/lib/utils";

export function MbmaStateMaps({
  metric,
  isolatedState,
  onIsolate,
}: {
  metric: QuarterKey;
  isolatedState: RadarStateCode | null;
  onIsolate: (code: RadarStateCode) => void;
}) {
  const { geo, failed } = useMbmaGeo();

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-base font-semibold tracking-tight">Heat maps by state</h2>
        <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
          Each map is scaled to its own highest county so local variation is visible. Florida is north /
          panhandle only. Tap a card to isolate that state.
        </p>
      </div>

      {failed && (
        <p className="text-sm text-[var(--color-fg-muted)]">State maps could not be loaded.</p>
      )}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {STATE_RECORDS.map((st) => {
          const counties = COUNTIES.filter((c) => c.state === st.code);
          const active = isolatedState === st.code;
          const title = st.northOnly ? "Florida · N. / panhandle" : st.name;
          return (
            <button
              key={st.code}
              type="button"
              onClick={() => onIsolate(st.code)}
              aria-pressed={active}
              className={cn(
                "min-h-[44px] rounded-[var(--radius-md)] border bg-[var(--color-bg-elevated)] p-3 text-left shadow-[var(--shadow-sm)]",
                active
                  ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]"
                  : "border-[var(--color-border)]",
              )}
            >
              <div className="flex items-start justify-between gap-1">
                <p className="text-sm font-semibold leading-tight">{title}</p>
                <span className="text-[10px] tabular text-[var(--color-fg-subtle)]">{st.postal}</span>
              </div>
              <p className="mt-0.5 text-xs tabular text-[var(--color-fg-muted)]">
                {formatMbmaActual(st.ytd)} · Rank {st.rank}
              </p>
              <div className="mt-2 pointer-events-none">
                {!geo ? (
                  <div className="h-[150px] animate-pulse rounded-md bg-[var(--color-bg-subtle)]" />
                ) : (
                  <FittedChoropleth
                    geo={geo}
                    counties={counties}
                    metric={metric}
                    padPx={8}
                    legendPx={8}
                    minHeight={150}
                    maxHeight={170}
                    showLabels={false}
                    showTooltip={false}
                    fittedNote={undefined}
                    ariaLabel={`${title} county choropleth`}
                    compact
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
