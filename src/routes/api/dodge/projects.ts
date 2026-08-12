import { createFileRoute } from "@tanstack/react-router";

/**
 * GET /api/dodge/projects?maxMiles=600&minValuation=1000000&refresh=1
 * Server-only Dodge REST client. Never exposes OAuth secrets.
 * Live when DODGE_* env is set; otherwise demo pipeline (always 200 JSON).
 */
export const Route = createFileRoute("/api/dodge/projects")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const maxMiles = Number(url.searchParams.get("maxMiles") ?? "600");
          const minValuation = Number(url.searchParams.get("minValuation") ?? "1000000");
          const bypassCache = url.searchParams.get("refresh") === "1";

          const { fetchDodgeProjects } = await import("@/lib/dodge.server");
          const data = await fetchDodgeProjects({
            maxMiles: Number.isFinite(maxMiles) ? maxMiles : 600,
            minValuation: Number.isFinite(minValuation) ? minValuation : 1_000_000,
            bypassCache,
          });

          const maxAge = data.status.mode === "live" ? 180 : 60;
          return Response.json(data, {
            headers: {
              // private for live (tenant data); short public for demo
              "Cache-Control":
                data.status.mode === "live"
                  ? `private, max-age=${maxAge}`
                  : `public, max-age=${maxAge}`,
            },
          });
        } catch (err) {
          // Absolute last resort — never 500 empty; always give the UI a board
          console.error("[dodge/projects] unhandled:", err);
          try {
            const { fetchDodgeProjects } = await import("@/lib/dodge.server");
            // Force demo by temporarily... actually fetchDodgeProjects already demos on error.
            // If import/config throws, build minimal demo inline:
            const { DEMO_DODGE_PROJECTS, DEMO_DODGE_COMPANIES, summarizeProjects, DODGE_TERRITORY_STATES } =
              await import("@/data/dodge");
            const projects = DEMO_DODGE_PROJECTS.filter((p) => p.milesFromPlant <= 600);
            return Response.json(
              {
                fetchedAt: new Date().toISOString(),
                status: {
                  configured: false,
                  mode: "demo",
                  message: "Dodge route error — demo pipeline only.",
                  baseUrl: null,
                  hasClientId: false,
                  hasClientSecret: false,
                  hasAccessToken: false,
                },
                projects,
                companies: DEMO_DODGE_COMPANIES,
                summary: summarizeProjects(projects, 600),
                filters: {
                  states: [...DODGE_TERRITORY_STATES],
                  maxMiles: 600,
                  minValuation: 1_000_000,
                },
              },
              { status: 200, headers: { "Cache-Control": "public, max-age=30" } },
            );
          } catch {
            return Response.json(
              { error: "Dodge unavailable" },
              { status: 503, headers: { "Cache-Control": "no-store" } },
            );
          }
        }
      },
    },
  },
});
