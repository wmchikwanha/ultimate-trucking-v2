import { useState } from "react";
import { AlertTriangle, CheckCircle2, CloudOff, FileText, Loader2, Pencil, Trash2, Upload } from "lucide-react";
import { useT } from "@/lib/i18n";
import type { Taxonomy } from "@/lib/taxonomy";
import { SUPPLIER_KINDS } from "@/lib/taxonomy";
import {
  BUSINESS_KINDS, DOC_TYPES, EQUIPMENT, LOCALES, PAYMENT_PREFS, REGIONS_BY_COUNTRY, expiresSoon, isExpired,
  type Draft, type DocEntry,
} from "@/lib/onboarding/model";
import { AiCapabilityTagger, DocExtractionReview } from "./AiReview";
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
  const v = draft.identity;
  const set = (patch: Partial<typeof v>) => update("identity", { ...v, ...patch });
  return (
    <div className="space-y-4">
      <Field label={t("wizard.full_name")}><input className={inputCls} autoComplete="name" value={v.fullName} onChange={(e) => set({ fullName: e.target.value })} maxLength={120} /></Field>
      <Field label={t("wizard.id_number")} hint={t("wizard.id_number_hint")}><input className={inputCls} value={v.idNumber} onChange={(e) => set({ idNumber: e.target.value })} maxLength={30} /></Field>
      <Field label={t("wizard.phone")} hint={t("wizard.phone_hint")}>
        <input className={inputCls} type="tel" inputMode="tel" autoComplete="tel" value={v.phone} onChange={(e) => set({ phone: e.target.value.replace(/[^\d+]/g, "") })} maxLength={16} />
      </Field>
      <Field label={t("wizard.language")}>
        <select className={inputCls} value={v.locale} onChange={(e) => set({ locale: e.target.value })}>
          {LOCALES.map((l) => <option key={l} value={l}>{t(`lang.${l}`)}</option>)}
        </select>
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
      <DocUploader {...p} types={[...DOC_TYPES]} title={t("wizard.all_docs")} />
      <DocExtractionReview supplierId={p.draft.supplierId} />
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
      <DocExtractionReview supplierId={draft.supplierId} />
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
      <DocUploader {...p} types={[...DOC_TYPES]} title={t("wizard.review_docs")} />
    </div>
  );
}

function DocUploader({ draft, addDocument, removeDocument, checking, types, title }: Props & { types: DocEntry["docType"][]; title: string }) {
  const t = useT();
  const [docType, setDocType] = useState<DocEntry["docType"]>(types[0] ?? "trade_certificate");
  const [expires, setExpires] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const docs = draft.documents.filter((d) => types.includes(d.docType));

  async function add() {
    if (!file) return;
    setBusy(true);
    const err = await addDocument(file, docType, expires || null);
    setBusy(false);
    setError(err);
    if (!err) { setFile(null); setExpires(""); }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border p-4">
      <div className="text-sm font-bold text-primary">{title}</div>
      {docs.map((d) => {
        const expired = isExpired(d.expiresAt);
        const soon = expiresSoon(d.expiresAt);
        return (
          <div key={d.id} className="flex items-center gap-3 rounded-xl bg-muted p-3">
            <FileText className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{t(`doc.${d.docType}`)}</div>
              <div className="truncate text-xs text-muted-foreground">{d.fileName}</div>
            </div>
            <div className="text-right">
              {d.expiresAt ? (
                <div className={`rounded-lg px-2 py-1 text-xs font-bold ${expired ? "bg-destructive text-destructive-foreground" : soon ? "bg-accent text-accent-foreground" : "bg-background text-primary"}`}>
                  {t("wizard.expires")} {d.expiresAt}
                </div>
              ) : <div className="text-xs text-muted-foreground">{t("wizard.no_expiry")}</div>}
              <div className="mt-1 text-[11px] text-muted-foreground">
                {checking.includes(d.id) ? <span className="inline-flex items-center gap-1 text-primary"><Loader2 className="h-3 w-3 animate-spin" />{t("wizard.checking_doc")}</span>
                  : d.state === "uploaded" ? <span className="text-primary">{t("wizard.uploaded")}</span> : <span className="inline-flex items-center gap-1"><CloudOff className="h-3 w-3" />{t("wizard.waiting_upload")}</span>}
              </div>
            </div>
            <button type="button" aria-label={t("wizard.delete_doc")} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-destructive hover:bg-destructive/10"
              onClick={async () => { if (!window.confirm(t("wizard.delete_confirm"))) return; const e = await removeDocument(d.id); setError(e); }}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      })}
      {types.length > 1 && (
        <select className={inputCls} value={docType} onChange={(e) => setDocType(e.target.value as DocEntry["docType"])}>
          {types.map((d) => <option key={d} value={d}>{t(`doc.${d}`)}</option>)}
        </select>
      )}
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-primary/40 p-4">
        <Upload className="h-5 w-5 text-primary" />
        <span className="flex-1 truncate text-sm">{file ? file.name : t("wizard.choose_file")}</span>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <Field label={t("wizard.expiry_date")} hint={t("wizard.expiry_hint")}>
        <input type="date" min={today} className={inputCls} value={expires} onChange={(e) => setExpires(e.target.value)} />
      </Field>
      {error && <p className="flex items-center gap-2 text-sm font-semibold text-destructive"><AlertTriangle className="h-4 w-4" />{t(error)}</p>}
      <button type="button" disabled={!file || busy} onClick={add} className="w-full rounded-xl bg-secondary py-3 text-sm font-bold text-primary disabled:opacity-50">{t("wizard.add_document")}</button>
    </div>
  );
}
