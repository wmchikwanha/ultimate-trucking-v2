import { createFileRoute } from "@tanstack/react-router";
import { PhaseModule } from "@/components/PhaseModule";

export const Route = createFileRoute("/_authenticated/driver")({
  head: () => ({
    meta: [
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
