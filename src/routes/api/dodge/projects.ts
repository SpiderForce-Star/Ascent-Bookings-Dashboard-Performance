import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/dodge/projects")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const maxMiles = Number(url.searchParams.get("maxMiles") ?? "600");
          const minValuation = Number(url.searchParams.get("minValuation") ?? "1000000");
          const { fetchDodgeProjects } = await import("@/lib/dodge.server");
          const data = await fetchDodgeProjects({
            maxMiles: Number.isFinite(maxMiles) ? maxMiles : 600,
            minValuation: Number.isFinite(minValuation) ? minValuation : 1_000_000,
          });
          return Response.json(data, {
            headers: {
              "Cache-Control": data.status.mode === "live" ? "private, max-age=120" : "public, max-age=60",
            },
          });
        } catch (err) {
          console.error("[dodge/projects]", err);
          return Response.json(
            {
              error: err instanceof Error ? err.message : "Dodge fetch failed",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
