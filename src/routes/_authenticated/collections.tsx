import { createFileRoute } from "@tanstack/react-router";
import { PhaseModule } from "@/components/PhaseModule";

export const Route = createFileRoute("/_authenticated/collections")({
  head: () => ({
    meta: [
      { title: "Collections — UTS" },
      { name: "description", content: "UTS collections module (planned)." },
      { property: "og:title", content: "Collections — UTS" },
      { property: "og:description", content: "UTS collections module (planned)." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PhaseModule id="collections" visual={{ kind: "pipeline", stages: 4 }} />;
}
