import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Phone, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  COUNTIES,
  formatMbmaActual,
  formatThousands,
  STATE_BY_CODE,
  type RadarStateCode,
} from "@/data/mbma";
import { BUILDING_LABEL, STAGE_LABEL, type DodgeCompany } from "@/data/dodge";
import {
  buildStateHunts,
  HUNT_COUNTIES,
  huntByFips,
  matchCompany,
  nearestPlantProxy,
  parseFipsParam,
  pembHuntProjects,
  RANK_CALLOUTS,
  SEED_PRIMARY,
  STAGE_SORT,
  STATE_Q_RANKS,
  type HuntCounty,
  type HuntFlag,
  type HuntProject,
  type StateHunt,
} from "@/data/hunts";
import { useDodgeProjects } from "@/hooks/use-dodge-projects";
import { useMbmaGeo } from "@/hooks/use-mbma-geo";
import { fitViewBox, pathStats, unionBBox } from "@/data/mbma/path-fit";
import { choroplethFill } from "@/data/mbma";
import { useTerritory } from "@/lib/territory-store";
import { cn } from "@/lib/utils";

type ListTab = "repeatable" | "chase" | "all";
type MobilePane = "workbench" | "map";

export function TargetAttackPanel({ initialFips }: { initialFips?: string }) {
  const { data, loading } = useDodgeProjects(true);
  const { states: territory } = useTerritory();
  const huntProjects = useMemo(() => pembHuntProjects(data.projects), [data.projects]);
  const hunts = useMemo(() => buildStateHunts(huntProjects), [huntProjects]);
  const fipsReady = useMemo(() => {
    const radarish = data.projects.filter((p) => COUNTIES.some((c) => c.state === p.state));
    if (radarish.length === 0) return huntProjects.length > 0;
    return huntProjects.some((p) => p.fips);
  }, [data.projects, huntProjects]);

  const primaryFips = useMemo(() => new Set(hunts.map((h) => h.primary.fips)), [hunts]);
  const queryFips = parseFipsParam(
    initialFips ??
      (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("fips") : null),
  );
  const defaultFips = queryFips && huntByFips(queryFips) ? queryFips : (SEED_PRIMARY.TN ?? "47037");
  const [selectedFips, setSelectedFips] = useState(defaultFips);
  const [listTab, setListTab] = useState<ListTab>("repeatable");
  const [query, setQuery] = useState("");
  const [mobilePane, setMobilePane] = useState<MobilePane>("workbench");
  const chipRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fips = parseFipsParam(
      initialFips ?? (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("fips") : null),
    );
    if (fips && huntByFips(fips)) setSelectedFips(fips);
  }, [initialFips]);

  useEffect(() => {
    const el = document.getElementById(`hunt-chip-${selectedFips}`);
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [selectedFips]);

  function selectHunt(fips: string) {
    setSelectedFips(fips);
    setMobilePane("workbench");
  }

  const selected = huntByFips(selectedFips) ?? huntByFips("47037")!;
  const selectedHunt = hunts.find((h) => h.state === selected.state);
  const countyDodge = useMemo(
    () =>
      huntProjects
        .filter((p) => p.fips === selected.fips)
        .sort((a, b) => (STAGE_SORT[a.stage] ?? 9) - (STAGE_SORT[b.stage] ?? 9) || b.valuation - a.valuation),
    [huntProjects, selected.fips],
  );

  const list = useMemo(() => {
    let rows = HUNT_COUNTIES.filter((c) => c.ytd > 0 || huntProjects.some((p) => p.fips === c.fips));
    if (listTab === "repeatable") rows = rows.filter((c) => c.flags.includes("repeatable"));
    if (listTab === "chase") rows = rows.filter((c) => c.flags.includes("spike"));
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.state.toLowerCase().includes(q) ||
          STATE_BY_CODE[c.state].name.toLowerCase().includes(q),
      );
    }
    return rows
      .map((c) => {
        const dodge = huntProjects.filter((p) => p.fips === c.fips);
        const dodge$ = dodge.reduce((s, p) => s + p.valuation, 0);
        const contacts = dodge.reduce((m, p) => Math.max(m, p.coverage), 0);
        return { c, dodge$, contacts };
      })
      .sort((a, b) => {
        if (a.c.flags.includes("repeatable") !== b.c.flags.includes("repeatable")) {
          return a.c.flags.includes("repeatable") ? -1 : 1;
        }
        if (b.c.ytd !== a.c.ytd) return b.c.ytd - a.c.ytd;
        return b.dodge$ - a.dodge$;
      });
  }, [listTab, query, huntProjects]);

  const joinBlocked = !loading && data.projects.length > 0 && !fipsReady;
  const workbench = (
    <Workbench
      county={selected}
      hunt={selectedHunt}
      projects={countyDodge}
      companies={data.companies}
      rep={territory.find((s) => s.code === selected.state)?.assignedRep ?? ""}
    />
  );
  const map = (
    <HuntMap
      key={selected.fips}
      hunts={hunts}
      selected={selected}
      dodge={huntProjects}
      primaryFips={primaryFips}
      onSelect={selectHunt}
    />
  );

  return (
    <div className="overflow-x-hidden pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0">
      <section className="mb-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Target-Attack</h1>
        <p className="mt-0.5 text-sm font-medium">600-mile radar · county hunts · Dodge access</p>
        <p className="mt-1 max-w-2xl text-xs text-[var(--color-fg-muted)] sm:text-sm">
          MBMA = 2025 industry dollars (not Ascent). Dodge = live projects and licensed contacts. Internal use only.
        </p>
      </section>

      {joinBlocked && (
        <div className="mb-3 rounded-[var(--radius-md)] border border-[var(--color-warn)] bg-[var(--color-warn-soft)] px-4 py-3 text-sm">
          Dodge rows need county FIPS before projects can attach. MBMA hunts still load; Open in Dodge remains the
          system of record.
        </div>
      )}

      <div
        ref={chipRowRef}
        className="-mx-4 mb-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="listbox"
        aria-label="Primary hunt counties"
      >
        {hunts.map((h) => {
          const dodge$ = huntProjects
            .filter((p) => p.fips === h.primary.fips)
            .reduce((s, p) => s + p.valuation, 0);
          const coverage = huntProjects
            .filter((p) => p.fips === h.primary.fips)
            .reduce((m, p) => Math.max(m, p.coverage), 0);
          const on = selectedFips === h.primary.fips;
          return (
            <button
              key={h.primary.fips}
              id={`hunt-chip-${h.primary.fips}`}
              type="button"
              role="option"
              aria-selected={on}
              onClick={() => selectHunt(h.primary.fips)}
              className={cn(
                "min-h-11 shrink-0 snap-center rounded-full border px-3 py-2 text-left",
                on
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] ring-2 ring-[var(--color-primary)]"
                  : "border-[var(--color-border)] bg-[var(--color-bg-elevated)]",
              )}
            >
              <span className="text-[11px] font-semibold">{h.state}</span>
              <span className="ml-1 text-sm font-medium">
                {h.primary.name}
                {h.state === "FL" ? " · N.FL" : ""}
              </span>
              <span className="ml-2 text-[11px] tabular text-[var(--color-fg-muted)]">
                {formatMbmaActual(h.primary.ytd)}
                {dodge$ ? ` · ${formatUsd(dodge$)}` : ""} · {coverage}/3
              </span>
            </button>
          );
        })}
      </div>

      <div
        className={cn(
          "lg:hidden",
          mobilePane === "workbench" ? "block" : "hidden",
        )}
      >
        <div className="h-[min(70dvh,calc(100dvh-13.5rem))] min-h-[280px]">{workbench}</div>
      </div>
      <div className={cn("lg:hidden", mobilePane === "map" ? "block" : "hidden")}>
        <div className="h-[min(70dvh,calc(100dvh-13.5rem))] min-h-[280px]">{map}</div>
      </div>

      <div className="hidden grid-cols-5 gap-4 lg:grid">
        <div className="col-span-3">{map}</div>
        <div className="col-span-2 max-h-[70vh]">{workbench}</div>
      </div>

      <div className="mt-6 space-y-4">
        <RankStrip />
        <HuntingList
          list={list}
          listTab={listTab}
          setListTab={setListTab}
          query={query}
          setQuery={setQuery}
          selectedFips={selectedFips}
          dodgeInView={huntProjects.length}
          onSelect={selectHunt}
        />
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)]/95 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
        aria-label="Target-Attack panes"
      >
        <button
          type="button"
          className={cn(
            "flex min-h-11 items-center justify-center gap-1.5 text-sm font-medium",
            mobilePane === "map" ? "text-[var(--color-primary)]" : "text-[var(--color-fg-muted)]",
          )}
          onClick={() => setMobilePane("map")}
        >
          <MapPin className="size-4" /> Map
        </button>
        <button
          type="button"
          className={cn(
            "flex min-h-11 items-center justify-center gap-1.5 text-sm font-medium",
            mobilePane === "workbench" ? "text-[var(--color-primary)]" : "text-[var(--color-fg-muted)]",
          )}
          onClick={() => setMobilePane("workbench")}
        >
          Workbench
        </button>
      </nav>
    </div>
  );
}

function Workbench({
  county,
  hunt,
  projects,
  companies,
  rep,
}: {
  county: HuntCounty;
  hunt?: StateHunt;
  projects: HuntProject[];
  companies: DodgeCompany[];
  rep: string;
}) {
  const [openId, setOpenId] = useState<string | null>(projects[0]?.id ?? null);
  const proxy = nearestPlantProxy(county.state);
  const open = projects.find((p) => p.id === openId) ?? projects[0] ?? null;
  const coverage = open?.coverage ?? 0;

  useEffect(() => {
    setOpenId(projects[0]?.id ?? null);
  }, [county.fips, projects]);

  const why = whyCopy(county);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-sm)]">
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-display text-base font-semibold leading-tight">
              {county.name} County, {county.state}
              {county.state === "FL" ? " · N.FL" : ""}
            </p>
            <p className="text-[11px] text-[var(--color-fg-subtle)]">FIPS {county.fips}</p>
          </div>
          <p className="text-right text-lg font-semibold tabular">{formatMbmaActual(county.ytd)}</p>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <FlagPills flags={county.flags} />
          <span className="text-[11px] text-[var(--color-fg-muted)]">
            {(county.pctOfState * 100).toFixed(1)}% of state
          </span>
          <span className="text-[11px] tabular text-[var(--color-fg-muted)]">{coverage}/3</span>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3 text-sm">
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-fg-subtle)]">
            Why this hunt
          </h3>
          <p className="mt-1 text-[var(--color-fg-muted)]">{why}</p>
          <QuarterBars county={county} />
        </section>

        {hunt && hunt.runnersUp.length > 0 && (
          <p className="text-xs text-[var(--color-fg-subtle)]">
            Runners-up: {hunt.runnersUp.map((r) => `${r.name} ${formatMbmaActual(r.ytd)}`).join(" · ")}
          </p>
        )}

        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-fg-subtle)]">
            Access path
          </h3>
          <ContactCard
            role="Owner"
            firm={open?.owner ?? null}
            company={matchCompany(open?.owner ?? null, companies)}
            projectId={open?.id ?? null}
          />
          <ContactCard
            role="Architect"
            firm={open?.architect ?? null}
            company={matchCompany(open?.architect ?? null, companies)}
            projectId={open?.id ?? null}
          />
          <ContactCard
            role="Contractor (GC)"
            firm={open?.gc ?? null}
            company={matchCompany(open?.gc ?? null, companies)}
            projectId={open?.id ?? null}
          />
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-fg-subtle)]">
            Dodge projects (PEMB-filtered)
          </h3>
          {projects.length === 0 ? (
            <p className="mt-2 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] px-3 py-5 text-center text-[var(--color-fg-muted)]">
              No PEMB-filtered Dodge rows attached.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {projects.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={cn(
                      "min-h-11 w-full rounded-[var(--radius-sm)] border px-3 py-2 text-left",
                      open?.id === p.id
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                        : "border-[var(--color-border)]",
                    )}
                    onClick={() => setOpenId(p.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">{p.title}</span>
                      <span className="shrink-0 tabular">{formatUsd(p.valuation)}</span>
                    </div>
                    <p className="text-[11px] text-[var(--color-fg-muted)]">
                      {STAGE_LABEL[p.stage]} · {BUILDING_LABEL[p.buildingType]} · {p.coverage}/3
                      {p.typeUnconfirmed ? " · type unconfirmed" : ""}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-[11px] text-[var(--color-fg-subtle)]">
          Dist {county.distBand} · {proxy.name} ({proxy.note})
          {rep ? ` · Rep ${rep}` : " · Rep unassigned"}
        </p>
      </div>
    </div>
  );
}

function whyCopy(c: HuntCounty): string {
  const peak = `${(c.peakShare * 100).toFixed(0)}%`;
  if (c.flags.includes("spike")) {
    return `${c.activeQuarters} active quarter${c.activeQuarters === 1 ? "" : "s"}; peak quarter is ${peak} of YTD — project chase, not a coverage hunt.`;
  }
  if (c.flags.includes("concentrated") && c.flags.includes("repeatable")) {
    return `${c.activeQuarters} quarters with volume; peak ${peak} of YTD. Concentrated (≥20% of state) — treat as a book-of-work hunt, not a default coverage county.`;
  }
  if (c.flags.includes("repeatable")) {
    return `${c.activeQuarters} quarters with volume and no quarter ≥55% of YTD — Repeatable coverage hunt. Peak quarter ${peak} of year.`;
  }
  return `${c.activeQuarters} active quarters; peak ${peak} of YTD.`;
}

function QuarterBars({ county }: { county: HuntCounty }) {
  const items = [
    { id: "Q1", v: county.q1 },
    { id: "Q2", v: county.q2 },
    { id: "Q3", v: county.q3 },
    { id: "Q4", v: county.q4 },
  ];
  const max = Math.max(...items.map((i) => i.v), 1);
  return (
    <div className="mt-2 grid grid-cols-4 gap-2">
      {items.map((i) => (
        <div key={i.id} className="text-center">
          <div className="flex h-10 items-end justify-center">
            <div
              className="w-full rounded-sm bg-[var(--color-primary)]/80"
              style={{ height: `${Math.max(4, (i.v / max) * 40)}px` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-[var(--color-fg-subtle)]">{i.id}</p>
          <p className="text-[10px] tabular">{formatMbmaActual(i.v)}</p>
        </div>
      ))}
    </div>
  );
}

function ContactCard({
  role,
  firm,
  company,
  projectId,
}: {
  role: string;
  firm: string | null;
  company: { phone: string | null; name: string } | null;
  projectId: string | null;
}) {
  const phone = company?.phone ?? null;
  const hasRecord = Boolean(projectId);
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase text-[var(--color-fg-subtle)]">{role}</p>
      {firm ? (
        <p className="text-sm font-medium">{firm}</p>
      ) : (
        <p className="text-sm text-[var(--color-fg-muted)]">No live contact on this FIPS yet</p>
      )}
      <p className="text-xs text-[var(--color-fg-muted)]">{phone ?? "No phone in Dodge record"}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {phone && (
          <Button asChild size="sm" variant="secondary" className="min-h-11">
            <a href={`tel:${phone}`}>
              <Phone className="size-3.5" /> Call
            </a>
          </Button>
        )}
        {hasRecord ? (
          <Button asChild size="sm" variant="secondary" className="min-h-11">
            <a href={`/?tab=dodge&project=${encodeURIComponent(projectId!)}`}>Open in Dodge</a>
          </Button>
        ) : (
          <Button size="sm" variant="secondary" className="min-h-11" disabled>
            Open in Dodge
          </Button>
        )}
      </div>
    </div>
  );
}

function RankStrip() {
  return (
    <details className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-3 shadow-[var(--shadow-sm)]">
      <summary className="min-h-11 cursor-pointer text-sm font-semibold">Rank migration (national, full-state)</summary>
      <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
        Why these hunts exist — 2025 MBMA quarter ranks, not Ascent bookings.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {RANK_CALLOUTS.map((t) => (
          <Badge key={t} variant="secondary">
            {t}
          </Badge>
        ))}
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-xs">
          <thead className="text-[11px] uppercase text-[var(--color-fg-subtle)]">
            <tr>
              <th className="py-1 pr-2">St</th>
              <th className="py-1 pr-2 text-right">Q1</th>
              <th className="py-1 pr-2 text-right">Q2</th>
              <th className="py-1 pr-2 text-right">Q3</th>
              <th className="py-1 pr-2 text-right">Q4</th>
              <th className="py-1 text-right">YTD</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(STATE_Q_RANKS) as RadarStateCode[]).map((st) => {
              const r = STATE_Q_RANKS[st];
              return (
                <tr key={st} className="border-t border-[var(--color-border)]/60">
                  <td className="py-1 pr-2 font-medium">{st}</td>
                  <td className="py-1 pr-2 text-right tabular">{r.q1}</td>
                  <td className="py-1 pr-2 text-right tabular">{r.q2}</td>
                  <td className="py-1 pr-2 text-right tabular">{r.q3}</td>
                  <td className="py-1 pr-2 text-right tabular">{r.q4}</td>
                  <td className="py-1 text-right tabular">{r.ytd}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function HuntingList({
  list,
  listTab,
  setListTab,
  query,
  setQuery,
  selectedFips,
  dodgeInView,
  onSelect,
}: {
  list: { c: HuntCounty; dodge$: number; contacts: number }[];
  listTab: ListTab;
  setListTab: (t: ListTab) => void;
  query: string;
  setQuery: (q: string) => void;
  selectedFips: string;
  dodgeInView: number;
  onSelect: (fips: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Hunting list</CardTitle>
          <CardDescription>
            {dodgeInView} PEMB-filtered Dodge projects joined on FIPS · {formatThousands(list.length)} counties
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["repeatable", "Repeatable"],
              ["chase", "Project chase"],
              ["all", "All"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={listTab === id ? "default" : "secondary"}
              className="min-h-11 rounded-full"
              onClick={() => setListTab(id)}
            >
              {label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-fg-subtle)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search county or state"
            className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </label>
        {list.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--color-fg-muted)]">No counties match the current filters.</p>
        ) : (
          <>
            <ul className="space-y-2 lg:hidden">
              {list.map((row, i) => (
                <li key={row.c.fips}>
                  <button
                    type="button"
                    className={cn(
                      "min-h-11 w-full rounded-[var(--radius-md)] border px-3 py-2.5 text-left",
                      row.c.fips === selectedFips
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                        : "border-[var(--color-border)]",
                    )}
                    onClick={() => onSelect(row.c.fips)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">
                        {i + 1}. {row.c.name} {row.c.state}
                      </span>
                      <span className="tabular">{formatMbmaActual(row.c.ytd)}</span>
                    </div>
                    <FlagPills flags={row.c.flags} />
                    <p className="mt-1 text-[11px] text-[var(--color-fg-muted)]">
                      {row.c.activeQuarters}q · peak {(row.c.peakShare * 100).toFixed(0)}% · Dodge{" "}
                      {row.dodge$ ? formatUsd(row.dodge$) : "—"} · {row.contacts}/3
                    </p>
                  </button>
                </li>
              ))}
            </ul>
            <div className="hidden max-h-[min(70vh,560px)] overflow-auto lg:block">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="sticky top-0 bg-[var(--color-bg-elevated)] text-[11px] uppercase tracking-wide text-[var(--color-fg-subtle)]">
                  <tr>
                    <th className="py-2 pr-3">Rank</th>
                    <th className="py-2 pr-3">County</th>
                    <th className="py-2 pr-3">State</th>
                    <th className="py-2 pr-3">Flags</th>
                    <th className="py-2 pr-3 text-right">MBMA YTD</th>
                    <th className="py-2 pr-3">Cadence</th>
                    <th className="py-2 pr-3 text-right">Peak Q %</th>
                    <th className="py-2 pr-3 text-right">Dodge $</th>
                    <th className="py-2 pr-3">Contacts</th>
                    <th className="py-2">Attack</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row, i) => (
                    <tr
                      key={row.c.fips}
                      className={cn(
                        "cursor-pointer border-b border-[var(--color-border)]/70 hover:bg-[var(--color-primary-soft)]/40",
                        row.c.fips === selectedFips && "bg-[var(--color-primary-soft)]",
                      )}
                      onClick={() => onSelect(row.c.fips)}
                    >
                      <td className="py-2.5 pr-3 tabular text-[var(--color-fg-muted)]">{i + 1}</td>
                      <td className="py-2.5 pr-3 font-medium">{row.c.name}</td>
                      <td className="py-2.5 pr-3">{row.c.state}</td>
                      <td className="py-2.5 pr-3">
                        <FlagPills flags={row.c.flags} />
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular">{formatMbmaActual(row.c.ytd)}</td>
                      <td className="py-2.5 pr-3 tabular">{row.c.activeQuarters}q</td>
                      <td className="py-2.5 pr-3 text-right tabular">{(row.c.peakShare * 100).toFixed(0)}%</td>
                      <td className="py-2.5 pr-3 text-right tabular">{row.dodge$ ? formatUsd(row.dodge$) : "—"}</td>
                      <td className="py-2.5 pr-3 tabular">{row.contacts}/3</td>
                      <td className="py-2.5 text-xs font-medium text-[var(--color-primary)]">Open</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function HuntMap({
  hunts,
  selected,
  dodge,
  primaryFips,
  onSelect,
}: {
  hunts: StateHunt[];
  selected: HuntCounty;
  dodge: HuntProject[];
  primaryFips: Set<string>;
  onSelect: (fips: string) => void;
}) {
  const { geo, failed } = useMbmaGeo();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 640, h: 420 });
  const stateCounties = useMemo(() => COUNTIES.filter((c) => c.state === selected.state), [selected.state]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r && r.width > 8) setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth || 640, h: el.clientHeight || 420 });
    return () => ro.disconnect();
  }, [selected.fips]);

  if (failed) return <p className="text-sm text-[var(--color-fg-muted)]">Map could not load.</p>;
  if (!geo) return <div className="h-full min-h-[280px] animate-pulse rounded-lg bg-[var(--color-bg-subtle)]" />;

  const wanted = new Set(stateCounties.map((c) => c.fips));
  const features = geo.features.filter((f) => wanted.has(f.fips));
  const bbox = unionBBox(features.map((f) => pathStats(f.fips, f.d).bbox));
  const h = Math.max(size.h, 280);
  const viewBox = bbox ? fitViewBox(bbox, size.w || 640, h, 24, 22) : "0 0 960 620";
  const dodgeByFips = new Map<string, number>();
  for (const p of dodge) {
    if (!p.fips) continue;
    dodgeByFips.set(p.fips, (dodgeByFips.get(p.fips) ?? 0) + p.valuation);
  }
  const maxDodge = Math.max(1, ...dodgeByFips.values());
  const maxYtd = Math.max(1, ...stateCounties.map((c) => c.ytd));

  return (
    <div className="flex h-full min-h-[280px] flex-col">
      <p className="mb-2 text-xs text-[var(--color-fg-muted)]">
        {STATE_BY_CODE[selected.state].name} · fitted to this state
      </p>
      <div
        ref={wrapRef}
        className="relative min-h-[280px] flex-1 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)]"
      >
        <svg viewBox={viewBox} className="h-full w-full" role="img" aria-label="Hunt county map">
          {features.map((f) => {
            const hunt = huntByFips(f.fips);
            const emphasis = primaryFips.has(f.fips) || f.fips === selected.fips;
            return (
              <path
                key={f.fips}
                d={f.d}
                fill={choroplethFill(hunt?.ytd ?? 0, maxYtd)}
                fillOpacity={emphasis ? 1 : 0.28}
                stroke={f.fips === selected.fips ? "#c8102e" : "#9ca3af"}
                strokeWidth={f.fips === selected.fips ? 2 : 0.6}
                style={{ vectorEffect: "non-scaling-stroke" }}
                className="cursor-pointer"
                onClick={() => onSelect(f.fips)}
              >
                <title>{hunt ? `${hunt.name} ${hunt.state}` : f.fips}</title>
              </path>
            );
          })}
          {hunts
            .filter((h) => h.primary.state === selected.state)
            .map((h) => {
              const feat = features.find((f) => f.fips === h.primary.fips);
              if (!feat) return null;
              const c = pathStats(feat.fips, feat.d).centroid;
              const r = 4 + 10 * Math.sqrt((dodgeByFips.get(h.primary.fips) ?? 0) / maxDodge);
              return (
                <circle
                  key={h.primary.fips}
                  cx={c.x}
                  cy={c.y}
                  r={r}
                  fill="#c8102e"
                  fillOpacity={0.85}
                  pointerEvents="none"
                />
              );
            })}
        </svg>
      </div>
    </div>
  );
}

function FlagPills({ flags }: { flags: HuntFlag[] }) {
  if (!flags.length) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {flags.map((f) => (
        <span
          key={f}
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize",
            f === "repeatable" && "bg-[var(--color-success-soft)] text-[var(--color-success)]",
            f === "spike" && "bg-[var(--color-warn-soft)] text-[var(--color-warn)]",
            f === "concentrated" && "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
            f === "empty" && "bg-[var(--color-bg-subtle)] text-[var(--color-fg-subtle)]",
          )}
        >
          {f}
        </span>
      ))}
    </span>
  );
}

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
