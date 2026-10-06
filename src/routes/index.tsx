import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Crosshair, ShieldCheck, Truck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UTS — Roadside assistance for Southern African fleets" },
      { name: "description", content: "Ultimate Trucking Solutions connects stranded trucks with verified mechanics, recovery and parts across Southern Africa." },
      { property: "og:title", content: "UTS — Roadside assistance for Southern African fleets" },
      { property: "og:description", content: "Verified mechanics, recovery and parts across Southern Africa, matched in minutes." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const t = useT();
  const points = [
    { icon: ShieldCheck, k: "landing.point1" },
    { icon: Crosshair, k: "landing.point2" },
    { icon: Truck, k: "landing.point3" },
  ];
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Logo />
        <Link to="/auth" className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">{t("landing.sign_in")}</Link>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 md:pt-16">
        <h1 className="max-w-3xl text-3xl font-bold leading-tight md:text-5xl">
          <span className="text-accent">{t("brand.name")}</span>{" "}
          <span className="text-primary">{t("brand.tagline")}</span>
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground">{t("landing.intro")}</p>
        <Link to="/auth" className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-bold text-accent-foreground">
          {t("landing.cta")} <ArrowRight className="h-4 w-4" />
        </Link>
        <div className="mt-12 grid gap-3 sm:grid-cols-3">
          {points.map((p) => (
            <div key={p.k} className="rounded-3xl border border-border p-5">
              <p.icon className="mb-3 h-6 w-6 text-primary" />
              <p className="text-sm font-semibold">{t(p.k)}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 grid gap-4 rounded-3xl bg-primary p-6 text-primary-foreground sm:grid-cols-3">
          <div><div className="text-xs font-bold uppercase text-accent">{t("contact.email_label")}</div><div className="text-sm">{t("contact.email")}</div></div>
          <div><div className="text-xs font-bold uppercase text-accent">{t("contact.phone_label")}</div><div className="text-sm">{t("contact.phone")}</div></div>
          <div><div className="text-xs font-bold uppercase text-accent">{t("contact.address_label")}</div><div className="text-sm">{t("contact.address")}</div></div>
        </div>
      </main>
      <footer className="mx-auto max-w-5xl px-4 pb-6 text-center text-xs text-muted-foreground/70">
        (c) 2026. Developed by Walter C for Ultimate Trucking Solutions.
      </footer>
    </div>
  );
}
