import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/dashboard/dashboard";
import { parseFipsParam } from "@/data/hunts";

export const Route = createFileRoute("/target-attack")({
  validateSearch: (s: Record<string, unknown>) => ({
    fips: parseFipsParam(s.fips),
  }),
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
