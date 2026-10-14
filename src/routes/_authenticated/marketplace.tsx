import { createFileRoute } from "@tanstack/react-router";
import { PhaseModule } from "@/components/PhaseModule";

export const Route = createFileRoute("/_authenticated/marketplace")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Marketplace — UTS" },
      { name: "description", content: "UTS marketplace module (planned)." },
      { property: "og:title", content: "Marketplace — UTS" },
      { property: "og:description", content: "UTS marketplace module (planned)." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PhaseModule id="marketplace" visual={{ kind: "grid" }} />;
}
