import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/dashboard/dashboard";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>) => ({
    tab: typeof s.tab === "string" ? s.tab : undefined,
    project: typeof s.project === "string" ? s.project : undefined,
  }),
  component: Home,
});

function Home() {
  const { tab, project } = Route.useSearch();
  const initialTab = tab === "dodge" ? "dodge" : tab === "target-attack" ? "target-attack" : "performance";
  return <Dashboard initialTab={initialTab} initialDodgeProject={project} />;
}
