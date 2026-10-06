import { Fragment, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, ExternalLink, FileText, Loader2, Phone, RefreshCw, Sparkles, XCircle } from "lucide-react";
import { useT } from "@/lib/i18n";
import { assessSubmission, getSupplierDossier } from "@/lib/ai.functions";

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

export function ReviewPanel({ supplierId }: { supplierId: string }) {
  const t = useT();
  const qc = useQueryClient();
  const load = useServerFn(getSupplierDossier);
  const assess = useServerFn(assessSubmission);
  const q = useQuery({ queryKey: ["dossier", supplierId], queryFn: () => load({ data: { supplierId } }), retry: false });
  const a = useQuery({
    queryKey: ["assessment", supplierId],
    enabled: false,
    retry: false,
    queryFn: async () => {
      const r = await assess({ data: { supplierId } });
      if (!r.ok) throw new Error(r.message);
      return r.assessment;
    },
  });
  const started = useRef(false);
  useEffect(() => {
    if (q.data && !q.data.assessment && !started.current) { started.current = true; a.refetch(); }
  }, [q.data, a]);

  if (q.isLoading) return <div className="grid place-items-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  if (!q.data) return <p className="text-sm text-destructive">{t("common.save_failed")}</p>;
  const d = q.data as any;
  const s = d.supplier;
  const ai = (a.data ?? d.assessment) as any;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4">
      {/* AI assessment */}
      <section className="space-y-3 rounded-2xl border border-primary/30 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-primary"><Sparkles className="h-4 w-4" />{t("approvals.ai_title")}</div>
          <button type="button" disabled={a.isFetching} onClick={() => a.refetch().then(() => qc.invalidateQueries({ queryKey: ["dossier", supplierId] }))} className="inline-flex items-center gap-1 text-xs font-bold text-primary disabled:opacity-50">
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
              <div>
                <div className="mb-1 text-xs font-bold text-destructive">{t("approvals.red_flags")}</div>
                <ul className="space-y-1 text-xs">{ai.red_flags.map((f: string) => <li key={f} className="flex gap-1.5"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />{f}</li>)}</ul>
              </div>
            )}
          </>
        )}
        <div>
          <div className="mb-1 text-xs font-bold text-muted-foreground">{t("approvals.checklist")}</div>
          <ul className="grid gap-1 text-xs sm:grid-cols-2">
            {d.checklist.items.map((i: any) => (
              <li key={i.key} className="flex items-center gap-1.5">
                {i.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> : <XCircle className="h-4 w-4 shrink-0 text-destructive" />}{i.key}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Applicant */}
      <section className="rounded-2xl border border-border p-4 text-sm">
        <div className="mb-2 font-bold text-primary">{t("approvals.contact")}</div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          <dt className="text-muted-foreground">Name</dt><dd>{s.contact_full_name ?? "—"}</dd>
          <dt className="text-muted-foreground">ID</dt><dd>{s.contact_id_number ?? "—"}</dd>
          <dt className="text-muted-foreground">Phone</dt><dd>{s.phone ?? "—"}</dd>
          <dt className="text-muted-foreground">Legal name</dt><dd>{s.legal_name}{s.trading_name ? ` (${s.trading_name})` : ""}</dd>
          <dt className="text-muted-foreground">Reg. no.</dt><dd>{s.registration_number ?? "—"}</dd>
          <dt className="text-muted-foreground">{t("approvals.coverage")}</dt><dd>{d.coverage.map((c: any) => `${c.country_code} ${c.radius_km ?? ""}km`).join(", ") || "—"}</dd>
        </dl>
      </section>

      {/* Documents */}
      <section className="rounded-2xl border border-border p-4">
        <div className="mb-2 text-sm font-bold text-primary">{t("approvals.documents")}</div>
        {d.docs.length === 0 && <p className="text-xs text-muted-foreground">{t("approvals.no_docs")}</p>}
        <div className="space-y-3">
          {d.docs.map((doc: any) => {
            const check = doc.ai_extracted ?? {};
            const expired = doc.expires_at && doc.expires_at < today;
            const fields = Object.entries(doc.extracted_fields ?? {});
            return (
              <div key={doc.id} className="rounded-xl bg-muted p-3 text-xs">
                <div className="flex items-start gap-2">
                  <FileText className="h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{t(`doc.${doc.doc_type}`)}</div>
                    <div className="truncate text-muted-foreground">{doc.file_name}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className={`rounded-md px-1.5 py-0.5 font-bold ${doc.extraction_status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-background text-primary"}`}>{t(`ai.status.${doc.extraction_status}`)}</span>
                      {doc.expires_at && <span className={`rounded-md px-1.5 py-0.5 font-bold ${expired ? "bg-destructive text-destructive-foreground" : "bg-background"}`}>{t("approvals.expires")} {doc.expires_at}</span>}
                      {typeof check.credibility === "number" && <span className="rounded-md bg-background px-1.5 py-0.5 font-bold">{t("approvals.credibility")} {Math.round(check.credibility * 100)}%</span>}
                    </div>
                  </div>
                  {doc.url && <a href={doc.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 font-bold text-primary-foreground"><ExternalLink className="h-3.5 w-3.5" />{t("approvals.view_doc")}</a>}
                </div>
                {check.reason && <p className="mt-2 italic text-muted-foreground">{check.reason}</p>}
                {fields.length > 0 && (
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                    {fields.map(([k, v]) => (
                      <Fragment key={k}><dt className="text-muted-foreground">{t(`ai.field.${k}`)}</dt><dd className="font-semibold">{Array.isArray(v) ? v.join(", ") : (v as string) ?? "—"}</dd></Fragment>
                    ))}
                  </dl>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Referees */}
      <section className="rounded-2xl border border-border p-4">
        <div className="mb-2 text-sm font-bold text-primary">{t("approvals.referees")}</div>
        <div className="space-y-2">
          {d.references.length === 0 && <p className="text-xs text-muted-foreground">—</p>}
          {d.references.map((r: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-xl bg-muted p-3 text-xs">
              <div><div className="font-semibold">{r.name || "—"}</div><div className="text-muted-foreground">{r.company || "—"}</div></div>
              {r.phone && <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 font-bold text-primary"><Phone className="h-3.5 w-3.5" />{r.phone}</a>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
