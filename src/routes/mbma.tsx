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
          "MBMA Non-Agriculture Shipments — 600-mile radar market intelligence. Industry-wide data, not Ascent bookings. Internal use only.",
      },
    ],
  }),
});

function MbmaPage() {
  return <Dashboard initialTab="mbma" />;
}
