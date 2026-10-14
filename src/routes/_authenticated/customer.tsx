import { createFileRoute } from "@tanstack/react-router";
import { PhaseModule } from "@/components/PhaseModule";

export const Route = createFileRoute("/_authenticated/customer")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Customer app — UTS" },
      { name: "description", content: "UTS customer app module (planned)." },
      { property: "og:title", content: "Customer app — UTS" },
      { property: "og:description", content: "UTS customer app module (planned)." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PhaseModule id="customer" visual={{ kind: "phone", screens: 3 }} />;
}
