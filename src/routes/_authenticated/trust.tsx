import { createFileRoute } from "@tanstack/react-router";
import { PhaseModule } from "@/components/PhaseModule";

export const Route = createFileRoute("/_authenticated/trust")({
  head: () => ({
    meta: [
      { title: "Trust & ratings — UTS" },
      { name: "description", content: "UTS trust & ratings module (planned)." },
      { property: "og:title", content: "Trust & ratings — UTS" },
      { property: "og:description", content: "UTS trust & ratings module (planned)." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PhaseModule id="trust" visual={{ kind: "chart" }} />;
}
