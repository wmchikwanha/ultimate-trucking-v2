import { createFileRoute } from "@tanstack/react-router";
import { PhaseModule } from "@/components/PhaseModule";

export const Route = createFileRoute("/_authenticated/trust")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
