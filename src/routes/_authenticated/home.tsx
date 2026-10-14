import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useFlags, useT } from "@/lib/i18n";
import { navFor } from "@/lib/nav";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Home — UTS" },
      { name: "description", content: "Your UTS workspace." },
      { property: "og:title", content: "Home — UTS" },
      { property: "og:description", content: "Your UTS workspace." },
    ],
  }),
  component: Home,
});

function Home() {
  const t = useT();
  const flags = useFlags();
  const { viewRole } = useAuth();
  const items = navFor(viewRole).filter((i) => i.id !== "home");
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow={t(`role.${viewRole ?? "none"}`)} title={t("home.title")} description={t("home.subtitle")} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => {
          const live = i.flag ? flags[i.flag] : true;
          return (
            <Link key={i.id} to={i.path} className={`group rounded-3xl border p-5 transition-colors ${live ? "border-primary/20 bg-card hover:border-primary" : "border-dashed border-border bg-muted/40"}`}>
              <div className="mb-4 flex items-center justify-between">
                <div className={`grid h-10 w-10 place-items-center rounded-xl ${live ? "bg-accent text-accent-foreground" : "bg-secondary text-primary"}`}><i.icon className="h-5 w-5" /></div>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${live ? "bg-lime-soft text-accent-foreground" : "bg-secondary text-primary"}`}>
                  {live ? t("common.live") : t("common.phase_n", { n: i.phase ?? 0 })}
                </span>
              </div>
              <div className="font-display font-bold text-primary">{t(`nav.${i.id}`)}</div>
              <p className="mt-1 text-sm text-muted-foreground">{t(`module.${i.id}.tagline`)}</p>
              <ArrowRight className="mt-3 h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
