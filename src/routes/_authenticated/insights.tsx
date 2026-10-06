import { createFileRoute } from "@tanstack/react-router";
import { PhaseModule } from "@/components/PhaseModule";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({
    meta: [
      { title: "Insights — UTS" },
      { name: "description", content: "UTS insights module (planned)." },
      { property: "og:title", content: "Insights — UTS" },
      { property: "og:description", content: "UTS insights module (planned)." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PhaseModule id="insights" visual={{ kind: "chart" }} />;
}
