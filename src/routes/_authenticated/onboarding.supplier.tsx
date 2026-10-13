import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, Check, CloudOff, Loader2, RefreshCw, Send, FileText } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { latestDecisionReason } from "@/lib/approvals.functions";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTaxonomy } from "@/lib/taxonomy";
import { STEP_KEYS, TOTAL_STEPS } from "@/lib/onboarding/model";
import { useOnboarding } from "@/lib/onboarding/useOnboarding";
import { PhaseModule } from "@/components/PhaseModule";
import { StepBody } from "@/components/onboarding/Steps";

export const Route = createFileRoute("/_authenticated/onboarding/supplier")({
  head: () => ({
    meta: [
      { title: "Supplier registration — UTS" },
      { name: "description", content: "Register your workshop, mobile mechanic or recovery business with UTS." },
      { property: "og:title", content: "Supplier registration — UTS" },
      { property: "og:description", content: "Join the UTS verified supplier network." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <PhaseModule id="onboarding" visual={{ kind: "pipeline", stages: 4 }} live={Wizard} />,
});

function SyncBadge({ online, syncing, pending, error, onRetry }: { online: boolean; syncing: boolean; pending: number; error: string | null; onRetry: () => void }) {
  const t = useT();
  let cls = "bg-lime-soft text-accent-foreground", icon = <Check className="h-3.5 w-3.5" />, label = t("sync.all_saved");
  if (!online) { cls = "bg-secondary text-primary"; icon = <CloudOff className="h-3.5 w-3.5" />; label = t("sync.offline").replace("{n}", String(pending)); }
  else if (syncing) { cls = "bg-secondary text-primary"; icon = <Loader2 className="h-3.5 w-3.5 animate-spin" />; label = t("sync.syncing"); }
  else if (error) { cls = "bg-destructive/10 text-destructive"; icon = <AlertTriangle className="h-3.5 w-3.5" />; label = t("sync.error"); }
  else if (pending > 0) { cls = "bg-secondary text-primary"; icon = <RefreshCw className="h-3.5 w-3.5" />; label = t("sync.pending").replace("{n}", String(pending)); }
  return (
    <button type="button" onClick={onRetry} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${cls}`} aria-live="polite">
      {icon}{label}
    </button>
  );
}

function Wizard() {
  const t = useT();
  const { user } = useAuth();
  const { data: tax, isError } = useTaxonomy();
  const w = useOnboarding(user.id, t);
  const [errors, setErrors] = useState<string[]>([]);
  const getReason = useServerFn(latestDecisionReason);
  const sid = w.draft?.supplierId;
  const reasonQ = useQuery({ queryKey: ["decision-reason", sid], enabled: !!sid && !!w.draft?.serverUpdatedAt, retry: false, queryFn: () => sid ? getReason({ data: { supplierId: sid } }) : Promise.resolve({reason:null}) });

  if (!w.draft || !tax) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-sm text-muted-foreground">
        {isError ? t("wizard.need_signal_first") : <Loader2 className="h-6 w-6 animate-spin text-primary" />}
      </div>
    );
  }
  const d = w.draft;
  const step = d.step;
  const progress = Math.round((d.completed.filter((s) => s <= TOTAL_STEPS).length / TOTAL_STEPS) * 100);
  const submittedLocally = d.completed.includes(10);
  const underReview = d.status === "pending_review";

  async function next() {
    const errs = await w.saveStep(step);
    setErrors(errs);
    if (!errs.length) { toast.success(t("wizard.step_saved")); window.scrollTo({ top: 0 }); }
  }
  async function submit() {
    const errs = await w.submit();
    setErrors(errs);
    if (!errs.length) toast.success(t("wizard.submitted"));
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Persistent progress header */}
      <div className="sticky top-[57px] z-10 -mx-4 mb-4 border-b border-border bg-background/95 px-4 pb-3 pt-1 backdrop-blur md:mx-0 md:rounded-b-2xl">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("wizard.step_of").replace("{n}", String(step)).replace("{total}", String(TOTAL_STEPS))}</div>
          <SyncBadge online={w.online} syncing={w.syncing} pending={w.pending} error={w.lastError} onRetry={w.sync} />
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t("wizard.come_back")}</p>
      </div>

      {!underReview && reasonQ.data?.reason && (
        <div className="mb-4 flex gap-2 rounded-2xl bg-destructive/10 p-4 text-sm font-semibold text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{t("wizard.evidence_requested", { reason: reasonQ.data.reason })}
        </div>
      )}
      {(underReview || submittedLocally) && (
        <div className="mb-4 rounded-2xl bg-primary p-4 text-sm text-primary-foreground">
          {underReview ? t("wizard.under_review") : t("wizard.submit_queued")}
        </div>
      )}

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {STEP_KEYS.map((k, i) => {
          const n = i + 1;
          const done = d.completed.includes(n);
          return (
            <button key={k} type="button" onClick={() => { setErrors([]); w.goTo(n); }} aria-label={t(`wizard.step.${k}`)}
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${n === step ? "bg-primary text-primary-foreground" : done ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}>
              {done && n !== step ? <Check className="h-3.5 w-3.5" /> : n}
            </button>
          );
        })}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><Button variant="outline" onClick={() => {setErrors([]); w.goTo(10);}}><FileText/>{t("register.documents")} ({d.documents.length})</Button><LanguageSwitcher /></div>
      <h1 className="text-2xl font-bold text-primary">{t(`wizard.step.${STEP_KEYS[step - 1]}`)}</h1>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">{t(step === 2 ? "wizard.business_help" : `wizard.step.${STEP_KEYS[step - 1]}.help`)}</p>

      <StepBody step={step} draft={d} tax={tax} update={w.update} addDocument={w.addDocument} removeDocument={w.removeDocument} checking={w.checking} goTo={(n) => { setErrors([]); w.goTo(n); window.scrollTo({ top: 0 }); }} />

      {errors.length > 0 && (
        <ul className="mt-5 space-y-1 rounded-2xl bg-destructive/10 p-4 text-sm font-semibold text-destructive">
          {errors.map((e) => <li key={e} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{t(e)}</li>)}
        </ul>
      )}

      <div className="sticky bottom-[68px] z-10 -mx-4 mt-6 flex gap-2 border-t border-border bg-background px-4 py-3 md:bottom-0 md:mx-0">
        {step > 1 && (
          <button type="button" onClick={() => { setErrors([]); w.goTo(step - 1); }} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-border text-primary" aria-label={t("wizard.back")}>
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        {step < TOTAL_STEPS ? (
          <button type="button" onClick={next} className="h-12 flex-1 rounded-xl bg-primary font-bold text-primary-foreground">{t("wizard.save_continue")}</button>
        ) : (
          <button type="button" onClick={submit} disabled={underReview} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-accent font-bold text-accent-foreground disabled:opacity-60">
            <Send className="h-4 w-4" />{underReview ? t("wizard.already_submitted") : t("wizard.submit")}
          </button>
        )}
      </div>
    </div>
  );
}
