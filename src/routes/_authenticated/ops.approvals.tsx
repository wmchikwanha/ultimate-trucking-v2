import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronDown, X } from "lucide-react";
import { ReviewPanel } from "@/components/approvals/ReviewPanel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { PhaseModule } from "@/components/PhaseModule";
import { PageHeader, RoleNotice } from "@/components/PageHeader";
import type { Database } from "@/integrations/supabase/types";

type Status = Database["public"]["Enums"]["supplier_status"];

export const Route = createFileRoute("/_authenticated/ops/approvals")({
  head: () => ({
    meta: [
      { title: "Approval queue — UTS" },
      { name: "description", content: "Review and approve supplier applications." },
      { property: "og:title", content: "Approval queue — UTS" },
      { property: "og:description", content: "Review and approve supplier applications." },
    ],
  }),
  component: () => <PhaseModule id="approvals" visual={{ kind: "pipeline", stages: 4 }} live={Approvals} />,
});

const TABS: Status[] = ["pending_review", "approved", "rejected"];

function Approvals() {
  const t = useT();
  const qc = useQueryClient();
  const { user, roles } = useAuth();
  const canDecide = roles.some((r) => r === "admin" || r === "approver" || r === "ops");
  const [tab, setTab] = useState<Status>("pending_review");
  const [open, setOpen] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["approvals", tab],
    refetchOnMount: "always",
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id,legal_name,trading_name,kind,country_code,phone,email,created_at,status,supplier_capabilities(id,active,asset_classes(name),systems(name),makes(name))")
        .eq("status", tab)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function decide(id: string, status: Status) {
    const { error } = await supabase
      .from("suppliers")
      .update(status === "approved" ? { status, approved_at: new Date().toISOString(), approved_by: user.id } : { status })
      .eq("id", id);
    if (error) { toast.error(t("common.save_failed")); return; }
    toast.success(t(`supplier_status.${status}`));
    qc.invalidateQueries({ queryKey: ["approvals"] });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow={t("common.live")} title={t("module.approvals.title")} description={t("module.approvals.tagline")} />
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {TABS.map((s) => (
          <button key={s} onClick={() => setTab(s)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${tab === s ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}>
            {t(`supplier_status.${s}`)}
          </button>
        ))}
      </div>
      {q.data?.length === 0 && <RoleNotice text={t("approvals.empty")} />}
      <div className="space-y-3">
        {q.data?.map((s) => {
          const caps = (s.supplier_capabilities ?? []).filter((c: { active?: boolean }) => c.active !== false);
          const summary = Array.from(new Set(caps.map((c) => `${c.asset_classes?.name ?? ""} · ${c.systems?.name ?? ""}`))).slice(0, 6);
          const brands = Array.from(new Set(caps.map((c) => c.makes?.name).filter(Boolean)));
          return (
            <article key={s.id} className="rounded-3xl border border-border p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-primary">{s.legal_name}</h3>
                  <div className="text-xs text-muted-foreground">{t(`supplier_kind.${s.kind}`)} · {s.country_code} · {s.phone ?? "—"}</div>
                </div>
                <span className="rounded-full bg-lime-soft px-2.5 py-0.5 text-[11px] font-bold text-accent-foreground">{t("approvals.capability_count", { n: caps.length })}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {summary.map((x) => <span key={x} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-primary">{x}</span>)}
              </div>
              {brands.length > 0 && <div className="mt-2 text-xs text-muted-foreground">{t("approvals.brands")}: {brands.join(", ")}</div>}
              <button type="button" onClick={() => setOpen(open === s.id ? null : s.id)} className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-secondary py-2.5 text-sm font-bold text-primary">
                {open === s.id ? t("approvals.close") : t("approvals.open")}<ChevronDown className={`h-4 w-4 transition-transform ${open === s.id ? "rotate-180" : ""}`} />
              </button>
              {open === s.id && <ReviewPanel supplierId={s.id} />}
              {tab === "pending_review" && canDecide && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button onClick={() => decide(s.id, "rejected")} className="flex items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm font-bold text-destructive"><X className="h-4 w-4" />{t("approvals.reject")}</button>
                  <button onClick={() => decide(s.id, "approved")} className="flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground"><Check className="h-4 w-4" />{t("approvals.approve")}</button>
                </div>
              )}
              {tab === "pending_review" && !canDecide && <p className="mt-3 text-xs text-muted-foreground">{t("approvals.read_only")}</p>}
            </article>
          );
        })}
      </div>
    </div>
  );
}
