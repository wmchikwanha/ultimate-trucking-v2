import type { ComponentType } from "react";
import { CheckCircle2, Clock, Lock } from "lucide-react";
import { useFlags, useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { navItem, type ModuleId } from "@/lib/nav";
import { PageHeader, RoleNotice } from "./PageHeader";

type Visual =
  | { kind: "pipeline"; stages: number }
  | { kind: "phone"; screens: number }
  | { kind: "chart"; bars?: boolean }
  | { kind: "grid" };

/**
 * A module page driven by its feature flag. When the flag is on and a live
 * implementation is registered, that renders; otherwise the planned preview.
 */
export function PhaseModule({ id, visual, live: Live }: { id: ModuleId; visual: Visual; live?: ComponentType }) {
  const t = useT();
  const flags = useFlags();
  const { viewRole } = useAuth();
  const item = navItem(id);
  const enabled = item.flag ? !!flags[item.flag] : true;

  if (viewRole && !item.roles.includes(viewRole)) return <RoleNotice text={t("common.not_for_role")} />;
  if (enabled && Live) return <Live />;

  const phase = item.phase ?? 0;
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow={t("common.arrives_in_phase", { n: phase })} title={t(`module.${id}.title`)} description={t(`module.${id}.tagline`)}>
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-lime-soft px-3 py-1 text-xs font-bold text-accent-foreground">
          {enabled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
          {enabled ? t("common.enabled") : t("common.planned")}
        </span>
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-5">
        <section className="rounded-3xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="mb-2 text-sm font-bold text-primary">{t("common.what_it_does")}</h2>
          <p className="text-sm leading-relaxed text-foreground/80">{t(`module.${id}.desc`)}</p>
          <ul className="mt-4 space-y-2.5">
            {[1, 2, 3].map((i) => (
              <li key={i} className="flex gap-2.5 text-sm">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                <span>{t(`module.${id}.feature${i}`)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-3xl border border-border bg-muted/50 p-5 lg:col-span-3">
          <VisualBlock id={id} visual={visual} />
        </section>
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl bg-primary p-4 text-primary-foreground">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <p className="text-sm">{enabled ? t("common.enabled_banner") : t("common.activates", { n: phase })}</p>
      </div>
    </div>
  );
}

function VisualBlock({ id, visual }: { id: ModuleId; visual: Visual }) {
  const t = useT();
  if (visual.kind === "pipeline") {
    return (
      <ol className="relative space-y-3 sm:flex sm:space-y-0 sm:gap-2">
        {Array.from({ length: visual.stages }, (_, i) => (
          <li key={i} className="flex items-center gap-3 sm:flex-1 sm:flex-col sm:text-center">
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 text-sm font-bold ${i === 0 ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"}`}>
              {i + 1}
            </div>
            <div className="text-xs font-semibold text-foreground/80">{t(`module.${id}.stage${i + 1}`)}</div>
          </li>
        ))}
      </ol>
    );
  }
  if (visual.kind === "phone") {
    return (
      <div className="flex justify-center">
        <div className="w-56 rounded-[2.2rem] border-[6px] border-primary bg-background p-3 shadow-lg">
          <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-border" />
          <div className="mb-3 rounded-2xl bg-primary p-3 text-primary-foreground">
            <div className="text-[10px] opacity-80">{t("brand.name")}</div>
            <div className="font-display text-sm font-bold">{t(`module.${id}.title`)}</div>
          </div>
          <div className="space-y-2">
            {Array.from({ length: visual.screens }, (_, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl border border-border p-2.5">
                <div className={`h-7 w-7 rounded-lg ${i === 0 ? "bg-accent" : "bg-secondary"}`} />
                <div className="text-[11px] font-semibold">{t(`module.${id}.screen${i + 1}`)}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl bg-accent py-2 text-center text-[11px] font-bold text-accent-foreground">{t(`module.${id}.cta`)}</div>
        </div>
      </div>
    );
  }
  if (visual.kind === "grid") {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-2xl border border-dashed border-border bg-background p-3">
            <div className="mb-2 aspect-[4/3] rounded-xl bg-secondary" />
            <div className="mb-1 h-2 w-3/4 rounded bg-border" />
            <div className="h-2 w-1/2 rounded bg-border" />
          </div>
        ))}
        <p className="col-span-full text-center text-xs text-muted-foreground">{t("common.empty_listings")}</p>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>{t(`module.${id}.chart_title`)}</span>
        <span className="rounded-full bg-background px-2 py-0.5">{t("common.last_30_days")}</span>
      </div>
      <div className="relative h-44 rounded-2xl border border-border bg-background p-3">
        <div className="absolute inset-3 flex flex-col justify-between">
          {[0, 1, 2, 3].map((i) => <div key={i} className="border-t border-dashed border-border" />)}
        </div>
        <div className="relative flex h-full items-end gap-2">
          {[30, 45, 25, 60, 40, 70, 50, 35].map((h, i) => (
            <div key={i} className="flex-1 rounded-t-md bg-secondary" style={{ height: visual.bars === false ? 2 : `${h}%` }} />
          ))}
        </div>
        <div className="absolute inset-0 grid place-items-center">
          <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">{t("common.empty_chart")}</span>
        </div>
      </div>
    </div>
  );
}
