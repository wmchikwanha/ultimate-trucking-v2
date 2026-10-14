import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ChevronDown, FileText, UserCheck } from "lucide-react";
import { ReviewPanel } from "@/components/approvals/ReviewPanel";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { listQueue } from "@/lib/approvals.functions";
import { PhaseModule } from "@/components/PhaseModule";
import { PageHeader, RoleNotice } from "@/components/PageHeader";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const Route = createFileRoute("/_authenticated/ops/approvals")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Approval queue — UTS" },
      { name: "description", content: "Review and approve supplier applications." },
      { property: "og:title", content: "Approval queue — UTS" },
      { property: "og:description", content: "Review and approve supplier applications." },
    ],
  }),
  component: () => <PhaseModule id="approvals" visual={{ kind: "pipeline", stages: 4 }} live={Approvals} />,
});

const TABS = ["pending_review", "approved", "rejected"] as const;
type Tab = (typeof TABS)[number];
const SORTS = [
  { key: "submitted", label: "Date submitted" },
  { key: "country", label: "Country" },
  { key: "kind", label: "Type of business" },
  { key: "docs", label: "Number of documents" },
  { key: "flags", label: "Flags" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

function Approvals() {
  const t = useT();
  const qc = useQueryClient();
  const { roles } = useAuth();
  const canDecide = roles.some((r) => r === "admin" || r === "approver" || r === "ops");
  const canApprove = roles.some((r) => r === "admin" || r === "approver");
  const [tab, setTab] = useState<Tab>("pending_review");
  const [sort, setSort] = useState<SortKey>("submitted");
  const [open, setOpen] = useState<string | null>(null);
  const list = useServerFn(listQueue);

  const q = useQuery({ queryKey: ["approvals", tab], refetchOnMount: "always", refetchInterval: 30_000, queryFn: () => list({ data: { status: tab } }) });

  const rows = useMemo(() => {
    const r = [...(q.data ?? [])] as any[];
    const by: Record<SortKey, (a: any, b: any) => number> = {
      submitted: (a, b) => String(b.submitted_at ?? b.created_at).localeCompare(String(a.submitted_at ?? a.created_at)),
      country: (a, b) => a.country_code.localeCompare(b.country_code),
      kind: (a, b) => a.kind.localeCompare(b.kind),
      docs: (a, b) => b.docCount - a.docCount,
      flags: (a, b) => b.flags - a.flags,
    };
    return r.sort(by[sort]);
  }, [q.data, sort]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow={t("common.live")} title={t("module.approvals.title")} description={t("module.approvals.tagline")} />
      <div className="mb-3 flex justify-end"><LanguageSwitcher /></div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((s) => (
          <button key={s} onClick={() => { setTab(s); setOpen(null); }} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${tab === s ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}>
            {t(`supplier_status.${s}`)}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          {t("approvals.sort")}
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs">
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
      </div>
      {q.data?.length === 0 && <RoleNotice text={t("approvals.empty")} />}
      <div className="space-y-3">
        {rows.map((s) => {
          const summary = Array.from(new Set(s.caps.map((c: any) => `${c.asset_classes?.name ?? ""} · ${c.systems?.name ?? ""}`))).slice(0, 6) as string[];
          return (
            <article key={s.id} className="rounded-3xl border border-border p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-primary">{s.trading_name || s.legal_name}</h3>
                  <div className="text-xs text-muted-foreground">
                    {t(`supplier_kind.${s.kind}`)} · {s.country_code} · {s.phone ?? "—"} · {(s.submitted_at ?? s.created_at).slice(0, 10)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-bold text-primary"><FileText className="h-3 w-3" />{t("approvals.docs_count", { n: s.docCount })}</span>
                  <span className="rounded-full bg-lime-soft px-2.5 py-0.5 text-[11px] font-bold text-accent-foreground">{t("approvals.capability_count", { n: s.caps.length })}</span>
                  {s.flags > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-[11px] font-bold text-destructive"><AlertTriangle className="h-3 w-3" />{s.flags} {t("approvals.flags")}</span>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {summary.map((x) => <span key={x} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-primary">{x}</span>)}
              </div>
              {s.approverName && (
                <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary"><UserCheck className="h-4 w-4" />{t("approvals.approved_by", { name: s.approverName, date: String(s.approved_at ?? "").slice(0, 10) })}</p>
              )}
              <button type="button" onClick={() => setOpen(open === s.id ? null : s.id)} className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-secondary py-2.5 text-sm font-bold text-primary">
                {open === s.id ? t("approvals.close") : t("approvals.open")}<ChevronDown className={`h-4 w-4 transition-transform ${open === s.id ? "rotate-180" : ""}`} />
              </button>
              {open === s.id && (
                <ReviewPanel supplierId={s.id} canDecide={canDecide} canApprove={canApprove} pending={tab === "pending_review"}
                  onDecided={() => { setOpen(null); qc.invalidateQueries({ queryKey: ["approvals"] }); }} />
              )}
              {tab === "pending_review" && !canDecide && <p className="mt-3 text-xs text-muted-foreground">{t("approvals.read_only")}</p>}
            </article>
          );
        })}
      </div>
    </div>
  );
}
