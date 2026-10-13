import { useEffect } from "react";
import { CheckCircle2, Pencil } from "lucide-react";
import { useI18n, useT } from "@/lib/i18n";
import type { Taxonomy } from "@/lib/taxonomy";
import { SUPPLIER_KINDS } from "@/lib/taxonomy";
import {
  BUSINESS_KINDS, EQUIPMENT, PAYMENT_PREFS, REGIONS_BY_COUNTRY,
  type Draft, type DocEntry,
} from "@/lib/onboarding/model";
import { AiCapabilityTagger } from "./AiReview";
import { DocumentChecklist } from "./DocumentChecklist";
import { Chip, Field, Stepper, inputCls, toggleIn } from "./fields";

type Props = {
  draft: Draft;
  tax: Taxonomy;
  update: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
  addDocument: (f: File, type: DocEntry["docType"], exp: string | null) => Promise<string | null>;
  removeDocument: (id: string) => Promise<string | null>;
  checking: string[];
  goTo: (step: number) => void;
};

export function StepBody({ step, ...p }: Props & { step: number }) {
  switch (step) {
    case 1: return <Identity {...p} />;
    case 2: return <Business {...p} />;
    case 3: return <Trade {...p} />;
    case 4: return <Capability {...p} />;
    case 5: return <Faults {...p} />;
    case 6: return <Equipment {...p} />;
    case 7: return <Coverage {...p} />;
    case 8: return <Commercial {...p} />;
    case 9: return <References {...p} />;
    default: return <Documents {...p} />;
  }
}

function Identity({ draft, update }: Props) {
  const t = useT();
  const { locale } = useI18n();
  const v = draft.identity;
  const set = (patch: Partial<typeof v>) => update("identity", { ...v, ...patch });
  // The supplier's language follows the single picker at the top of the page.
  useEffect(() => { if (v.locale !== locale) update("identity", { ...v, locale }); }, [locale]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-4">
      <Field label={t("wizard.full_name")}><input className={inputCls} autoComplete="name" value={v.fullName} onChange={(e) => set({ fullName: e.target.value })} maxLength={120} /></Field>
      <Field label={t("wizard.id_number")} hint={t("wizard.id_number_hint")}><input className={inputCls} value={v.idNumber} onChange={(e) => set({ idNumber: e.target.value })} maxLength={30} /></Field>
      <Field label={t("wizard.phone")} hint={t("wizard.phone_hint")}>
        <input className={inputCls} type="tel" inputMode="tel" autoComplete="tel" value={v.phone} onChange={(e) => set({ phone: e.target.value.replace(/[^\d+]/g, "") })} maxLength={16} />
      </Field>
    </div>
  );
}

function Business(p: Props) {
  const t = useT();
  const v = p.draft.business;
  const set = (patch: Partial<typeof v>) => p.update("business", { ...v, ...patch });
  return (
    <div className="space-y-4">
      <Field label={t("wizard.legal_name")}><input className={inputCls} value={v.legalName} onChange={(e) => set({ legalName: e.target.value })} maxLength={160} /></Field>
      <Field label={t("wizard.trading_name")}><input className={inputCls} value={v.tradingName} onChange={(e) => set({ tradingName: e.target.value })} maxLength={160} /></Field>
      <Field label={t("wizard.registration")} hint={t("wizard.registration_hint")}><input className={inputCls} value={v.registrationNumber} onChange={(e) => set({ registrationNumber: e.target.value.toUpperCase() })} maxLength={40} /></Field>
      <Field label={t("onboarding.country")}>
        <select className={inputCls} value={v.countryCode} onChange={(e) => set({ countryCode: e.target.value })}>
          {p.tax.countries.map((c) => <option key={c.iso2} value={c.iso2}>{c.name}</option>)}
        </select>
      </Field>
      <DocumentChecklist {...p} />
    </div>
  );
}

function Trade({ draft, update }: Props) {
  const t = useT();
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {SUPPLIER_KINDS.map((k) => {
        const on = draft.trade.kind === k;
        return (
          <button key={k} type="button" onClick={() => update("trade", { kind: k })}
            className={`rounded-2xl border p-4 text-left ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
            <div className="font-bold">{t(`supplier_kind.${k}`)}</div>
            {BUSINESS_KINDS.includes(k) && <div className={`text-xs ${on ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{t("wizard.needs_registration")}</div>}
          </button>
        );
      })}
    </div>
  );
}

function Capability({ draft, tax, update }: Props) {
  const t = useT();
  const c = draft.capability;
  const set = (patch: Partial<typeof c>) => update("capability", { ...c, ...patch });
  const synced = draft.syncedCapability;
  const savedSystem = (id: string) => !!synced?.systemIds.includes(id) && synced.assetClassIds.length > 0;
  const models = tax.models.filter((m) => c.makeIds.includes(m.make_id) && (!c.assetClassIds.length || c.assetClassIds.includes(m.asset_class_id)));
  const savedCount = c.systemIds.filter(savedSystem).length;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-2xl bg-lime-soft p-3">
        <div className="relative h-12 w-12 shrink-0">
          <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" className="stroke-background" strokeWidth="4" />
            <circle cx="18" cy="18" r="15" fill="none" className="stroke-primary" strokeWidth="4" strokeDasharray={`${(savedCount / Math.max(1, tax.systems.length)) * 94} 94`} />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-xs font-bold text-primary">{savedCount}</span>
        </div>
        <div className="text-sm">
          <div className="font-bold text-accent-foreground">{t("wizard.coverage_title")}</div>
          <div className="text-xs text-accent-foreground/80">{t("wizard.coverage_hint")}</div>
        </div>
      </div>
      <Group title={t("onboarding.asset_classes")}>
        {tax.assetClasses.map((a) => <Chip key={a.id} on={c.assetClassIds.includes(a.id)} label={a.name} onClick={() => set({ assetClassIds: toggleIn(c.assetClassIds, a.id) })} />)}
      </Group>
      <Group title={t("onboarding.systems")}>
        {tax.systems.map((s) => <Chip key={s.id} on={c.systemIds.includes(s.id)} saved={savedSystem(s.id)} label={s.name} onClick={() => set({ systemIds: toggleIn(c.systemIds, s.id) })} />)}
      </Group>
      <Group title={t("onboarding.makes")}>
        {tax.makes.map((m) => <Chip key={m.id} on={c.makeIds.includes(m.id)} label={m.name}
          onClick={() => set({ makeIds: toggleIn(c.makeIds, m.id), modelIds: c.makeIds.includes(m.id) ? c.modelIds.filter((x) => tax.models.find((mm) => mm.id === x)?.make_id !== m.id) : c.modelIds })} />)}
      </Group>
      {models.length > 0 && (
        <Group title={t("wizard.models")} hint={t("wizard.models_hint")}>
          {models.map((m) => <Chip key={m.id} on={c.modelIds.includes(m.id)} label={`${tax.makes.find((x) => x.id === m.make_id)?.name ?? ""} ${m.name}`} onClick={() => set({ modelIds: toggleIn(c.modelIds, m.id) })} />)}
        </Group>
      )}
      <p className="text-xs text-muted-foreground">
        <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-primary" />{t("wizard.saved_legend")}
      </p>
      <AiCapabilityTagger supplierId={draft.supplierId} />
    </div>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-sm font-bold">{title}</div>
      {hint && <div className="mb-2 text-xs text-muted-foreground">{hint}</div>}
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Faults({ draft, tax, update }: Props) {
  const t = useT();
  const ids = draft.faults.faultTypeIds;
  const systems = tax.systems.filter((s) => draft.capability.systemIds.includes(s.id));
  if (!systems.length) return <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">{t("wizard.faults_need_systems")}</p>;
  return (
    <div className="space-y-5">
      {systems.map((s) => (
        <Group key={s.id} title={s.name}>
          {tax.faultTypes.filter((f) => f.system_id === s.id).map((f) => (
            <Chip key={f.id} on={ids.includes(f.id)} label={f.name} onClick={() => update("faults", { faultTypeIds: toggleIn(ids, f.id) })} />
          ))}
        </Group>
      ))}
    </div>
  );
}

function Equipment({ draft, update }: Props) {
  const t = useT();
  return (
    <div className="space-y-2">
      {EQUIPMENT.map((k) => (
        <Stepper key={k} label={t(`equipment.${k}`)} value={draft.equipment[k] ?? 0} onChange={(n) => update("equipment", { ...draft.equipment, [k]: n })} />
      ))}
    </div>
  );
}

function Coverage({ draft, tax, update }: Props) {
  const t = useT();
  const v = draft.coverage;
  const set = (patch: Partial<typeof v>) => update("coverage", { ...v, ...patch });
  return (
    <div className="space-y-5">
      <Field label={t("wizard.radius")}>
        <input type="range" min={10} max={1000} step={10} value={v.radiusKm} onChange={(e) => set({ radiusKm: Number(e.target.value) })} className="w-full accent-[var(--primary)]" />
        <div className="mt-1 text-center font-display text-2xl font-bold text-primary">{v.radiusKm} km</div>
      </Field>
      <Group title={t("wizard.countries")}>
        {tax.countries.map((c) => <Chip key={c.iso2} on={v.countries.includes(c.iso2)} label={c.name} onClick={() => {
          const countries = toggleIn(v.countries, c.iso2);
          const removed = !countries.includes(c.iso2) ? REGIONS_BY_COUNTRY[c.iso2] ?? [] : [];
          set({ countries, regions: v.regions.filter((r) => !removed.includes(r)) });
        }} />)}
      </Group>
      {tax.countries.filter((c) => v.countries.includes(c.iso2) && REGIONS_BY_COUNTRY[c.iso2]?.length).map((c) => (
        <Group key={c.iso2} title={`${t("wizard.regions")} — ${c.name}`}>
          {(REGIONS_BY_COUNTRY[c.iso2] ?? []).map((r) => <Chip key={r} on={v.regions.includes(r)} label={t(`region.${r}`)} onClick={() => set({ regions: toggleIn(v.regions, r) })} />)}
        </Group>
      ))}
    </div>
  );
}

function Commercial({ draft, tax, update }: Props) {
  const t = useT();
  const v = draft.commercial;
  const set = (patch: Partial<typeof v>) => update("commercial", { ...v, ...patch });
  return (
    <div className="space-y-5">
      <Field label={t("wizard.currency")}>
        <select className={inputCls} value={v.currency} onChange={(e) => set({ currency: e.target.value })}>
          {tax.currencies.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
        </select>
      </Field>
      <Group title={t("wizard.payment_pref")}>
        {PAYMENT_PREFS.map((p) => <Chip key={p} on={v.paymentPreference === p} label={t(`payment.${p}`)} onClick={() => set({ paymentPreference: p })} />)}
      </Group>
      <label className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4">
        <span>
          <span className="block font-bold">{t("wizard.emergency")}</span>
          <span className="block text-xs text-muted-foreground">{t("wizard.emergency_hint")}</span>
        </span>
        <input type="checkbox" className="h-6 w-6 accent-[var(--primary)]" checked={v.emergency} onChange={(e) => set({ emergency: e.target.checked })} />
      </label>
    </div>
  );
}

function References({ draft, update }: Props) {
  const t = useT();
  const refs = draft.references;
  const set = (i: number, patch: Partial<Draft["references"][number]>) => update("references", refs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-4">
      {refs.map((r, i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-border p-4">
          <div className="text-sm font-bold text-primary">{t("wizard.reference_n").replace("{n}", String(i + 1))}</div>
          <input className={inputCls} placeholder={t("wizard.ref_name")} value={r.name} onChange={(e) => set(i, { name: e.target.value })} maxLength={120} />
          <input className={inputCls} placeholder={t("wizard.ref_company")} value={r.company} onChange={(e) => set(i, { company: e.target.value })} maxLength={120} />
          <input className={inputCls} type="tel" inputMode="tel" placeholder="+26771234567" value={r.phone} onChange={(e) => set(i, { phone: e.target.value.replace(/[^\d+]/g, "") })} maxLength={16} />
        </div>
      ))}
    </div>
  );
}

function EditLink({ step, goTo }: { step: number; goTo: (n: number) => void }) {
  const t = useT();
  return <button type="button" onClick={() => goTo(step)} className="inline-flex items-center gap-1 text-xs font-bold text-primary underline"><Pencil className="h-3 w-3" />{t("wizard.edit")}</button>;
}

function Documents(p: Props) {
  const { draft, tax, goTo } = p;
  const t = useT();
  const b = draft.business;
  const regionsLabel = draft.coverage.regions.map((r) => t(`region.${r}`)).join(", ");
  const countriesLabel = draft.coverage.countries.map((c) => tax.countries.find((x) => x.iso2 === c)?.name ?? c).join(", ");
  return (
    <div className="space-y-4">
      <DocumentChecklist {...p} />
      <div className="rounded-2xl border border-border p-4 text-sm">
        <div className="mb-1 flex items-center justify-between font-bold text-primary">{t("wizard.review_identity")}<EditLink step={1} goTo={goTo} /></div>
        <div>{draft.identity.fullName} · {draft.identity.phone}</div>
      </div>
      <div className="rounded-2xl border border-border p-4 text-sm">
        <div className="mb-1 flex items-center justify-between font-bold text-primary">{t("wizard.review_business")}<EditLink step={2} goTo={goTo} /></div>
        <div>{b.legalName}{b.tradingName ? ` (${b.tradingName})` : ""}</div>
        <div className="text-muted-foreground">{b.registrationNumber || "—"} · {draft.trade.kind ? t(`supplier_kind.${draft.trade.kind}`) : "—"}</div>
      </div>
      <div className="rounded-2xl border border-border p-4 text-sm">
        <div className="mb-1 flex items-center justify-between font-bold text-primary">{t("wizard.review_areas")}<EditLink step={7} goTo={goTo} /></div>
        <div>{countriesLabel} · {draft.coverage.radiusKm} km</div>
        {regionsLabel && <div className="text-muted-foreground">{regionsLabel}</div>}
      </div>
    </div>
  );
}
