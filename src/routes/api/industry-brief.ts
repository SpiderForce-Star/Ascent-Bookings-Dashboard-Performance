import { createFileRoute } from "@tanstack/react-router";
import { fallbackIndustryBrief } from "@/data/industry-brief";

/**
 * GET /api/industry-brief?refresh=1
 * Public RSS + optional news key. Always 200 JSON with associations fallback.
 */
export const Route = createFileRoute("/api/industry-brief")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const bypass = url.searchParams.get("refresh") === "1";
          const { fetchIndustryBrief } = await import("@/lib/industry-brief.server");
          const data = await fetchIndustryBrief({ bypassCache: bypass });
          return Response.json(data, {
            headers: {
              "Cache-Control": data.mode === "fallback" ? "public, max-age=120" : "public, max-age=900",
            },
          });
        } catch (err) {
          console.error("[industry-brief]", err);
          return Response.json(
            fallbackIndustryBrief(err instanceof Error ? err.message : "Industry brief unavailable"),
            { status: 200, headers: { "Cache-Control": "public, max-age=60" } },
          );
        }
      },
    },
  },
});
