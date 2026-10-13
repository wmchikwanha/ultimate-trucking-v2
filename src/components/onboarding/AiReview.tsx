import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Sparkles, X, AlertTriangle } from "lucide-react";
import { useT } from "@/lib/i18n";
import { extractDocument, overrideExtraction, tagCapabilities, decideCapabilityTag, listAiReview } from "@/lib/ai.functions";
import { CONFIDENCE_THRESHOLD, extractionDefinition, type ExtractedFields } from "@/lib/ai/schemas";
import { inputCls } from "./fields";

function useReview(supplierId: string) {
  const list = useServerFn(listAiReview);
  return useQuery({
    queryKey: ["ai-review", supplierId],
    queryFn: () => list({ data: { supplierId } }),
    refetchInterval: (q) => (q.state.data?.docs.some((d: any) => ["pending", "processing"].includes(d.extraction_status)) ? 5000 : false),
    retry: false,
  });
}

function Conf({ v }: { v: number }) {
  const low = v < CONFIDENCE_THRESHOLD;
  return <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${low ? "bg-destructive/10 text-destructive" : "bg-lime-soft text-accent-foreground"}`}>{Math.round(v * 100)}%</span>;
}

export function DocExtractionReview({ supplierId }: { supplierId: string }) {
  const t = useT();
  const q = useReview(supplierId);
  const extract = useServerFn(extractDocument);
  const started = useRef(new Set<string>());
  const qc = useQueryClient();

  useEffect(() => {
    for (const d of q.data?.docs ?? []) {
      if (d.extraction_status === "pending" && !started.current.has(d.id) && extractionDefinition(d.doc_type, d.document_type?.extraction_schema)) {
        started.current.add(d.id);
        extract({ data: { documentId: d.id } }).finally(() => qc.invalidateQueries({ queryKey: ["ai-review", supplierId] }));
      }
    }
  }, [q.data, extract, qc, supplierId]);

  const docs = (q.data?.docs ?? []).filter((d: any) => extractionDefinition(d.doc_type, d.document_type?.extraction_schema));
  if (!docs.length) return null;
  return (
    <div className="space-y-3 rounded-2xl border border-primary/30 p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-primary"><Sparkles className="h-4 w-4" />{t("ai.doc_title")}</div>
      <p className="text-xs text-muted-foreground">{t("ai.doc_hint")}</p>
      {docs.map((d: any) => <DocCard key={d.id} doc={d} supplierId={supplierId} />)}
    </div>
  );
}

function DocCard({ doc, supplierId }: { doc: any; supplierId: string }) {
  const t = useT();
  const qc = useQueryClient();
  const save = useServerFn(overrideExtraction);
  const extract = useServerFn(extractDocument);
  const def = extractionDefinition(doc.doc_type, doc.document_type?.extraction_schema);
  const fields: ExtractedFields = doc.extracted_fields ?? {};
  const conf: Record<string, number> = doc.field_confidence ?? {};
  const [edit, setEdit] = useState<ExtractedFields>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["ai-review", supplierId] });
  const status: string = doc.extraction_status;
  const review = status === "needs_review";
  const lowKeys = (def?.fields ?? []).filter((f) => (conf[f.key] ?? 0) < CONFIDENCE_THRESHOLD).map((f) => f.key);

  async function confirm() {
    setBusy(true); setErr(null);
    try {
      const payload: ExtractedFields = {};
      for (const k of Object.keys(edit)) payload[k] = edit[k] ?? null;
      await save({ data: { documentId: doc.id, fields: payload as any } });
      await refresh();
    } catch { setErr("ai.save_failed"); }
    setBusy(false);
  }

  const show = (v: unknown) => (Array.isArray(v) ? v.join(", ") : (v as string) ?? "—");
  return (
    <div className="rounded-xl bg-muted p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">{doc.document_type?.local_name ?? t(`doc.${doc.doc_type}`)}</div>
        <span className="text-[11px] font-bold text-primary">{t(`ai.status.${status}`)}</span>
      </div>
      {(status === "pending" || status === "processing") && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />{t("ai.reading")}</div>}
      {status === "failed" && (
        <button type="button" className="text-xs font-bold text-primary underline" onClick={async () => { await extract({ data: { documentId: doc.id } }); refresh(); }}>{t("ai.retry")}</button>
      )}
      {status === "rejected" && (
        <div className="space-y-1">
          <p className="flex items-center gap-1 text-xs font-semibold text-destructive"><AlertTriangle className="h-3.5 w-3.5" />{t(doc.ai_extracted?.is_document === false || doc.ai_extracted?.legible_text === false ? "wizard.err.not_document" : "wizard.err.wrong_type")}</p>
          {doc.ai_extracted?.reason && <p className="text-xs text-muted-foreground">{String(doc.ai_extracted.reason)}</p>}
        </div>
      )}
      {["extracted", "needs_review", "confirmed"].includes(status) && (
        <div className="space-y-2">
          {review && <p className="flex items-center gap-1 text-xs font-semibold text-destructive"><AlertTriangle className="h-3.5 w-3.5" />{t("ai.check_low")}</p>}
          {(def?.fields ?? []).map((f) => {
            const editable = status !== "confirmed" && (!review || lowKeys.includes(f.key));
            if (review && !lowKeys.includes(f.key)) return (
              <div key={f.key} className="flex items-center justify-between gap-2 text-xs"><span className="text-muted-foreground">{t(`ai.field.${f.key}`)}</span><span className="truncate font-semibold">{show(fields[f.key])}</span><Conf v={conf[f.key] ?? 0} /></div>
            );
            const val = f.key in edit ? edit[f.key] : fields[f.key];
            return (
              <label key={f.key} className="block text-xs">
                <span className="mb-1 flex items-center justify-between"><span className="text-muted-foreground">{t(`ai.field.${f.key}`)}</span><Conf v={conf[f.key] ?? 0} /></span>
                {editable ? (
                  <input className={inputCls} value={Array.isArray(val) ? val.join(", ") : (val ?? "")} maxLength={200}
                    onChange={(e) => setEdit({ ...edit, [f.key]: f.list ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean) : e.target.value })} />
                ) : <span className="font-semibold">{show(val)}</span>}
              </label>
            );
          })}
          {status !== "confirmed" ? (
            <button type="button" disabled={busy} onClick={confirm} className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">{t("ai.confirm")}</button>
          ) : <p className="flex items-center gap-1 text-xs font-semibold text-primary"><CheckCircle2 className="h-3.5 w-3.5" />{t("ai.confirmed")}</p>}
          {err && <p className="text-xs text-destructive">{t(err)}</p>}
        </div>
      )}
    </div>
  );
}

export function AiCapabilityTagger({ supplierId }: { supplierId: string }) {
  const t = useT();
  const q = useReview(supplierId);
  const qc = useQueryClient();
  const tag = useServerFn(tagCapabilities);
  const decide = useServerFn(decideCapabilityTag);
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const value = text ?? q.data?.description ?? "";
  const refresh = () => qc.invalidateQueries({ queryKey: ["ai-review", supplierId] });

  async function run() {
    setBusy(true); setMsg(null);
    try {
      const r = await tag({ data: { supplierId, text: value } });
      if (!r.ok) setMsg(r.message === "pick_asset_class_first" ? "ai.pick_asset_first" : "ai.tag_failed");
      else if (!r.tags.length) setMsg("ai.no_tags");
      await refresh();
    } catch { setMsg("ai.tag_failed"); }
    setBusy(false);
  }

  return (
    <div className="space-y-3 rounded-2xl border border-primary/30 p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-primary"><Sparkles className="h-4 w-4" />{t("ai.tag_title")}</div>
      <p className="text-xs text-muted-foreground">{t("ai.tag_hint")}</p>
      <textarea className={`${inputCls} min-h-24`} maxLength={1500} value={value} onChange={(e) => setText(e.target.value)} placeholder={t("ai.tag_placeholder")} />
      <button type="button" disabled={busy || value.trim().length < 3} onClick={run} className="w-full rounded-xl bg-secondary py-2.5 text-sm font-bold text-primary disabled:opacity-50">
        {busy ? t("ai.reading") : t("ai.suggest")}
      </button>
      {msg && <p className="text-xs text-destructive">{t(msg)}</p>}
      {(q.data?.tags ?? []).map((g: any) => (
        <div key={`${g.systemId}:${g.faultTypeId ?? ""}`} className="flex items-center gap-2 rounded-xl bg-muted p-2">
          <span className="flex-1 text-sm font-semibold">{g.name}</span>
          <Conf v={g.confidence} />
          {g.active ? <span className="text-xs font-bold text-primary">{t("ai.accepted")}</span> : (
            <>
              <button type="button" aria-label={t("ai.accept")} onClick={async () => { await decide({ data: { supplierId, systemId: g.systemId, faultTypeId: g.faultTypeId, accept: true } }); refresh(); }} className="rounded-lg bg-primary p-1.5 text-primary-foreground"><CheckCircle2 className="h-4 w-4" /></button>
              <button type="button" aria-label={t("ai.reject")} onClick={async () => { await decide({ data: { supplierId, systemId: g.systemId, faultTypeId: g.faultTypeId, accept: false } }); refresh(); }} className="rounded-lg bg-background p-1.5 text-destructive"><X className="h-4 w-4" /></button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
