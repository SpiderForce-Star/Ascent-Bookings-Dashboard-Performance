import { createFileRoute } from "@tanstack/react-router";
import { demoMarketNewsResponse } from "@/data/market-news";

export const Route = createFileRoute("/api/market-news")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const bypass = url.searchParams.get("refresh") === "1";
          const { fetchMarketNews } = await import("@/lib/market-news.server");
          const data = await fetchMarketNews({ bypassCache: bypass });
          const maxAge = data.mode === "live" ? 300 : data.mode === "rss" ? 600 : 120;
          return Response.json(data, {
            headers: {
              "Cache-Control": `public, max-age=${maxAge}`,
              "Access-Control-Allow-Origin": "*",
            },
          });
        } catch (err) {
          console.error("[market-news]", err);
          return Response.json(
            demoMarketNewsResponse(
              err instanceof Error ? `News fetch failed (${err.message}); showing curated offline intel.` : undefined,
            ),
            {
              status: 200,
              headers: { "Cache-Control": "public, max-age=60" },
            },
          );
        }
      },
    },
  },
});
