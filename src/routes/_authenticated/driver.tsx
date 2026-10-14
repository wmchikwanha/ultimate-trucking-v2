import { createFileRoute } from "@tanstack/react-router";
import { PhaseModule } from "@/components/PhaseModule";

export const Route = createFileRoute("/_authenticated/driver")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Driver app — UTS" },
      { name: "description", content: "UTS driver app module (planned)." },
      { property: "og:title", content: "Driver app — UTS" },
      { property: "og:description", content: "UTS driver app module (planned)." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PhaseModule id="driver" visual={{ kind: "phone", screens: 3 }} />;
}
