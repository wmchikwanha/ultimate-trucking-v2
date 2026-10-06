import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Crosshair, Loader2, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { useTaxonomy } from "@/lib/taxonomy";
import { PhaseModule } from "@/components/PhaseModule";
import { PageHeader, RoleNotice } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/match")({
  head: () => ({
    meta: [
      { title: "Match engine — UTS" },
      { name: "description", content: "Find the best verified supplier for a specific vehicle and fault." },
      { property: "og:title", content: "Match engine — UTS" },
      { property: "og:description", content: "Capability matching by make, model and system." },
    ],
  }),
  component: () => <PhaseModule id="match" visual={{ kind: "pipeline", stages: 4 }} live={Match} />,
});

type Result = {
  supplierId: string;
  name: string;
  kind: string;
  country: string;
  phone: string | null;
  score: number;
  reasons: { key: string; vars?: Record<string, string | number> }[];
};

const field = "w-full rounded-xl border border-input bg-background px-4 py-3 text-sm";

function Match() {
  const t = useT();
  const { data: tax } = useTaxonomy();
  const [q, setQ] = useState({ asset: "", system: "", make: "", country: "BW" });
  const [results, setResults] = useState<Result[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    let query = supabase
      .from("supplier_capabilities")
      .select("make_id,source,confidence,suppliers!inner(id,legal_name,trading_name,kind,country_code,phone,status)")
      .eq("asset_class_id", q.asset)
      .eq("system_id", q.system)
      .eq("suppliers.status", "approved")
      .eq("active", true);
    if (q.make) query = query.or(`make_id.eq.${q.make},make_id.is.null`);
    const { data } = await query;
    const by = new Map<string, Result>();
    for (const c of data ?? []) {
      const s = c.suppliers;
      const makeSpecific = !!q.make && c.make_id === q.make;
      const confirmed = c.source === "human_confirmed";
      const sameCountry = s.country_code === q.country;
      const score = Number(c.confidence) * 50 + (makeSpecific ? 25 : 0) + (confirmed ? 15 : 0) + (sameCountry ? 10 : 0);
      const prev = by.get(s.id);
      if (prev && prev.score >= score) continue;
      const reasons: Result["reasons"] = [{ key: "match.reason_capability" }];
      if (makeSpecific) reasons.push({ key: "match.reason_make" });
      if (confirmed) reasons.push({ key: "match.reason_confirmed" });
      else reasons.push({ key: "match.reason_self_declared" });
      if (sameCountry) reasons.push({ key: "match.reason_country" });
      by.set(s.id, { supplierId: s.id, name: s.trading_name || s.legal_name, kind: s.kind, country: s.country_code, phone: s.phone, score: Math.round(score), reasons });
    }
    setResults([...by.values()].sort((a, b) => b.score - a.score));
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow={t("common.live")} title={t("module.match.title")} description={t("module.match.tagline")} />
      <form onSubmit={run} className="grid gap-3 rounded-3xl border border-border p-5 sm:grid-cols-2">
        <label className="text-xs font-semibold text-muted-foreground">{t("match.asset_class")}
          <select required className={`${field} mt-1`} value={q.asset} onChange={(e) => setQ({ ...q, asset: e.target.value })}>
            <option value="">{t("common.select")}</option>
            {tax?.assetClasses.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted-foreground">{t("match.system")}
          <select required className={`${field} mt-1`} value={q.system} onChange={(e) => setQ({ ...q, system: e.target.value })}>
            <option value="">{t("common.select")}</option>
            {tax?.systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted-foreground">{t("match.make")}
          <select className={`${field} mt-1`} value={q.make} onChange={(e) => setQ({ ...q, make: e.target.value })}>
            <option value="">{t("match.any_make")}</option>
            {tax?.makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted-foreground">{t("match.country")}
          <select className={`${field} mt-1`} value={q.country} onChange={(e) => setQ({ ...q, country: e.target.value })}>
            {tax?.countries.map((c) => <option key={c.iso2} value={c.iso2}>{c.name}</option>)}
          </select>
        </label>
        <button disabled={busy} className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-bold text-primary-foreground sm:col-span-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}{t("match.run")}
        </button>
      </form>

      <div className="mt-6 space-y-3">
        {results?.length === 0 && <RoleNotice text={t("match.no_results")} />}
        {results?.map((r, i) => (
          <article key={r.supplierId} className={`rounded-3xl border p-5 ${i === 0 ? "border-primary" : "border-border"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`grid h-10 w-10 place-items-center rounded-full font-bold ${i === 0 ? "bg-accent text-accent-foreground" : "bg-secondary text-primary"}`}>
                  {i === 0 ? <Trophy className="h-5 w-5" /> : i + 1}
                </div>
                <div>
                  <h3 className="font-bold text-primary">{r.name}</h3>
                  <div className="text-xs text-muted-foreground">{t(`supplier_kind.${r.kind}`)} · {r.country} · {r.phone ?? "—"}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-2xl font-bold text-primary">{r.score}</div>
                <div className="text-[10px] uppercase text-muted-foreground">{t("match.score")}</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {r.reasons.map((x) => <span key={x.key} className="rounded-full bg-lime-soft px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">{t(x.key, x.vars)}</span>)}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
