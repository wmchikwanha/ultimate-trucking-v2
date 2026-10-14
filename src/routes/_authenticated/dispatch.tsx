import { createFileRoute } from "@tanstack/react-router";
import { PhaseModule } from "@/components/PhaseModule";

export const Route = createFileRoute("/_authenticated/dispatch")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Dispatch — UTS" },
      { name: "description", content: "UTS dispatch module (planned)." },
      { property: "og:title", content: "Dispatch — UTS" },
      { property: "og:description", content: "UTS dispatch module (planned)." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PhaseModule id="dispatch" visual={{ kind: "pipeline", stages: 6 }} />;
}
