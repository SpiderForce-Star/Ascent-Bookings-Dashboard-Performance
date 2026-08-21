import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/dashboard/dashboard";

export const Route = createFileRoute("/mbma")({
  component: MbmaPage,
  head: () => ({
    meta: [
      { title: "MBMA · Ascent Buildings" },
      {
        name: "description",
        content:
          "MBMA Non-Agriculture Shipments — target territory market intelligence for Ascent Buildings. Internal use only.",
      },
    ],
  }),
});

function MbmaPage() {
  return <Dashboard initialTab="mbma" />;
}
