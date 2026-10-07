import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EXTRACTION_SCHEMAS, CONFIDENCE_THRESHOLD, MAX_TAGS, type ExtractedFields } from "./ai/schemas";

type Ctx = { supabase: any; userId: string };
const EDIT_ROLES = ["admin", "approver", "ops"];

async function actorInfo(ctx: Ctx, supplierId: string) {
  const { data: roles } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId);
  const list: string[] = (roles ?? []).map((r: { role: string }) => r.role);
  const { data: mem } = await ctx.supabase.from("supplier_members").select("user_id").eq("supplier_id", supplierId).eq("user_id", ctx.userId).maybeSingle();
  const staffEditor = list.some((r) => EDIT_ROLES.includes(r));
  if (!staffEditor && !mem) throw new Response("Forbidden", { status: 403 });
  const role = staffEditor ? list.find((r) => EDIT_ROLES.includes(r))! : list.includes("supplier") ? "supplier" : list[0] ?? null;
  return { role, staffEditor };
}

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

async function audit(rows: Array<{ actor_id: string | null; actor_role: string | null; entity_type: string; entity_id: string; action: string; previous_value: unknown; new_value: unknown }>) {
  if (!rows.length) return;
  const { error } = await (await admin()).from("audit_events").insert(rows as never);
  if (error) throw new Error(error.message);
}

function toBase64(buf: ArrayBuffer) {
  return Buffer.from(buf).toString("base64");
}

/* ---------------- Document extraction ---------------- */

export const extractDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ documentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { data: doc } = await ctx.supabase.from("supplier_documents").select("id, supplier_id, doc_type, storage_path, extraction_status").eq("id", data.documentId).maybeSingle();
    if (!doc) throw new Response("Not found", { status: 404 });
    await actorInfo(ctx, doc.supplier_id);
    const def = EXTRACTION_SCHEMAS[doc.doc_type];
    const db = await admin();
    if (!def) {
      await db.from("supplier_documents").update({ extraction_status: "unsupported" } as never).eq("id", doc.id);
      return { status: "unsupported" };
    }
    if (doc.extraction_status === "confirmed") return { status: "confirmed" };
    await db.from("supplier_documents").update({ extraction_status: "processing" } as never).eq("id", doc.id);

    const { data: file, error: dlErr } = await ctx.supabase.storage.from("supplier-documents").download(doc.storage_path);
    if (dlErr || !file) {
      await db.from("supplier_documents").update({ extraction_status: "failed" } as never).eq("id", doc.id);
      return { status: "failed", message: "Could not open the document" };
    }
    const mime = file.type || (doc.storage_path.endsWith(".pdf") ? "application/pdf" : "image/jpeg");
    const b64 = toBase64(await file.arrayBuffer());
    const part = mime === "application/pdf"
      ? { type: "input_file", filename: "document.pdf", file_data: `data:application/pdf;base64,${b64}` }
      : { type: "input_image", image_url: `data:${mime};base64,${b64}` };

    const props: Record<string, unknown> = {};
    for (const f of def.fields) {
      props[f.key] = {
        type: "object", additionalProperties: false, required: ["value", "confidence"],
        properties: {
          value: f.list ? { type: "array", items: { type: "string" } } : { type: ["string", "null"] },
          confidence: { type: "number" },
        },
      };
    }
    props["_check"] = {
      type: "object", additionalProperties: false,
      required: ["is_document", "matches_type", "legible_text", "credibility", "reason"],
      properties: {
        is_document: { type: "boolean" },
        matches_type: { type: "boolean" },
        legible_text: { type: "boolean" },
        credibility: { type: "number" },
        reason: { type: "string" },
      },
    };
    const schema = { type: "object", additionalProperties: false, required: [...def.fields.map((f) => f.key), "_check"], properties: props };

    const { structuredResponse, AI_MODEL } = await import("./ai/gateway.server");
    let out: Record<string, any>;
    try {
      out = await structuredResponse({
        schemaName: def.schema,
        schema,
        instructions:
          `You verify and read a ${def.schema.replace(/_/g, " ")} from Southern Africa submitted by a supplier. ` +
          `First fill _check: is_document = true only if the image/file is an official document or certificate with printed text ` +
          `(photos of animals, people, vehicles, scenery, blank pages or screenshots unrelated to a document are false). ` +
          `matches_type = true if it is plausibly a ${def.schema.replace(/_/g, " ")}. Be generous with naming: for trade certificates accept any trade or technical qualification ` +
          `(Certificate of Competence, Trade Test Certificate, National Craft Certificate, Journeyman/Artisan certificate, City & Guilds, BQA/BOTA, TEVET, NQF, diploma, apprenticeship). ` +
          `For IDs accept Omang, national ID cards, passports and driver licences; for registration accept CIPA/company or business registration certificates. ` +
          `legible_text = true if the main text can be read. ` +
          `credibility 0..1 = how authentic and consistent it looks (stamps, issuer, formatting, no signs of editing). reason = one short sentence. ` +
          `Then fill every field only from what is printed. Dates as YYYY-MM-DD. If a field is not visible, value null (or empty list) and confidence 0. ` +
          `confidence is 0..1: how sure you are the value is exactly right. Never guess.`,
        content: [{ type: "input_text", text: "Verify the document and extract the fields." }, part],
      });
    } catch (e) {
      await db.from("supplier_documents").update({ extraction_status: "failed", extraction_model: AI_MODEL } as never).eq("id", doc.id);
      return { status: "failed", message: e instanceof Error ? e.message : "AI failed" };
    }

    const check = out["_check"] ?? { is_document: false, matches_type: false, legible_text: false, credibility: 0, reason: "No result" };
    const fields: ExtractedFields = {};
    const conf: Record<string, number> = {};
    for (const f of def.fields) {
      const v = out[f.key]?.value ?? (f.list ? [] : null);
      fields[f.key] = f.list ? (Array.isArray(v) ? v.map(String).slice(0, 20) : []) : typeof v === "string" ? v.slice(0, 200) : null;
      conf[f.key] = Math.max(0, Math.min(1, Number(out[f.key]?.confidence) || 0));
    }
    const assessment = {
      is_document: !!check.is_document, matches_type: !!check.matches_type, legible_text: !!check.legible_text,
      credibility: Math.max(0, Math.min(1, Number(check.credibility) || 0)), reason: String(check.reason ?? "").slice(0, 300),
    };
    const readable = Object.values(conf).filter((c) => c >= 0.3).length;
    const invalid = !assessment.is_document || (!assessment.legible_text && readable === 0);
    const wrongType = !invalid && !assessment.matches_type;
    if (invalid || wrongType) {
      await db.from("supplier_documents").update({
        extraction_status: "rejected", status: "rejected", extraction_model: AI_MODEL, ai_extracted: assessment,
        ai_extracted_fields: fields, field_confidence: conf, extraction_confidence: 0,
      } as never).eq("id", doc.id);
      await audit([{ actor_id: null, actor_role: null, entity_type: "supplier_documents", entity_id: doc.id, action: "ai_rejected",
        previous_value: null, new_value: { source: "ai", model: AI_MODEL, assessment } }]);
      return { status: "rejected", reason: invalid ? "wizard.err.not_document" : "wizard.err.wrong_type", detail: assessment.reason };
    }

    const min = Math.min(...Object.values(conf));
    const status = min < CONFIDENCE_THRESHOLD ? "needs_review" : "extracted";
    const patch: Record<string, unknown> = {
      extracted_fields: fields, ai_extracted_fields: fields, field_confidence: conf, ai_extracted: assessment,
      extraction_model: AI_MODEL, extraction_confidence: Number(min.toFixed(3)), extraction_status: status,
    };
    if (typeof fields["expiry_date"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fields["expiry_date"]) && fields["expiry_date"] >= new Date().toISOString().slice(0, 10)) {
      patch["expires_at"] = fields["expiry_date"];
    }
    await db.from("supplier_documents").update(patch as never).eq("id", doc.id);
    await audit([{ actor_id: null, actor_role: null, entity_type: "supplier_documents", entity_id: doc.id, action: "ai_extracted",
      previous_value: null, new_value: { source: "ai", model: AI_MODEL, fields, confidence: conf, assessment } }]);
    return { status };
  });

/* ---------------- Supplier deletes own document (before approval) ---------------- */

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ documentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const db = await admin();
    const { data: doc } = await db.from("supplier_documents").select("id, supplier_id, storage_path").eq("id", data.documentId).maybeSingle();
    if (!doc) return { ok: true };
    const { role, staffEditor } = await actorInfo(ctx, (doc as any).supplier_id);
    const { data: sup } = await db.from("suppliers").select("status").eq("id", (doc as any).supplier_id).maybeSingle();
    if (!staffEditor && !["draft", "pending_review", "rejected"].includes((sup as any)?.status)) throw new Response("Locked", { status: 403 });
    await db.storage.from("supplier-documents").remove([(doc as any).storage_path]);
    const { error } = await db.from("supplier_documents").delete().eq("id", data.documentId);
    if (error) throw new Error(error.message);
    if (!staffEditor && (sup as any)?.status === "pending_review") {
      await db.from("suppliers").update({ status: "draft" } as never).eq("id", (doc as any).supplier_id);
    }
    await audit([{ actor_id: ctx.userId, actor_role: role, entity_type: "supplier_documents", entity_id: data.documentId, action: "document_deleted", previous_value: { storage_path: (doc as any).storage_path }, new_value: null }]);
    return { ok: true };
  });

/* ---------------- Approver dossier + AI submission assessment ---------------- */

async function requireStaff(ctx: Ctx) {
  const { data: roles } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId);
  const list: string[] = (roles ?? []).map((r: { role: string }) => r.role);
  if (!list.some((r) => ["admin", "approver", "ops", "auditor"].includes(r))) throw new Response("Forbidden", { status: 403 });
  return list.find((r) => ["admin", "approver", "ops", "auditor"].includes(r))!;
}

async function loadDossier(db: any, supplierId: string) {
  const [{ data: s }, { data: docs }, { data: caps }, { data: cov }, { data: eq }] = await Promise.all([
    db.from("suppliers").select("*").eq("id", supplierId).maybeSingle(),
    db.from("supplier_documents").select("id, doc_type, storage_path, expires_at, status, extraction_status, extracted_fields, field_confidence, extraction_confidence, ai_extracted, created_at").eq("supplier_id", supplierId).order("created_at"),
    db.from("supplier_capabilities").select("id, active, source, confidence, system_id, fault_type_id, asset_classes(name), systems(name), makes(name), fault_types(name)").eq("supplier_id", supplierId),
    db.from("supplier_coverage").select("country_code, radius_km").eq("supplier_id", supplierId),
    db.from("supplier_equipment").select("equipment_type, quantity").eq("supplier_id", supplierId),
  ]);
  return { s, docs: docs ?? [], caps: caps ?? [], cov: cov ?? [], eq: eq ?? [] };
}

function norm(x: unknown) { return String(x ?? "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

function checklist(d: Awaited<ReturnType<typeof loadDossier>>) {
  const s = d.s ?? {};
  const today = new Date().toISOString().slice(0, 10);
  const refs: any[] = Array.isArray(s.supplier_references) ? s.supplier_references : [];
  const reg = d.docs.find((x: any) => x.doc_type === "company_registration");
  const id = d.docs.find((x: any) => x.doc_type === "national_id");
  const regNo = reg?.extracted_fields?.registration_number;
  const idNo = id?.extracted_fields?.id_number;
  const items = [
    { key: "Documents supplied", ok: d.docs.length > 0 },
    { key: "All documents passed AI check", ok: d.docs.length > 0 && d.docs.every((x: any) => ["extracted", "needs_review", "confirmed"].includes(x.extraction_status) && x.status !== "rejected") },
    { key: "Document details confirmed", ok: d.docs.length > 0 && d.docs.every((x: any) => ["confirmed", "unsupported"].includes(x.extraction_status)) },
    { key: "No expired documents", ok: d.docs.every((x: any) => !x.expires_at || x.expires_at >= today) },
    { key: "Registration number matches certificate", ok: !s.registration_number ? !reg : !!regNo && norm(regNo) === norm(s.registration_number) },
    { key: "ID number matches ID document", ok: !!idNo && norm(idNo) === norm(s.contact_id_number) },
    { key: "Two referees with valid phone numbers", ok: refs.filter((r) => r?.name?.trim() && /^\+[1-9]\d{7,14}$/.test(r?.phone ?? "")).length >= 2 },
    { key: "Capabilities declared", ok: d.caps.some((c: any) => c.active) },
    { key: "Coverage area set", ok: d.cov.length > 0 },
  ];
  const score = Math.round((items.filter((i) => i.ok).length / items.length) * 100);
  return { items, score };
}

export const getSupplierDossier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ supplierId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await requireStaff(ctx);
    const db = await admin();
    const d = await loadDossier(db, data.supplierId);
    if (!d.s) throw new Response("Not found", { status: 404 });
    const docs = await Promise.all(d.docs.map(async (x: any) => {
      const { data: u } = await db.storage.from("supplier-documents").createSignedUrl(x.storage_path, 60 * 30);
      return { ...x, url: u?.signedUrl ?? null, file_name: x.storage_path.split("/").pop()?.replace(/^[0-9a-f-]{36}-/, "") ?? "" };
    }));
    const { data: last } = await db.from("audit_events").select("new_value, created_at").eq("entity_type", "suppliers").eq("entity_id", data.supplierId).eq("action", "ai_assessed").order("created_at", { ascending: false }).limit(1).maybeSingle();
    const ids = [...d.docs.map((x: any) => x.id), ...d.caps.map((c: any) => c.id)];
    const { data: ov } = ids.length
      ? await db.from("audit_events").select("entity_type, entity_id, previous_value, new_value, created_at").eq("action", "ai_override").in("entity_id", ids).order("created_at")
      : { data: [] as any[] };
    const overrides = (ov ?? []).map((o: any) => {
      if (o.entity_type === "supplier_documents") {
        const doc = d.docs.find((x: any) => x.id === o.entity_id);
        return `${doc?.doc_type ?? "document"} · ${o.new_value?.field}: AI read "${o.previous_value?.ai_value ?? "—"}", person set "${o.new_value?.value ?? "—"}"`;
      }
      return `Capability tag ${o.new_value?.decision ?? "changed"} by a person`;
    });
    return {
      overrides,
      supplier: d.s, docs, caps: d.caps, coverage: d.cov, equipment: d.eq,
      references: Array.isArray(d.s.supplier_references) ? d.s.supplier_references : [],
      checklist: checklist(d),
      assessment: (last as any)?.new_value ?? null,
    };
  });

export const assessSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ supplierId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await requireStaff(ctx);
    const db = await admin();
    const d = await loadDossier(db, data.supplierId);
    if (!d.s) throw new Response("Not found", { status: 404 });
    const cl = checklist(d);
    const s = d.s;
    const facts = {
      applicant: { legal_name: s.legal_name, trading_name: s.trading_name, kind: s.kind, country: s.country_code, registration_number: s.registration_number, contact: s.contact_full_name, contact_id_number: s.contact_id_number, phone: s.phone },
      references: s.supplier_references,
      documents: d.docs.map((x: any) => ({ type: x.doc_type, status: x.extraction_status, expires_at: x.expires_at, fields: x.extracted_fields, ai_check: x.ai_extracted })),
      capabilities: d.caps.filter((c: any) => c.active).map((c: any) => `${c.asset_classes?.name} / ${c.systems?.name}${c.makes?.name ? " / " + c.makes.name : ""}`).slice(0, 40),
      coverage: d.cov, equipment: d.eq, rule_checks: cl.items,
    };
    const { structuredResponse, AI_MODEL } = await import("./ai/gateway.server");
    let out: { credibility: number; recommendation: "approve" | "review" | "reject"; summary: string; red_flags: string[] };
    try {
      out = await structuredResponse({
        schemaName: "submission_assessment",
        schema: {
          type: "object", additionalProperties: false, required: ["credibility", "recommendation", "summary", "red_flags"],
          properties: {
            credibility: { type: "number" },
            recommendation: { type: "string", enum: ["approve", "review", "reject"] },
            summary: { type: "string" },
            red_flags: { type: "array", items: { type: "string" } },
          },
        },
        instructions:
          "You assist a human approver at a Botswana truck-repair network vetting a supplier application. Using only the facts given, " +
          "rate credibility 0-100 (consistency between declared details and documents, document authenticity checks, completeness, referees). " +
          "recommendation is advice only; the human decides. summary: 2-3 plain sentences. red_flags: up to 6 short concrete items to check, empty if none.",
        content: [{ type: "input_text", text: JSON.stringify(facts) }],
      });
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "AI failed" };
    }
    const assessment = {
      credibility: Math.max(0, Math.min(100, Math.round(Number(out.credibility) || 0))),
      recommendation: out.recommendation, summary: String(out.summary).slice(0, 800),
      red_flags: (out.red_flags ?? []).slice(0, 6).map((x) => String(x).slice(0, 200)),
      conformity: cl.score, model: AI_MODEL, source: "ai",
    };
    await audit([{ actor_id: null, actor_role: null, entity_type: "suppliers", entity_id: data.supplierId, action: "ai_assessed", previous_value: null, new_value: assessment }]);
    return { ok: true, assessment };
  });

/* ---------------- Override endpoint: human correction of AI values ---------------- */

export const overrideExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      documentId: z.string().uuid(),
      fields: z.record(z.string(), z.union([z.string().max(200), z.array(z.string().max(100)).max(20), z.null()])),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { data: doc } = await ctx.supabase.from("supplier_documents").select("id, supplier_id, doc_type, extracted_fields, ai_extracted_fields, extraction_model").eq("id", data.documentId).maybeSingle();
    if (!doc) throw new Response("Not found", { status: 404 });
    const { role } = await actorInfo(ctx, doc.supplier_id);
    const def = EXTRACTION_SCHEMAS[doc.doc_type];
    if (!def) throw new Response("Unsupported", { status: 400 });
    const current: ExtractedFields = doc.extracted_fields ?? {};
    const ai: ExtractedFields = doc.ai_extracted_fields ?? {};
    const next: ExtractedFields = { ...current };
    const events = [];
    for (const f of def.fields) {
      if (!(f.key in data.fields)) continue;
      const v = data.fields[f.key];
      const norm = f.list ? (Array.isArray(v) ? v : []) : typeof v === "string" ? (v.trim() || null) : null;
      if (JSON.stringify(norm) !== JSON.stringify(current[f.key] ?? (f.list ? [] : null))) {
        events.push({ actor_id: ctx.userId, actor_role: role, entity_type: "supplier_documents", entity_id: doc.id, action: "ai_override",
          previous_value: { field: f.key, value: current[f.key] ?? null, ai_value: ai[f.key] ?? null, ai_model: doc.extraction_model },
          new_value: { field: f.key, value: norm, source: "human" } });
        next[f.key] = norm;
      }
    }
    events.push({ actor_id: ctx.userId, actor_role: role, entity_type: "supplier_documents", entity_id: doc.id, action: "extraction_confirmed",
      previous_value: null, new_value: { fields: next } });
    const db = await admin();
    const { error } = await db.from("supplier_documents").update({
      extracted_fields: next, extraction_status: "confirmed", extraction_confirmed_by: ctx.userId, extraction_confirmed_at: new Date().toISOString(),
    } as never).eq("id", doc.id);
    if (error) throw new Error(error.message);
    await audit(events);
    return { ok: true, changed: events.length - 1 };
  });

/* ---------------- Capability tagging from free text ---------------- */

export const tagCapabilities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ supplierId: z.string().uuid(), text: z.string().trim().min(3).max(1500) }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await actorInfo(ctx, data.supplierId);
    const db = await admin();
    const [{ data: systems }, { data: faults }, { data: own }] = await Promise.all([
      db.from("systems").select("id, code, name"),
      db.from("fault_types").select("id, code, name, system_id"),
      db.from("supplier_capabilities").select("asset_class_id").eq("supplier_id", data.supplierId).eq("source", "self_declared"),
    ]);
    const assetClasses = [...new Set((own ?? []).map((r: { asset_class_id: string }) => r.asset_class_id))];
    if (!assetClasses.length) return { ok: false, message: "pick_asset_class_first", tags: [] };

    const catalogue =
      "SYSTEMS:\n" + (systems ?? []).map((s: { code: string; name: string }) => `${s.code} = ${s.name}`).join("\n") +
      "\nFAULT_TYPES:\n" + (faults ?? []).map((f: { code: string; name: string }) => `${f.code} = ${f.name}`).join("\n");

    const { structuredResponse, AI_MODEL } = await import("./ai/gateway.server");
    let out: { tags: Array<{ kind: "system" | "fault_type"; code: string; confidence: number }> };
    try {
      out = await structuredResponse({
        schemaName: "capability_tags",
        schema: {
          type: "object", additionalProperties: false, required: ["tags"],
          properties: { tags: { type: "array", items: {
            type: "object", additionalProperties: false, required: ["kind", "code", "confidence"],
            properties: { kind: { type: "string", enum: ["system", "fault_type"] }, code: { type: "string" }, confidence: { type: "number" } },
          } } },
        },
        instructions:
          `Map a truck repair supplier's description to codes from the catalogue only. Return at most ${MAX_TAGS} tags. ` +
          `Return the code (left of "=") exactly, not the name. Do not invent codes. confidence 0..1.\n\n${catalogue}`,
        content: [{ type: "input_text", text: data.text }],
      });
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "AI failed", tags: [] };
    }

    const sysByCode = new Map<string, any>();
    for (const s of systems ?? []) { sysByCode.set(String(s.code).toLowerCase(), s); sysByCode.set(String(s.name).toLowerCase(), s); }
    const faultByCode = new Map<string, any>();
    for (const f of faults ?? []) { faultByCode.set(String(f.code).toLowerCase(), f); faultByCode.set(String(f.name).toLowerCase(), f); }
    const seen = new Set<string>();
    const tags: Array<{ kind: string; code: string; name: string; confidence: number; system_id: string; fault_type_id: string | null }> = [];
    for (const t of (out.tags ?? []).sort((a, b) => b.confidence - a.confidence)) {
      
      const c = Math.max(0, Math.min(1, Number(t.confidence) || 0));
      if (t.kind === "system") {
        const s: any = sysByCode.get(String(t.code).trim().toLowerCase());
        if (!s) continue; // unresolved: discarded
        if (seen.has(s.id)) continue; seen.add(s.id);
        tags.push({ kind: "system", code: s.code, name: s.name, confidence: c, system_id: s.id, fault_type_id: null });
      } else {
        const f: any = faultByCode.get(String(t.code).trim().toLowerCase());
        if (!f || !f.system_id) continue;
        if (seen.has(f.id)) continue; seen.add(f.id);
        tags.push({ kind: "fault_type", code: f.code, name: f.name, confidence: c, system_id: f.system_id, fault_type_id: f.id });
      }
      if (tags.length >= MAX_TAGS) break;
    }

    await db.from("suppliers").update({ capability_description: data.text } as never).eq("id", data.supplierId);
    await db.from("supplier_capabilities").delete().eq("supplier_id", data.supplierId).eq("source", "ai_extracted").eq("active", false);
    const rows = assetClasses.flatMap((ac) => tags.map((t) => ({
      supplier_id: data.supplierId, asset_class_id: ac, system_id: t.system_id, fault_type_id: t.fault_type_id,
      source: "ai_extracted", confidence: Number(t.confidence.toFixed(3)), active: false,
    })));
    if (rows.length) {
      const { error } = await db.from("supplier_capabilities").insert(rows as never);
      if (error) return { ok: false, message: error.message, tags: [] };
    }
    await audit([{ actor_id: null, actor_role: null, entity_type: "suppliers", entity_id: data.supplierId, action: "ai_tagged",
      previous_value: { text: data.text }, new_value: { source: "ai", model: AI_MODEL, tags: tags.map(({ kind, code, confidence }) => ({ kind, code, confidence })) } }]);
    return { ok: true, tags };
  });

/* ---------------- Override endpoint: accept / reject AI capability tags ---------------- */

export const decideCapabilityTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    supplierId: z.string().uuid(), systemId: z.string().uuid(), faultTypeId: z.string().uuid().nullable(), accept: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { role } = await actorInfo(ctx, data.supplierId);
    const db = await admin();
    let q = db.from("supplier_capabilities").select("*").eq("supplier_id", data.supplierId).eq("source", "ai_extracted").eq("system_id", data.systemId);
    q = data.faultTypeId ? q.eq("fault_type_id", data.faultTypeId) : q.is("fault_type_id", null);
    const { data: rows } = await q;
    if (!rows?.length) throw new Response("Not found", { status: 404 });
    if (data.accept) {
      await db.from("supplier_capabilities").update({ active: true } as never).in("id", rows.map((r: any) => r.id));
    } else {
      await db.from("supplier_capabilities").delete().in("id", rows.map((r: any) => r.id));
    }
    await audit(rows.map((r: any) => ({
      actor_id: ctx.userId, actor_role: role, entity_type: "supplier_capabilities", entity_id: r.id, action: "ai_override",
      previous_value: { source: "ai", active: r.active, confidence: r.confidence },
      new_value: { source: "human", decision: data.accept ? "accepted" : "rejected", active: data.accept },
    })));
    return { ok: true };
  });

export const listAiReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ supplierId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const [{ data: docs }, { data: caps }, { data: sup }] = await Promise.all([
      ctx.supabase.from("supplier_documents").select("id, doc_type, expires_at, extracted_fields, field_confidence, extraction_status, extraction_confidence").eq("supplier_id", data.supplierId).order("created_at"),
      ctx.supabase.from("supplier_capabilities").select("system_id, fault_type_id, confidence, active, systems(name), fault_types(name)").eq("supplier_id", data.supplierId).eq("source", "ai_extracted"),
      ctx.supabase.from("suppliers").select("capability_description").eq("id", data.supplierId).maybeSingle(),
    ]);
    const tagMap = new Map<string, any>();
    for (const c of caps ?? []) {
      const k = `${c.system_id}:${c.fault_type_id ?? ""}`;
      if (!tagMap.has(k)) tagMap.set(k, { systemId: c.system_id, faultTypeId: c.fault_type_id, name: c.fault_types?.name ?? c.systems?.name, confidence: Number(c.confidence), active: c.active });
    }
    return { docs: docs ?? [], tags: [...tagMap.values()], description: sup?.capability_description ?? "" };
  });
