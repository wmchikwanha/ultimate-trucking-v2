import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ChevronDown, PlayCircle } from "lucide-react";
import { useT } from "@/lib/i18n";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/help")({
  head: () => ({
    meta: [
      { title: "Demo guide & FAQ — UTS" },
      { name: "description", content: "Step-by-step demo of the UTS network and answers to common questions." },
      { property: "og:title", content: "Demo guide & FAQ — UTS" },
      { property: "og:description", content: "How to try supplier sign-up, approvals and the match engine." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Help,
});

type Step = { n: number; role: string; to: "/onboarding/supplier" | "/ops/approvals" | "/match" | "/home" };
const STEPS: Step[] = [
  { n: 1, role: "supplier", to: "/onboarding/supplier" },
  { n: 2, role: "supplier", to: "/onboarding/supplier" },
  { n: 3, role: "approver", to: "/ops/approvals" },
  { n: 4, role: "approver", to: "/ops/approvals" },
  { n: 5, role: "ops", to: "/match" },
  { n: 6, role: "ops", to: "/match" },
  { n: 7, role: "ops", to: "/match" },
  { n: 8, role: "ops", to: "/match" },
  { n: 9, role: "admin", to: "/home" },
];
const FAQ_COUNT = 10;

function Help() {
  const t = useT();
  const [i, setI] = useState(0);
  const s = STEPS[i]!;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={t("help.eyebrow")} title={t("help.title")} description={t("help.intro")} />

      <section aria-labelledby="tour" className="rounded-3xl border border-primary/30 p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="tour" className="flex items-center gap-2 font-display text-lg font-bold text-primary"><PlayCircle className="h-5 w-5" />{t("help.tour_title")}</h2>
          <span className="text-xs font-bold text-muted-foreground" aria-live="polite">{t("help.step_of", { n: i + 1, total: STEPS.length })}</span>
        </div>
        <ol className="mb-4 flex gap-1" aria-hidden="true">
          {STEPS.map((x, k) => <li key={x.n} className={`h-1.5 flex-1 rounded-full ${k <= i ? "bg-primary" : "bg-secondary"}`} />)}
        </ol>
        <span className="inline-block rounded-full bg-lime-soft px-2.5 py-0.5 text-[11px] font-bold text-accent-foreground">{t("help.sign_in_as", { role: t(`role.${s.role}`) })}</span>
        <h3 className="mt-2 text-base font-bold text-primary">{t(`help.step${s.n}.title`)}</h3>
        <p className="mt-1 text-sm">{t(`help.step${s.n}.do`)}</p>
        <p className="mt-2 rounded-xl bg-muted p-3 text-sm"><span className="font-bold">{t("help.you_should_see")}</span> {t(`help.step${s.n}.see`)}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" disabled={i === 0} onClick={() => setI(i - 1)} className="inline-flex h-11 items-center gap-1 rounded-xl border border-border px-4 text-sm font-bold text-primary disabled:opacity-40"><ArrowLeft className="h-4 w-4" />{t("help.back")}</button>
          <button type="button" disabled={i === STEPS.length - 1} onClick={() => setI(i + 1)} className="inline-flex h-11 items-center gap-1 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-40">{t("help.next")}<ArrowRight className="h-4 w-4" /></button>
          <Link to={s.to} className="ml-auto inline-flex h-11 items-center rounded-xl bg-accent px-4 text-sm font-bold text-accent-foreground">{t("help.open_screen")}</Link>
        </div>
      </section>

      <section aria-labelledby="faq" className="mt-6">
        <h2 id="faq" className="mb-3 font-display text-lg font-bold text-primary">{t("help.faq_title")}</h2>
        <div className="space-y-2">
          {Array.from({ length: FAQ_COUNT }, (_, k) => (
            <details key={k} className="group rounded-2xl border border-border p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-bold text-primary">
                {t(`help.faq${k + 1}.q`)}<ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm text-foreground/80">{t(`help.faq${k + 1}.a`)}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
