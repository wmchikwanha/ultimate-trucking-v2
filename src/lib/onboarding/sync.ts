import { supabase } from "@/integrations/supabase/client";
import type { Draft, DocEntry, SupplierKind } from "./model";
import { newDraft } from "./model";

export type Basics = { legalName: string; fullName: string; kind: SupplierKind | ""; countryCode: string };
export type StepOp = { type: "step"; step: number; supplierId: string; data: unknown; basics: Basics };
export type UploadOp = { type: "upload"; supplierId: string; doc: DocEntry; basics: Basics };
export type SubmitOp = { type: "submit"; supplierId: string; basics: Basics };
export type Op = StepOp | UploadOp | SubmitOp;

export class ConflictError extends Error {}
export class NetworkError extends Error {}

export const basicsOf = (d: Draft): Basics => ({
  legalName: d.business.legalName,
  fullName: d.identity.fullName,
  kind: d.trade.kind,
  countryCode: d.business.countryCode,
});

function check(error: { message: string; code?: string | undefined } | null) {
  if (!error) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new NetworkError(error.message);
  if (/fetch|network|timeout/i.test(error.message)) throw new NetworkError(error.message);
  throw new Error(error.message);
}

async function uid() {
  const { data, error } = await supabase.auth.getUser();
  if (error) check(error);
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

/** Creates the supplier row (and owner membership) the first time any op syncs. */
async function ensureSupplier(id: string, b: Basics, knownUpdatedAt: string | null) {
  const { data, error } = await supabase.from("suppliers").select("id,updated_at").eq("id", id).maybeSingle();
  check(error);
  if (data) {
    // Server wins: someone else changed this supplier since our last sync.
    if (knownUpdatedAt && new Date(data.updated_at).getTime() > new Date(knownUpdatedAt).getTime() + 1) throw new ConflictError();
    return;
  }
  if (knownUpdatedAt) throw new ConflictError(); // row vanished on the server
  const me = await uid();
  const ins = await supabase.from("suppliers").insert({
    id,
    legal_name: b.legalName.trim() || b.fullName.trim() || "Draft supplier",
    kind: (b.kind || "mobile_mechanic") as SupplierKind,
    country_code: b.countryCode || "BW",
    status: "draft",
    created_by: me,
    primary_contact_user_id: me,
  });
  check(ins.error);
  const mem = await supabase.from("supplier_members").insert({ supplier_id: id, user_id: me, member_role: "owner", created_by: me });
  check(mem.error);
}

type SupplierUpdate = Partial<Database_Supplier>;
type Database_Supplier = import("@/integrations/supabase/types").Database["public"]["Tables"]["suppliers"]["Update"];

async function touch(id: string, fields: SupplierUpdate, step: number | null) {
  const { data, error } = await supabase
    .from("suppliers")
    .update(step === null ? { ...fields } : { ...fields, onboarding_step: step })
    .eq("id", id)
    .select("updated_at")
    .maybeSingle();
  check(error);
  if (!data) throw new ConflictError(); // no longer editable (e.g. already approved)
  return data.updated_at;
}

/** Applies one queued operation. Returns the supplier's new updated_at. */
export async function applyOp(op: Op, knownUpdatedAt: string | null): Promise<string> {
  await ensureSupplier(op.supplierId, op.basics, knownUpdatedAt);
  const id = op.supplierId;
  const me = await uid();

  if (op.type === "submit") return touch(id, { status: "pending_review" }, 10);

  if (op.type === "upload") throw new Error("upload ops need a file");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = op.data as any;
  switch (op.step) {
    case 1:
      return touch(id, { contact_full_name: d.fullName.trim(), contact_id_number: d.idNumber.trim(), phone: d.phone.trim(), preferred_locale: d.locale }, 1);
    case 2:
      return touch(id, { legal_name: d.legalName.trim(), trading_name: d.tradingName.trim() || null, registration_number: d.registrationNumber.trim() || null, country_code: d.countryCode }, 2);
    case 3:
      return touch(id, { kind: d.kind }, 3);
    case 4: {
      const del = await supabase.from("supplier_capabilities").delete().eq("supplier_id", id).eq("source", "self_declared");
      check(del.error);
      let models: { id: string; make_id: string }[] = [];
      if (d.modelIds.length) {
        const r = await supabase.from("models").select("id,make_id").in("id", d.modelIds);
        check(r.error);
        models = r.data ?? [];
      }
      const makesWithModels = new Set(models.map((m) => m.make_id));
      const targets: { make_id: string | null; model_id: string | null }[] = [
        ...models.map((m) => ({ make_id: m.make_id, model_id: m.id })),
        ...(d.makeIds as string[]).filter((m) => !makesWithModels.has(m)).map((m) => ({ make_id: m, model_id: null })),
      ];
      if (!targets.length) targets.push({ make_id: null, model_id: null });
      const rows = (d.assetClassIds as string[]).flatMap((a) =>
        (d.systemIds as string[]).flatMap((s) =>
          targets.map((t) => ({ supplier_id: id, asset_class_id: a, system_id: s, ...t, source: "self_declared" as const, confidence: 1.0, created_by: me })),
        ),
      );
      if (rows.length) {
        const ins = await supabase.from("supplier_capabilities").insert(rows);
        check(ins.error);
      }
      return touch(id, {}, 4);
    }
    case 5:
      return touch(id, { handled_fault_type_ids: d.faultTypeIds }, 5);
    case 6: {
      const del = await supabase.from("supplier_equipment").delete().eq("supplier_id", id);
      check(del.error);
      const rows = Object.entries(d as Record<string, number>)
        .filter(([, q]) => q > 0)
        .map(([equipment_type, quantity]) => ({ supplier_id: id, equipment_type, quantity, created_by: me }));
      if (rows.length) check((await supabase.from("supplier_equipment").insert(rows)).error);
      return touch(id, {}, 6);
    }
    case 7: {
      const del = await supabase.from("supplier_coverage").delete().eq("supplier_id", id);
      check(del.error);
      const rows = (d.countries as string[]).map((c) => ({ supplier_id: id, country_code: c, radius_km: d.radiusKm, created_by: me }));
      if (rows.length) check((await supabase.from("supplier_coverage").insert(rows)).error);
      return touch(id, { coverage_regions: d.regions }, 7);
    }
    case 8:
      return touch(id, { settlement_currency_code: d.currency, payment_preference: d.paymentPreference, operates_24_7: d.emergency }, 8);
    case 9:
      return touch(id, { supplier_references: d }, 9);
  }
  return touch(id, {}, op.step);
}

export async function applyUpload(op: UploadOp, file: Blob, knownUpdatedAt: string | null): Promise<string> {
  await ensureSupplier(op.supplierId, op.basics, knownUpdatedAt);
  const me = await uid();
  const safe = op.doc.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `${op.supplierId}/${op.doc.id}-${safe}`;
  const up = await supabase.storage.from("supplier-documents").upload(path, file, { upsert: true, contentType: file.type });
  check(up.error);
  const ins = await supabase.from("supplier_documents").insert({
    id: op.doc.id,
    supplier_id: op.supplierId,
    doc_type: op.doc.docType,
    storage_path: path,
    expires_at: op.doc.expiresAt,
    created_by: me,
  });
  if (ins.error && ins.error.code !== "23505") check(ins.error);
  return touch(op.supplierId, {}, null);
}

/** Rebuilds a draft from what the server holds. Returns null when the user has no supplier yet. */
export async function loadFromServer(userId: string): Promise<Draft | null> {
  const { data: s, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("created_by", userId)
    .in("status", ["draft", "pending_review"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  check(error);
  if (!s) return null;
  const [caps, eq, cov, docs] = await Promise.all([
    supabase.from("supplier_capabilities").select("asset_class_id,system_id,make_id,model_id").eq("supplier_id", s.id).eq("source", "self_declared"),
    supabase.from("supplier_equipment").select("equipment_type,quantity").eq("supplier_id", s.id),
    supabase.from("supplier_coverage").select("country_code,radius_km").eq("supplier_id", s.id),
    supabase.from("supplier_documents").select("id,doc_type,storage_path,expires_at").eq("supplier_id", s.id),
  ]);
  const uniq = (xs: (string | null)[]) => Array.from(new Set(xs.filter((x): x is string => !!x)));
  const c = caps.data ?? [];
  const base = newDraft();
  const refs = Array.isArray(s.supplier_references) ? (s.supplier_references as Draft["references"]) : [];
  const step = Math.min(10, (s.onboarding_step ?? 0) + 1);
  return {
    ...base,
    supplierId: s.id,
    serverUpdatedAt: s.updated_at,
    status: s.status,
    step,
    completed: Array.from({ length: s.status === "draft" ? Math.min(9, s.onboarding_step ?? 0) : s.onboarding_step ?? 0 }, (_, i) => i + 1),
    identity: { fullName: s.contact_full_name ?? "", idNumber: s.contact_id_number ?? "", phone: s.phone ?? "+267", locale: s.preferred_locale ?? "en" },
    business: { legalName: s.legal_name === "Draft supplier" ? "" : s.legal_name, tradingName: s.trading_name ?? "", registrationNumber: s.registration_number ?? "", countryCode: s.country_code },
    trade: { kind: (s.onboarding_step ?? 0) >= 3 ? s.kind : "" },
    capability: {
      assetClassIds: uniq(c.map((x) => x.asset_class_id)),
      systemIds: uniq(c.map((x) => x.system_id)),
      makeIds: uniq(c.map((x) => x.make_id)),
      modelIds: uniq(c.map((x) => x.model_id)),
    },
    syncedCapability: c.length ? { assetClassIds: uniq(c.map((x) => x.asset_class_id)), systemIds: uniq(c.map((x) => x.system_id)) } : null,
    faults: { faultTypeIds: s.handled_fault_type_ids ?? [] },
    equipment: Object.fromEntries((eq.data ?? []).map((e) => [e.equipment_type, e.quantity])),
    coverage: {
      radiusKm: cov.data?.[0]?.radius_km ?? base.coverage.radiusKm,
      countries: cov.data?.length ? uniq(cov.data.map((x) => x.country_code)) : base.coverage.countries,
      regions: s.coverage_regions ?? [],
    },
    commercial: { currency: s.settlement_currency_code ?? "BWP", paymentPreference: s.payment_preference ?? "", emergency: s.operates_24_7 },
    references: refs.length === 2 ? refs : base.references,
    documents: (docs.data ?? []).map((x) => ({
      id: x.id,
      docType: x.doc_type as DocEntry["docType"],
      fileName: x.storage_path.split("/").pop()?.replace(/^[0-9a-f-]{36}-/, "") ?? "",
      expiresAt: x.expires_at,
      state: "uploaded" as const,
    })),
  };
}
