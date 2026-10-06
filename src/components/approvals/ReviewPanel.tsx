import { Fragment, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle, Check, CheckCircle2, ExternalLink, FileQuestion, FileText, Loader2, Phone, RefreshCw, Sparkles, UserCheck, X, XCircle, ZoomIn, ZoomOut,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { assessSubmission, getSupplierDossier, overrideExtraction } from "@/lib/ai.functions";
import { decideSupplier } from "@/lib/approvals.functions";
import { CONFIDENCE_THRESHOLD, EXTRACTION_SCHEMAS } from "@/lib/ai/schemas";

const inputCls = "w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs";

function Meter({ label, value }: { label: string; value: number }) {
  const tone = value >= 80 ? "bg-accent" : value >= 50 ? "bg-secondary" : "bg-destructive";
  return (
    <div className="flex-1 rounded-2xl bg-muted p-3">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-3xl font-bold text-primary">{value}%</div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-background"><div className={`h-full ${tone}`} style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function Conf({ v }: { v: number }) {
  const low = v < CONFIDENCE_THRESHOLD;
  return <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${low ? "bg-destructive/10 text-destructive" : "bg-lime-soft text-accent-foreground"}`}>{Math.round(v * 100)}%</span>;
}

function DocViewer({ doc }: { doc: any }) {
  const [zoom, setZoom] = useState(1);
  const isPdf = /\.pdf$/i.test(doc.file_name);
  if (!doc.url) return null;
  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-border bg-background">
      {isPdf ? (
        <iframe title={doc.file_name} src={doc.url} className="h-72 w-full" />
      ) : (
        <>
          <div className="flex justify-end gap-1 border-b border-border p-1">
            <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} className="rounded p-1 hover:bg-muted"><ZoomOut className="h-4 w-4" /></button>
            <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(4, z + 0.5))} className="rounded p-1 hover:bg-muted"><ZoomIn className="h-4 w-4" /></button>
          </div>
          <div className="h-72 overflow-auto">
            <img src={doc.url} alt={doc.file_name} style={{ width: `${zoom * 100}%`, maxWidth: "none" }} className="cursor-zoom-in" onClick={() => setZoom((z) => (z >= 4 ? 1 : z + 1))} />
          </div>
        </>
      )}
    </div>
  );
}

function ExtractionEditor({ doc, onSaved }: { doc: any; onSaved: () => void }) {
  const t = useT();
  const save = useServerFn(overrideExtraction);
  const def = EXTRACTION_SCHEMAS[doc.doc_type];
  const [edit, setEdit] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  if (!def) return <p className="text-xs text-muted-foreground">—</p>;
  const fields = doc.extracted_fields ?? {};
  const conf = doc.field_confidence ?? {};
  async function submit() {
    setBusy(true);
    try { await save({ data: { documentId: doc.id, fields: edit } }); toast.success(t("ai.confirmed")); setEdit({}); onSaved(); }
    catch { toast.error(t("ai.save_failed")); }
    setBusy(false);
  }
  return (
    <div className="space-y-2 rounded-xl bg-muted p-3">
      <div className="flex items-center justify-between text-sm font-semibold">{t(`doc.${doc.doc_type}`)}<span className="text-[10px] font-bold text-primary">{t(`ai.status.${doc.extraction_status}`)}</span></div>
      {doc.extraction_status === "rejected" && <p className="text-xs font-semibold text-destructive">{doc.ai_extracted?.reason}</p>}
      {def.fields.map((f) => {
        const val = f.key in edit ? edit[f.key] : fields[f.key];
        return (
          <label key={f.key} className="block text-xs">
            <span className="mb-0.5 flex items-center justify-between"><span className="text-muted-foreground">{t(`ai.field.${f.key}`)}</span><Conf v={conf[f.key] ?? 0} /></span>
            <input className={inputCls} value={Array.isArray(val) ? val.join(", ") : val ?? ""} maxLength={200}
              onChange={(e) => setEdit({ ...edit, [f.key]: f.list ? e.target.value.split(",").map((x) => x.trim()).filter(Boolean) : e.target.value })} />
          </label>
        );
      })}
      <button type="button" disabled={busy} onClick={submit} className="w-full rounded-lg bg-primary py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">{t("approvals.save_corrections")}</button>
    </div>
  );
}

function ClaimsVsAi({ caps }: { caps: any[] }) {
  const t = useT();
  const own = caps.filter((c) => c.source === "self_declared" || c.source === "human_confirmed");
  const ai = caps.filter((c) => c.source === "ai_extracted");
  const ownSystems = new Set(own.map((c) => c.systems?.name));
  const aiSystems = new Set(ai.map((c) => c.systems?.name));
  const all = [...new Set([...ownSystems, ...aiSystems])].filter(Boolean).sort();
  return (
    <div className="overflow-hidden rounded-xl border border-border text-xs">
      <div className="grid grid-cols-2 bg-muted font-bold"><div className="p-2">{t("approvals.supplier_says")}</div><div className="p-2">{t("approvals.ai_says")}</div></div>
      {all.map((sys) => {
        const s = ownSystems.has(sys);
        const a = aiSystems.has(sys);
        const disagree = ai.length > 0 && s !== a;
        const faults = [...new Set(ai.filter((c) => c.systems?.name === sys && c.fault_types?.name).map((c) => c.fault_types.name))];
        return (
          <div key={sys} className={`grid grid-cols-2 border-t border-border ${disagree ? "bg-destructive/5" : ""}`}>
            <div className="p-2">{s ? <span className="font-semibold">{sys}</span> : <span className="text-muted-foreground">—</span>}</div>
            <div className="p-2">
              {a ? <span className="font-semibold">{sys}{faults.length ? ` (${faults.join(", ")})` : ""}</span> : <span className="text-muted-foreground">—</span>}
              {disagree && <div className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-destructive"><AlertTriangle className="h-3 w-3" />{t("approvals.disagree")}</div>}
            </div>
          </div>
        );
      })}
      {all.length === 0 && <p className="p-2 text-muted-foreground">—</p>}
    </div>
  );
}

export function ReviewPanel({ supplierId, canDecide, canApprove, pending, onDecided }: { supplierId: string; canDecide: boolean; canApprove: boolean; pending: boolean; onDecided: () => void }) {
  const t = useT();
  const qc = useQueryClient();
  const load = useServerFn(getSupplierDossier);
  const assess = useServerFn(assessSubmission);
  const decide = useServerFn(decideSupplier);
  const q = useQuery({ queryKey: ["dossier", supplierId], queryFn: () => load({ data: { supplierId } }), retry: false });
  const a = useQuery({
    queryKey: ["assessment", supplierId], enabled: false, retry: false,
    queryFn: async () => { const r = await assess({ data: { supplierId } }); if (!r.ok) throw new Error(r.message); return r.assessment; },
  });
  const started = useRef(false);
  useEffect(() => { if (q.data && !q.data.assessment && !started.current) { started.current = true; a.refetch(); } }, [q.data, a]);
  const [mode, setMode] = useState<null | "approve" | "reject" | "request_evidence">(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (q.isLoading) return <div className="grid place-items-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  if (!q.data) return <p className="text-sm text-destructive">{t("common.save_failed")}</p>;
  const d = q.data as any;
  const s = d.supplier;
  const ai = (a.data ?? d.assessment) as any;
  const today = new Date().toISOString().slice(0, 10);
  const refresh = () => qc.invalidateQueries({ queryKey: ["dossier", supplierId] });
  const verified: string[] = d.checklist.items.filter((i: any) => i.ok).map((i: any) => i.key);
  const failed: string[] = d.checklist.items.filter((i: any) => !i.ok).map((i: any) => i.key);

  async function submit() {
    if (!mode) return;
    setBusy(true);
    const r = await decide({ data: { supplierId, action: mode, reason, verified, overridden: d.overrides } }).catch((e: Error) => ({ ok: false, message: e.message }));
    setBusy(false);
    if (!r.ok) { toast.error((r as any).message ?? t("common.save_failed")); return; }
    toast.success(t(mode === "approve" ? "supplier_status.approved" : mode === "reject" ? "supplier_status.rejected" : "approvals.request_evidence"));
    setMode(null); setReason(""); onDecided();
  }

  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4">
      <div className="flex items-center gap-2 rounded-2xl bg-primary p-3 text-sm font-bold text-primary-foreground"><UserCheck className="h-5 w-5 shrink-0" />{t("approvals.human_decides")}</div>

      {/* AI assessment */}
      <section className="space-y-3 rounded-2xl border border-primary/30 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-primary"><Sparkles className="h-4 w-4" />{t("approvals.ai_title")}</div>
          <button type="button" disabled={a.isFetching} onClick={() => a.refetch().then(refresh)} className="inline-flex items-center gap-1 text-xs font-bold text-primary disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${a.isFetching ? "animate-spin" : ""}`} />{t("approvals.reassess")}
          </button>
        </div>
        <div className="flex gap-2">
          <Meter label={t("approvals.conformity")} value={d.checklist.score} />
          {ai ? <Meter label={t("approvals.credibility")} value={ai.credibility} /> : <div className="flex flex-1 items-center justify-center rounded-2xl bg-muted p-3 text-xs text-muted-foreground">{a.isFetching ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />{t("approvals.assessing")}</> : a.isError ? t("approvals.ai_failed") : "—"}</div>}
        </div>
        {ai && (
          <>
            <p className="text-sm">{ai.summary}</p>
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${ai.recommendation === "approve" ? "bg-lime-soft text-accent-foreground" : ai.recommendation === "reject" ? "bg-destructive/10 text-destructive" : "bg-secondary text-primary"}`}>AI: {ai.recommendation}</span>
            {ai.red_flags?.length > 0 && (
              <ul className="space-y-1 text-xs">{ai.red_flags.map((f: string) => <li key={f} className="flex gap-1.5"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />{f}</li>)}</ul>
            )}
          </>
        )}
        <ul className="grid gap-1 text-xs sm:grid-cols-2">
          {d.checklist.items.map((i: any) => (
            <li key={i.key} className="flex items-center gap-1.5">{i.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> : <XCircle className="h-4 w-4 shrink-0 text-destructive" />}{i.key}</li>
          ))}
        </ul>
      </section>

      {/* Three columns */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="space-y-3">
          <h4 className="text-sm font-bold text-primary">{t("approvals.documents")}</h4>
          {d.docs.length === 0 && <p className="text-xs text-muted-foreground">{t("approvals.no_docs")}</p>}
          {d.docs.map((doc: any) => (
            <div key={doc.id} className="rounded-xl bg-muted p-3 text-xs">
              <div className="flex items-start gap-2">
                <FileText className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{t(`doc.${doc.doc_type}`)}</div>
                  <div className="truncate text-muted-foreground">{doc.file_name}</div>
                  {doc.expires_at && <span className={`mt-1 inline-block rounded-md px-1.5 py-0.5 font-bold ${doc.expires_at < today ? "bg-destructive text-destructive-foreground" : "bg-background"}`}>{t("approvals.expires")} {doc.expires_at}</span>}
                </div>
                {doc.url && <a href={doc.url} target="_blank" rel="noreferrer" aria-label={t("approvals.view_doc")} className="shrink-0 rounded-lg p-1.5 text-primary hover:bg-background"><ExternalLink className="h-4 w-4" /></a>}
              </div>
              <DocViewer doc={doc} />
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <h4 className="flex items-center gap-1.5 text-sm font-bold text-primary"><Sparkles className="h-4 w-4" />{t("approvals.ai_read")}</h4>
          {d.docs.map((doc: any) => <ExtractionEditor key={doc.id} doc={doc} onSaved={refresh} />)}
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-bold text-primary">{t("approvals.claims_vs_ai")}</h4>
          <ClaimsVsAi caps={d.caps} />
          <div className="rounded-xl border border-border p-3 text-xs">
            <div className="mb-1 font-bold text-primary">{t("approvals.contact")}</div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
              <dt className="text-muted-foreground">Name</dt><dd>{s.contact_full_name ?? "—"}</dd>
              <dt className="text-muted-foreground">ID</dt><dd>{s.contact_id_number ?? "—"}</dd>
              <dt className="text-muted-foreground">Phone</dt><dd>{s.phone ?? "—"}</dd>
              <dt className="text-muted-foreground">Legal name</dt><dd>{s.legal_name}{s.trading_name ? ` (${s.trading_name})` : ""}</dd>
              <dt className="text-muted-foreground">Reg. no.</dt><dd>{s.registration_number ?? "—"}</dd>
              <dt className="text-muted-foreground">{t("approvals.coverage")}</dt><dd>{d.coverage.map((c: any) => `${c.country_code} ${c.radius_km ?? ""}km`).join(", ") || "—"}</dd>
            </dl>
          </div>
          <div className="rounded-xl border border-border p-3 text-xs">
            <div className="mb-1 font-bold text-primary">{t("approvals.referees")}</div>
            {d.references.map((r: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-2 py-1">
                <div><div className="font-semibold">{r.name || "—"}</div><div className="text-muted-foreground">{r.company || "—"}</div></div>
                {r.phone && <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 font-bold text-primary"><Phone className="h-3.5 w-3.5" />{r.phone}</a>}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Actions */}
      {pending && canDecide && !mode && (
        <div className="grid gap-2 sm:grid-cols-3">
          <button onClick={() => setMode("reject")} className="flex items-center justify-center gap-1.5 rounded-xl border border-border py-3 text-sm font-bold text-destructive"><X className="h-4 w-4" />{t("approvals.reject")}</button>
          <button onClick={() => setMode("request_evidence")} className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary py-3 text-sm font-bold text-primary"><FileQuestion className="h-4 w-4" />{t("approvals.request_evidence")}</button>
          <button disabled={!canApprove} onClick={() => setMode("approve")} className="flex items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"><Check className="h-4 w-4" />{t("approvals.approve")}</button>
        </div>
      )}

      {mode && (
        <section className="space-y-3 rounded-2xl border-2 border-primary p-4">
          {mode === "approve" ? (
            <>
              <h4 className="font-bold text-primary">{t("approvals.confirm_title")}</h4>
              <div>
                <div className="mb-1 text-xs font-bold">{t("approvals.verified")}</div>
                <ul className="space-y-0.5 text-xs">{verified.map((v) => <li key={v} className="flex gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary" />{v}</li>)}</ul>
                {failed.length > 0 && <ul className="mt-1 space-y-0.5 text-xs text-destructive">{failed.map((v) => <li key={v} className="flex gap-1.5"><XCircle className="h-3.5 w-3.5" />{v}</li>)}</ul>}
              </div>
              <div>
                <div className="mb-1 text-xs font-bold">{t("approvals.overridden")}</div>
                {d.overrides.length === 0 ? <p className="text-xs text-muted-foreground">{t("approvals.none_overridden")}</p>
                  : <ul className="space-y-0.5 text-xs">{d.overrides.map((o: string, i: number) => <li key={i}>• {o}</li>)}</ul>}
              </div>
              <textarea className={`${inputCls} min-h-16`} placeholder={t("approvals.reason")} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} />
            </>
          ) : (
            <>
              <h4 className="font-bold text-primary">{t(mode === "reject" ? "approvals.reject" : "approvals.request_evidence")}</h4>
              <textarea autoFocus className={`${inputCls} min-h-20`} placeholder={t("approvals.reason")} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} />
            </>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setMode(null)} className="rounded-xl border border-border py-2.5 text-sm font-bold">{t("approvals.close")}</button>
            <button type="button" disabled={busy || (mode !== "approve" && reason.trim().length < 3)} onClick={submit} className="flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}{t(mode === "approve" ? "approvals.approve" : mode === "reject" ? "approvals.reject" : "approvals.request_evidence")}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export { Fragment };
