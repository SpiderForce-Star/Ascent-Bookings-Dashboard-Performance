import { useEffect, useMemo, useRef, useState } from "react";
import { Phone, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { COUNTIES, formatMbmaActual, formatThousands, STATE_BY_CODE, type RadarStateCode } from "@/data/mbma";
import { BUILDING_LABEL, STAGE_LABEL, type DodgeCompany } from "@/data/dodge";
import {
  buildStateHunts,
  HUNT_COUNTIES,
  huntByFips,
  matchCompany,
  nearestPlantProxy,
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

type ListTab = "all" | "repeatable" | "chase";

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
  const queryFips =
    initialFips ??
    (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("fips") ?? undefined : undefined);
  const defaultFips = queryFips && huntByFips(queryFips) ? queryFips : (SEED_PRIMARY.TN ?? hunts[0]?.primary.fips);
  const [selectedFips, setSelectedFips] = useState(defaultFips ?? "47037");
  const [listTab, setListTab] = useState<ListTab>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const fips =
      initialFips ??
      (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("fips") : null);
    if (fips && huntByFips(fips)) setSelectedFips(fips);
  }, [initialFips]);

  const selected = huntByFips(selectedFips) ?? huntByFips("47037")!;
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

  const dodgeInView = huntProjects.length;
  const joinBlocked = !loading && data.projects.length > 0 && !fipsReady;

  return (
    <div className="space-y-5 overflow-x-hidden">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Target-Attack</h1>
          <p className="mt-1 text-sm font-medium">600-mile radar · county hunts · Dodge access</p>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-fg-muted)]">
            MBMA = 2025 industry dollars (not Ascent). Dodge = live projects and licensed contacts. Internal use only.
          </p>
        </div>
        <Badge variant="outline">Internal use only</Badge>
      </section>

      {joinBlocked && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-warn)] bg-[var(--color-warn-soft)] px-4 py-3 text-sm">
          Dodge rows need county FIPS before projects can attach. MBMA hunts still load; Open in Dodge remains the
          system of record.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {hunts.map((h) => (
          <HuntCard
            key={h.state}
            hunt={h}
            dodge$={huntProjects.filter((p) => p.fips === h.primary.fips).reduce((s, p) => s + p.valuation, 0)}
            coverage={huntProjects
              .filter((p) => p.fips === h.primary.fips)
              .reduce((m, p) => Math.max(m, p.coverage), 0)}
            selected={selectedFips === h.primary.fips}
            onSelect={() => setSelectedFips(h.primary.fips)}
          />
        ))}
      </div>

      <RankStrip />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Hunts</CardTitle>
            <CardDescription>
              Fitted to hunt counties / selected state. Dots scale with open Dodge $ (leading). MBMA is lagging
              industry volume — not Ascent bookings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HuntMap
              hunts={hunts}
              selected={selected}
              dodge={huntProjects}
              primaryFips={primaryFips}
              onSelect={setSelectedFips}
            />
          </CardContent>
        </Card>

        <Workbench
          county={selected}
          projects={countyDodge}
          companies={data.companies}
          rep={territory.find((s) => s.code === selected.state)?.assignedRep ?? ""}
        />
      </div>

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
                ["all", "All"],
                ["repeatable", "Repeatable"],
                ["chase", "Project chase"],
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
            <div className="max-h-[min(70vh,560px)] overflow-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
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
                    <th className="py-2 pr-3">Dist</th>
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
                      onClick={() => setSelectedFips(row.c.fips)}
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
                      <td className="py-2.5 pr-3 text-right tabular">
                        {row.dodge$ ? formatUsd(row.dodge$) : "—"}
                      </td>
                      <td className="py-2.5 pr-3 tabular">{row.contacts}/3</td>
                      <td className="py-2.5 pr-3">{row.c.distBand}</td>
                      <td className="py-2.5">
                        <span className="text-xs font-medium text-[var(--color-primary)]">Open</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RankStrip() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Rank migration (national, full-state)</CardTitle>
        <CardDescription>Why these hunts exist — 2025 MBMA quarter ranks, not Ascent bookings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {RANK_CALLOUTS.map((t) => (
            <Badge key={t} variant="secondary">
              {t}
            </Badge>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
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
      </CardContent>
    </Card>
  );
}

function HuntCard({
  hunt,
  dodge$,
  coverage,
  selected,
  onSelect,
}: {
  hunt: StateHunt;
  dodge$: number;
  coverage: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const st = STATE_BY_CODE[hunt.state];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "min-h-[44px] rounded-[var(--radius-md)] border bg-[var(--color-bg-elevated)] p-3 text-left shadow-[var(--shadow-sm)]",
        selected ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]" : "border-[var(--color-border)]",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-xs font-semibold">{hunt.state}</span>
        <span className="text-[10px] text-[var(--color-fg-subtle)]">Rank {st.rank}</span>
      </div>
      <p className="mt-0.5 truncate text-sm font-medium">
        {hunt.primary.name}
        {hunt.state === "FL" ? " · N.FL" : ""}
      </p>
      {!hunt.territoryPrimary && (
        <p className="text-[10px] text-[var(--color-warn)]">No territory primary · project chase</p>
      )}
      <FlagPills flags={hunt.primary.flags} />
      <p className="mt-1 text-sm font-semibold tabular">{formatMbmaActual(hunt.primary.ytd)}</p>
      <p className="text-[11px] text-[var(--color-fg-muted)]">
        Dodge {dodge$ ? formatUsd(dodge$) : "—"} · {coverage}/3
      </p>
    </button>
  );
}

function Workbench({
  county,
  projects,
  companies,
  rep,
}: {
  county: HuntCounty;
  projects: HuntProject[];
  companies: DodgeCompany[];
  rep: string;
}) {
  const [openId, setOpenId] = useState<string | null>(projects[0]?.id ?? null);
  const proxy = nearestPlantProxy(county.state);
  const open = projects.find((p) => p.id === openId) ?? projects[0] ?? null;

  useEffect(() => {
    setOpenId(projects[0]?.id ?? null);
  }, [county.fips, projects]);

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>
          {county.name} County, {county.state}
        </CardTitle>
        <CardDescription>
          FIPS {county.fips} · {(county.pctOfState * 100).toFixed(1)}% of state
          {county.state === "FL" ? " (N.FL denom)" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <FlagPills flags={county.flags} />
        <p className="text-2xl font-semibold tabular">{formatMbmaActual(county.ytd)}</p>
        <p className="text-xs text-[var(--color-fg-muted)]">
          Q1 {formatMbmaActual(county.q1)} · Q2 {formatMbmaActual(county.q2)} · Q3 {formatMbmaActual(county.q3)} · Q4{" "}
          {formatMbmaActual(county.q4)}
        </p>
        <p className="text-xs text-[var(--color-fg-subtle)]">
          Dist {county.distBand} · {proxy.name} ({proxy.note})
          {rep ? ` · Rep ${rep}` : " · Rep unassigned"}
        </p>

        {projects.length === 0 ? (
          <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] px-3 py-6 text-center text-[var(--color-fg-muted)]">
            No live PEMB-filtered Dodge projects in this county. Hunt is MBMA-repeatable only.
          </p>
        ) : (
          <ul className="space-y-2">
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={cn(
                    "min-h-11 w-full rounded-[var(--radius-sm)] border px-3 py-2 text-left",
                    open?.id === p.id ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]" : "border-[var(--color-border)]",
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

        {open && (
          <div className="grid gap-2">
            <ContactCard
              role="Owner"
              firm={open.owner}
              company={matchCompany(open.owner, companies)}
              projectId={open.id}
            />
            <ContactCard
              role="Architect"
              firm={open.architect}
              company={matchCompany(open.architect, companies)}
              projectId={open.id}
            />
            <ContactCard
              role="Contractor (GC)"
              firm={open.gc}
              company={matchCompany(open.gc, companies)}
              projectId={open.id}
            />
          </div>
        )}
      </CardContent>
    </Card>
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
  projectId: string;
}) {
  const phone = company?.phone ?? null;
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2">
      <p className="text-[11px] font-medium uppercase text-[var(--color-fg-subtle)]">{role}</p>
      <p className="text-sm font-medium">{firm ?? "Not on this Dodge row"}</p>
      <p className="text-xs text-[var(--color-fg-muted)]">{phone ?? "No phone in Dodge record"}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {phone && (
          <Button asChild size="sm" variant="secondary" className="min-h-11">
            <a href={`tel:${phone}`}>
              <Phone className="size-3.5" /> Call
            </a>
          </Button>
        )}
        <Button asChild size="sm" variant="secondary" className="min-h-11">
          <a href={`/?tab=dodge&project=${encodeURIComponent(projectId)}`}>Open in Dodge</a>
        </Button>
        {!firm && (
          <span className="self-center text-[11px] text-[var(--color-fg-subtle)]">Do not fabricate a name.</span>
        )}
      </div>
    </div>
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
    return () => ro.disconnect();
  }, []);

  if (failed) return <p className="text-sm text-[var(--color-fg-muted)]">Map could not load.</p>;
  if (!geo) return <div className="h-[420px] animate-pulse rounded-lg bg-[var(--color-bg-subtle)]" />;

  const wanted = new Set(stateCounties.map((c) => c.fips));
  const features = geo.features.filter((f) => wanted.has(f.fips));
  const bbox = unionBBox(features.map((f) => pathStats(f.fips, f.d).bbox));
  const viewBox = bbox ? fitViewBox(bbox, size.w || 640, 420, 24, 22) : "0 0 960 620";
  const dodgeByFips = new Map<string, number>();
  for (const p of dodge) {
    if (!p.fips) continue;
    dodgeByFips.set(p.fips, (dodgeByFips.get(p.fips) ?? 0) + p.valuation);
  }
  const maxDodge = Math.max(1, ...dodgeByFips.values());
  const maxYtd = Math.max(1, ...stateCounties.map((c) => c.ytd));

  return (
    <div>
      <p className="mb-2 text-xs text-[var(--color-fg-muted)]">
        {STATE_BY_CODE[selected.state].name} hunts · fitted to this state
      </p>
      <div ref={wrapRef} className="relative h-[420px] min-h-[360px] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-bg-elevated)]">
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
            .filter((h) => h.primary.state === selected.state || h.primary.fips === selected.fips)
            .map((h) => {
              const feat = features.find((f) => f.fips === h.primary.fips);
              if (!feat) return null;
              const c = pathStats(feat.fips, feat.d).centroid;
              const r = 4 + 10 * Math.sqrt((dodgeByFips.get(h.primary.fips) ?? 0) / maxDodge);
              return <circle key={h.primary.fips} cx={c.x} cy={c.y} r={r} fill="#c8102e" fillOpacity={0.85} pointerEvents="none" />;
            })}
        </svg>
      </div>
    </div>
  );
}

function FlagPills({ flags }: { flags: HuntFlag[] }) {
  if (!flags.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
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
    </div>
  );
}

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
