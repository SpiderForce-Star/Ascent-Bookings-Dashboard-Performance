import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  NEWS_FILTER_TAGS,
  filterNewsByTag,
  formatNewsAge,
  type NewsFilterId,
} from "@/data/market-news";
import { useMarketNews } from "@/hooks/use-market-news";
import { cn } from "@/lib/utils";
import { ExternalLink, Loader2, Newspaper, Radio, RefreshCw } from "lucide-react";

const FILTER_LABEL: Record<NewsFilterId, string> = {
  all: "All",
  industrial: "Industrial",
  warehouse: "Warehouse",
  manufacturing: "Manufacturing",
  southeast: "SE focus",
};

export function MarketNewsSection() {
  const { data, loading, error, refresh } = useMarketNews(true);
  const [filter, setFilter] = useState<NewsFilterId>("all");

  const items = useMemo(() => filterNewsByTag(data.items, filter), [data.items, filter]);

  const badgeVariant =
    data.mode === "live" ? "success" : data.mode === "rss" ? "default" : "secondary";
  const badgeLabel =
    data.mode === "live" ? "News live" : data.mode === "rss" ? "RSS live" : "News demo";

  return (
    <section className="space-y-3 print:hidden" aria-label="Market intelligence news">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[var(--color-primary)]">
            <Newspaper className="size-3.5" />
            Market intelligence
          </div>
          <h3 className="font-display text-lg font-semibold tracking-tight sm:text-xl">
            Construction investment news
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-fg-muted)]">
            Industrial, warehouse, manufacturing, and logistics headlines for VP Sales and the field team —
            PEMB / Division 13 context within the Portland, TN footprint.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={badgeVariant} className="gap-1">
            <Radio className="size-3" />
            {badgeLabel}
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void refresh()}
            disabled={loading}
            className="gap-1.5"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Refresh
          </Button>
        </div>
      </div>

      {data.message && (
        <p className="text-[11px] text-[var(--color-fg-subtle)]">{data.message}</p>
      )}
      {error && (
        <p className="rounded-[var(--radius-sm)] bg-[var(--color-warn-soft)] px-3 py-2 text-xs text-[var(--color-warn)]">
          {error} — showing last available intel.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-[var(--color-fg-subtle)]">Filter</span>
        {NEWS_FILTER_TAGS.map((id) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={filter === id ? "default" : "secondary"}
            className="h-8 rounded-full"
            onClick={() => setFilter(id)}
          >
            {FILTER_LABEL[id]}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm font-semibold leading-snug sm:text-base">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-start gap-1.5 text-[var(--color-fg)] hover:text-[var(--color-primary)]"
                  >
                    <span>{item.title}</span>
                    <ExternalLink className="mt-0.5 size-3.5 shrink-0 opacity-60" />
                  </a>
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                {item.source}
                <span className="mx-1.5 text-[var(--color-fg-subtle)]">·</span>
                <span className="tabular">{formatNewsAge(item.publishedAt)}</span>
                {item.mode !== "demo" && (
                  <>
                    <span className="mx-1.5 text-[var(--color-fg-subtle)]">·</span>
                    <span className="capitalize">{item.mode}</span>
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <p className="line-clamp-2 text-sm text-[var(--color-fg-muted)]">{item.summary}</p>
              <div className="flex flex-wrap gap-1">
                {item.tags.slice(0, 5).map((t) => (
                  <Badge
                    key={t}
                    variant={t === "pemb-relevant" ? "default" : "secondary"}
                    className="text-[10px] capitalize"
                  >
                    {t.replace(/-/g, " ")}
                  </Badge>
                ))}
              </div>
              {item.whyItMatters && (
                <p
                  className={cn(
                    "rounded-[var(--radius-sm)] border border-[var(--color-primary)]/15",
                    "bg-[var(--color-primary-soft)]/30 px-2.5 py-2 text-xs text-[var(--color-fg)]",
                  )}
                >
                  <span className="font-semibold text-[var(--color-primary)]">Why it matters for Ascent: </span>
                  {item.whyItMatters}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && (
          <Card className="lg:col-span-2">
            <CardContent className="py-10 text-center text-sm text-[var(--color-fg-muted)]">
              No headlines match this filter. Try <strong className="font-medium">All</strong> or refresh.
            </CardContent>
          </Card>
        )}
      </div>

      <p className="text-[11px] text-[var(--color-fg-subtle)]">
        For internal sales awareness. Headlines are aggregated from third-party sources or curated offline
        context; verify before customer conversations. Not investment advice.{" "}
        {data.provider ? `Provider: ${data.provider}.` : "No live news key configured — demo intel."}
      </p>
    </section>
  );
}
