import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Clock, Crosshair, Loader2, LocateFixed, MapPin, Package, Phone, Search, Sparkles, Star, Timer, Trophy, UserX, Wrench } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useTaxonomy } from "@/lib/taxonomy";
import { findParts, findProviders, matchFaultText } from "@/lib/match.functions";
import { PhaseModule } from "@/components/PhaseModule";
import { PageHeader, RoleNotice } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/match")({
  head: () => ({
    meta: [
      { title: "Find help — UTS match engine" },
      { name: "description", content: "Find the nearest certified provider for your breakdown, ranked on evidence." },
      { property: "og:title", content: "Find help — UTS match engine" },
      { property: "og:description", content: "Certified truck repair providers ranked by skill, distance, reliability and response time." },
    ],
  }),
  component: () => <PhaseModule id="match" visual={{ kind: "pipeline", stages: 4 }} live={Match} />,
});

const TOWNS: { name: string; lat: number; lng: number }[] = [
  { name: "Gaborone", lat: -24.6282, lng: 25.9231 },
  { name: "Tlokweng", lat: -24.665, lng: 25.975 },
  { name: "Lobatse", lat: -25.225, lng: 25.68 },
  { name: "Mahalapye", lat: -23.105, lng: 26.815 },
  { name: "Palapye", lat: -22.547, lng: 27.125 },
  { name: "Francistown", lat: -21.17, lng: 27.51 },
  { name: "Maun", lat: -19.983, lng: 23.416 },
  { name: "Kasane", lat: -17.816, lng: 25.15 },
];

const SOURCE_LABEL: Record<string, string> = {
  human_confirmed: "match.src.human_confirmed",
  ai_extracted: "match.src.ai_extracted",
  self_declared: "match.src.self_declared",
};

type Row = { supplier_id: string; score: number; rationale: any };
type Skip = { id: string; name: string; why: "declined" | "timeout" };

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`h-3.5 w-3.5 ${i <= Math.round(value) ? "fill-accent text-accent" : "text-border"}`} />)}
    </span>
  );
}

function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  const d = 0.08;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`;
  return <iframe title="map" src={src} className="h-40 w-full rounded-2xl border border-border" loading="lazy" />;
}

function why(t: (k: string, v?: any) => string, r: any) {
  const best = r.capabilities?.[0];
  const src = best ? t(SOURCE_LABEL[best.source] ?? "match.src.self_declared") : "";
  return t("match.why_sentence", {
    skill: best ? (best.fault ?? best.system) : "—",
    source: src.toLowerCase(),
    km: r.distance_km,
    rating: r.rating_count ? r.rating : "—",
    jobs: r.rating_count,
  });
}

function RationaleCard({ r }: { r: any }) {
  const t = useT();
  return (
    <div className="mt-3 space-y-3 rounded-2xl bg-muted p-4 text-sm">
      <div>
        <div className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("match.r.skills")}</div>
        <ul className="space-y-1.5">
          {r.capabilities.map((c: any, i: number) => (
            <li key={i} className="flex flex-wrap items-center gap-1.5 text-xs">
              <Wrench className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold">{c.fault ?? c.system}</span>
              <span className="text-muted-foreground">· {c.asset_class}{c.make ? ` · ${c.make}` : ""}</span>
              <span className="rounded-md bg-background px-1.5 py-0.5 font-bold">{t("match.r.proficiency", { n: c.proficiency })}</span>
              <span className={`rounded-md px-1.5 py-0.5 font-bold ${c.source === "human_confirmed" ? "bg-lime-soft text-accent-foreground" : c.source === "ai_extracted" ? "bg-secondary text-primary" : "bg-background text-muted-foreground"}`}>{t(SOURCE_LABEL[c.source] ?? "match.src.self_declared")}</span>
            </li>
          ))}
        </ul>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div className="rounded-xl bg-background p-2"><dt className="text-muted-foreground">{t("match.r.rating")}</dt><dd className="font-bold">{r.rating_count ? `${r.rating} ★ · ${t("match.r.jobs_rated", { n: r.rating_count })}` : t("match.r.no_ratings")}</dd><dd className="text-[10px] text-muted-foreground">{t("match.r.fair_rating", { n: r.bayesian_rating })}</dd></div>
        <div className="rounded-xl bg-background p-2"><dt className="text-muted-foreground">{t("match.r.on_time")}</dt><dd className="font-bold">{r.jobs ? `${Math.round((r.on_time / r.jobs) * 100)}%` : "—"}</dd><dd className="text-[10px] text-muted-foreground">{t("match.r.of_jobs", { ok: r.on_time, n: r.jobs })}</dd></div>
        <div className="rounded-xl bg-background p-2"><dt className="text-muted-foreground">{t("match.r.distance")}</dt><dd className="font-bold">{r.distance_km} km</dd><dd className="text-[10px] text-muted-foreground">{t("match.r.within", { n: r.radius_km })}</dd></div>
        <div className="rounded-xl bg-background p-2"><dt className="text-muted-foreground">{t("match.r.response")}</dt><dd className="font-bold">~{r.response_minutes} min</dd></div>
      </dl>
      <div>
        <div className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("match.r.score_parts")}</div>
        <div className="grid grid-cols-2 gap-1 text-xs sm:grid-cols-4">
          <span>{t("match.r.p_skill")}: <b>{r.parts.capability_and_rating}</b>/45</span>
          <span>{t("match.r.p_distance")}: <b>{r.parts.proximity}</b>/30</span>
          <span>{t("match.r.p_on_time")}: <b>{r.parts.on_time}</b>/15</span>
          <span>{t("match.r.p_speed")}: <b>{r.parts.response}</b>/10</span>
        </div>
      </div>
      {r.phone && <a href={`tel:${r.phone}`} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground"><Phone className="h-4 w-4" />{t("match.call", { name: r.name })}</a>}
    </div>
  );
}

function Match() {
  const t = useT();
  const { data: tax } = useTaxonomy();
  const run = useServerFn(findProviders);
  const parts = useServerFn(findParts);
  const aiMatch = useServerFn(matchFaultText);

  const [mode, setMode] = useState<"fault" | "part">("fault");
  const [faultId, setFaultId] = useState("");
  const [text, setText] = useState("");
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [partQ, setPartQ] = useState("");
  const [loc, setLoc] = useState<{ lat: number; lng: number; label: string }>({ ...TOWNS[0]!, label: TOWNS[0]!.name });
  const [locBusy, setLocBusy] = useState(false);
  const [locErr, setLocErr] = useState<string | null>(null);
  const [radius, setRadius] = useState(250);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [partRows, setPartRows] = useState<any[] | null>(null);
  const [skipped, setSkipped] = useState<Skip[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [waiting, setWaiting] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const faultsBySystem = useMemo(() => (tax?.systems ?? []).map((s) => ({ s, f: (tax?.faultTypes ?? []).filter((f) => f.system_id === s.id) })).filter((g) => g.f.length), [tax]);
  const fault = tax?.faultTypes.find((f) => f.id === faultId);

  function locate() {
    if (!navigator.geolocation) { setLocErr(t("match.loc_unavailable")); return; }
    setLocBusy(true); setLocErr(null);
    navigator.geolocation.getCurrentPosition(
      (p) => { setLoc({ lat: p.coords.latitude, lng: p.coords.longitude, label: t("match.my_location") }); setLocBusy(false); },
      () => { setLocErr(t("match.loc_denied")); setLocBusy(false); },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  async function understand() {
    if (text.trim().length < 3) return;
    setAiBusy(true); setAiNote(null);
    const r = await aiMatch({ data: { text } }).catch(() => ({ ok: false as const }));
    setAiBusy(false);
    if (r.ok) { setFaultId(r.faultTypeId); setAiNote(t("match.ai_understood", { name: r.name })); }
    else setAiNote(t("match.ai_not_understood"));
  }

  async function find(e?: React.FormEvent) {
    e?.preventDefault();
    stopWait();
    setBusy(true); setSkipped([]); setOpenId(null);
    try {
      if (mode === "fault") {
        if (!fault) { setBusy(false); return; }
        setRows(await run({ data: { faultTypeId: fault.id, systemId: fault.system_id, lat: loc.lat, lng: loc.lng, radiusKm: radius } }));
        setPartRows(null);
      } else {
        setPartRows(await parts({ data: { q: partQ, lat: loc.lat, lng: loc.lng, radiusKm: Math.max(radius, 400) } }));
        setRows(null);
      }
    } finally { setBusy(false); }
  }

  function stopWait() { if (timer.current) clearInterval(timer.current); timer.current = null; setWaiting(null); }
  useEffect(() => () => stopWait(), []);

  const live = (rows ?? []).filter((r) => !skipped.some((s) => s.id === r.supplier_id));
  const top = live[0];
  const lastSkip = skipped[skipped.length - 1];

  function skip(why: Skip["why"]) {
    if (!top) return;
    stopWait();
    setSkipped((s) => [...s, { id: top.supplier_id, name: top.rationale.name, why }]);
    setOpenId(null);
  }
  function request() {
    stopWait();
    setWaiting(90);
    timer.current = setInterval(() => setWaiting((w) => {
      if (w === null) return null;
      if (w <= 1) { setTimeout(() => skip("timeout"), 0); return null; }
      return w - 1;
    }), 1000);
  }

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <PageHeader eyebrow={t("common.live")} title={t("module.match.title")} description={t("module.match.tagline")} />

      <form onSubmit={find} className="space-y-4 rounded-3xl border border-border p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1">
          {(["fault", "part"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={`flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-bold ${mode === m ? "bg-primary text-primary-foreground" : "text-primary"}`}>
              {m === "fault" ? <Wrench className="h-4 w-4" /> : <Package className="h-4 w-4" />}{t(`match.mode_${m}`)}
            </button>
          ))}
        </div>

        {mode === "fault" ? (
          <div className="space-y-2">
            <div className="text-sm font-bold text-primary">1 · {t("match.what_wrong")}</div>
            <div className="flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); understand(); } }}
                placeholder={t("match.describe_placeholder")} maxLength={500} className="h-12 min-w-0 flex-1 rounded-xl border border-input bg-background px-4 text-base" />
              <button type="button" onClick={understand} disabled={aiBusy || text.trim().length < 3} aria-label={t("match.understand")} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-secondary text-primary disabled:opacity-50">
                {aiBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              </button>
            </div>
            {aiNote && <p className="text-xs font-semibold text-primary">{aiNote}</p>}
            <select required value={faultId} onChange={(e) => setFaultId(e.target.value)} className="h-12 w-full rounded-xl border border-input bg-background px-3 text-base">
              <option value="">{t("match.or_pick")}</option>
              {faultsBySystem.map(({ s, f }) => (
                <optgroup key={s.id} label={s.name}>{f.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</optgroup>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm font-bold text-primary">1 · {t("match.which_part")}</div>
            <input required minLength={2} value={partQ} onChange={(e) => setPartQ(e.target.value)} placeholder={t("match.part_placeholder")} className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base" />
          </div>
        )}

        <div className="space-y-2">
          <div className="text-sm font-bold text-primary">2 · {t("match.where")}</div>
          <div className="flex gap-2">
            <button type="button" onClick={locate} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-bold text-primary">
              {locBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}{t("match.use_location")}
            </button>
            <select aria-label={t("match.pick_town")} value={TOWNS.find((x) => x.name === loc.label)?.name ?? ""} onChange={(e) => { const x = TOWNS.find((y) => y.name === e.target.value); if (x) setLoc({ ...x, label: x.name }); }} className="h-12 flex-1 rounded-xl border border-input bg-background px-3 text-sm">
              <option value="" disabled>{t("match.pick_town")}</option>
              {TOWNS.map((x) => <option key={x.name} value={x.name}>{x.name}</option>)}
            </select>
          </div>
          {locErr && <p className="text-xs text-destructive">{locErr}</p>}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5 text-primary" />{loc.label} · {loc.lat.toFixed(3)}, {loc.lng.toFixed(3)}</div>
          <MiniMap lat={loc.lat} lng={loc.lng} />
          <label className="block text-xs font-semibold text-muted-foreground">{t("match.radius", { n: radius })}
            <input type="range" min={25} max={600} step={25} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="mt-1 w-full accent-[var(--primary)]" />
          </label>
        </div>

        <button disabled={busy || (mode === "fault" ? !faultId : partQ.trim().length < 2)} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-lg font-bold text-accent-foreground disabled:opacity-50">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}3 · {t("match.find")}
        </button>
      </form>

      {/* Fault results */}
      {rows && (
        <div className="mt-6 space-y-3">
          {lastSkip && top && (
            <div className="rounded-2xl bg-primary p-4 text-primary-foreground">
              <div className="flex items-start gap-2 text-base font-bold"><UserX className="mt-0.5 h-5 w-5 shrink-0" />
                {t(lastSkip.why === "declined" ? "match.busy_sentence" : "match.timeout_sentence", { name: lastSkip.name, km: top.rationale.distance_km })}
              </div>
            </div>
          )}
          {live.length === 0 && <RoleNotice text={skipped.length ? t("match.no_more") : t("match.no_results")} />}
          {live.map((r, i) => {
            const x = r.rationale;
            const open = openId === r.supplier_id;
            return (
              <article key={r.supplier_id} className={`rounded-3xl border p-4 ${i === 0 ? "border-2 border-primary" : "border-border"}`}>
                <button type="button" onClick={() => setOpenId(open ? null : r.supplier_id)} className="w-full text-left">
                  <div className="flex items-start gap-3">
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold ${i === 0 ? "bg-accent text-accent-foreground" : "bg-secondary text-primary"}`}>{i === 0 ? <Trophy className="h-5 w-5" /> : i + 1}</div>
                    <div className="min-w-0 flex-1">
                      <h3 className="flex items-center gap-1 font-bold text-primary">{x.name}<BadgeCheck className="h-4 w-4 text-primary" aria-label={t("match.certified")} /></h3>
                      <div className="text-xs text-muted-foreground">{t(`supplier_kind.${x.kind}`)}{x.legal_name !== x.name ? ` · ${x.legal_name}` : ""}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="inline-flex items-center gap-1 font-bold"><MapPin className="h-3.5 w-3.5 text-primary" />{x.distance_km} km</span>
                        <span className="inline-flex items-center gap-1"><Stars value={Number(x.rating)} />{x.rating_count ? `${x.rating} (${x.rating_count})` : t("match.r.no_ratings")}</span>
                        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-primary" />~{x.response_minutes} min</span>
                      </div>
                    </div>
                    <div className="text-right"><div className="font-display text-2xl font-bold text-primary">{Math.round(r.score)}</div><div className="text-[10px] uppercase text-muted-foreground">{t("match.score")}</div></div>
                  </div>
                  <p className="mt-2 text-sm">{why(t, x)}</p>
                </button>
                {open && <RationaleCard r={x} />}
                {i === 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {waiting === null ? (
                      <button type="button" onClick={request} className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-bold text-primary-foreground"><Crosshair className="h-4 w-4 shrink-0" /><span className="truncate">{t("match.request", { name: x.name })}</span></button>
                    ) : (
                      <div className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-secondary text-sm font-bold text-primary"><Timer className="h-4 w-4" />{t("match.waiting", { s: waiting })}</div>
                    )}
                    <button type="button" onClick={() => skip("declined")} className="flex h-12 items-center justify-center gap-1.5 rounded-xl border border-border text-sm font-bold text-destructive"><UserX className="h-4 w-4" />{t("match.declined")}</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Part results */}
      {partRows && (
        <div className="mt-6 space-y-3">
          {partRows.length === 0 && <RoleNotice text={t("match.no_parts")} />}
          {partRows.map((p, i) => {
            const unverified = p.verification === "ai_suggested" || p.verification === "unverified";
            return (
              <article key={i} className="rounded-3xl border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-primary">{p.supplier_name}</h3>
                    <div className="text-xs text-muted-foreground">{p.manufacturer} {p.part_number} · {p.part_name}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold"><MapPin className="h-3.5 w-3.5 text-primary" />{p.distance_km} km</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
                  {p.equivalence ? (
                    <span className={`rounded-full px-2.5 py-1 ${unverified ? "bg-destructive/10 text-destructive" : "bg-lime-soft text-accent-foreground"}`}>
                      {unverified ? t("match.equiv_unverified", { part: p.via_part }) : t("match.equiv_verified", { part: p.via_part })}
                    </span>
                  ) : <span className="rounded-full bg-lime-soft px-2.5 py-1 text-accent-foreground">{t("match.exact_part")}</span>}
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-primary">{t("match.in_stock", { n: p.stock_qty })}</span>
                  {p.price_minor != null && <span className="rounded-full bg-secondary px-2.5 py-1 text-primary">{p.currency_code} {(p.price_minor / 100).toFixed(2)}</span>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
