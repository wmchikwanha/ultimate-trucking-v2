import { createFileRoute } from "@tanstack/react-router";
import { PhaseModule } from "@/components/PhaseModule";

export const Route = createFileRoute("/_authenticated/telematics")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Telematics — UTS" },
      { name: "description", content: "UTS telematics module (planned)." },
      { property: "og:title", content: "Telematics — UTS" },
      { property: "og:description", content: "UTS telematics module (planned)." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PhaseModule id="telematics" visual={{ kind: "chart", bars: false }} />;
}
