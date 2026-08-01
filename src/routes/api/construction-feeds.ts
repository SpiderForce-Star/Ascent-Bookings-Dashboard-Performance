import { createFileRoute } from "@tanstack/react-router";
import { CACHED_FEEDS } from "@/data/construction-feeds";

export const Route = createFileRoute("/api/construction-feeds")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { fetchConstructionFeeds } = await import("@/lib/construction-feeds.server");
          const data = await fetchConstructionFeeds();
          return Response.json(data, {
            headers: {
              "Cache-Control": "public, max-age=300",
              "Access-Control-Allow-Origin": "*",
            },
          });
        } catch (err) {
          console.error("[construction-feeds]", err);
          return Response.json(
            {
              ...CACHED_FEEDS,
              fetchedAt: new Date().toISOString(),
              status: "cached",
              live: false,
              sources: [
                {
                  name: "Fallback",
                  ok: false,
                  detail: err instanceof Error ? err.message : "Fetch failed",
                },
              ],
            },
            { status: 200, headers: { "Cache-Control": "public, max-age=60" } },
          );
        }
      },
    },
  },
});
