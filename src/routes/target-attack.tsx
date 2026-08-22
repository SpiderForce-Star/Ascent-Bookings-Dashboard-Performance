import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/dashboard/dashboard";

export const Route = createFileRoute("/target-attack")({
  validateSearch: (s: Record<string, unknown>) => {
    const raw = s.fips;
    if (raw == null || raw === "") return { fips: undefined as string | undefined };
    const fips = String(raw).replace(/"/g, "").padStart(5, "0");
    return { fips: /^\d{5}$/.test(fips) ? fips : undefined };
  },
  component: TargetAttackPage,
  head: () => ({
    meta: [
      { title: "Target-Attack · Ascent Buildings" },
      {
        name: "description",
        content:
          "County hunts on the 600-mile radar. MBMA industry dollars joined to Dodge projects on FIPS. Internal use only.",
      },
    ],
  }),
});

function TargetAttackPage() {
  const { fips } = Route.useSearch();
  return <Dashboard initialTab="target-attack" initialHuntFips={fips} />;
}
