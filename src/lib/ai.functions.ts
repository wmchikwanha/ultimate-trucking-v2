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
    const schema = { type: "object", additionalProperties: false, required: def.fields.map((f) => f.key), properties: props };

    const { structuredResponse, AI_MODEL } = await import("./ai/gateway.server");
    let out: Record<string, { value: string | string[] | null; confidence: number }>;
    try {
      out = await structuredResponse({
        schemaName: def.schema,
        schema,
        instructions:
          `You read a ${def.schema.replace(/_/g, " ")} from Southern Africa. Fill every field only from what is printed. ` +
          `Dates as YYYY-MM-DD. If a field is not visible, value null (or empty list) and confidence 0. ` +
          `confidence is 0..1: how sure you are the value is exactly right. Never guess.`,
        content: [{ type: "input_text", text: "Extract the fields." }, part],
      });
    } catch (e) {
      await db.from("supplier_documents").update({ extraction_status: "failed", extraction_model: AI_MODEL } as never).eq("id", doc.id);
      return { status: "failed", message: e instanceof Error ? e.message : "AI failed" };
    }

    const fields: ExtractedFields = {};
    const conf: Record<string, number> = {};
    for (const f of def.fields) {
      const v = out[f.key]?.value ?? (f.list ? [] : null);
      fields[f.key] = f.list ? (Array.isArray(v) ? v.map(String).slice(0, 20) : []) : typeof v === "string" ? v.slice(0, 200) : null;
      conf[f.key] = Math.max(0, Math.min(1, Number(out[f.key]?.confidence) || 0));
    }
    const min = Math.min(...Object.values(conf));
    const status = min < CONFIDENCE_THRESHOLD ? "needs_review" : "extracted";
    const patch: Record<string, unknown> = {
      extracted_fields: fields, ai_extracted_fields: fields, field_confidence: conf,
      extraction_model: AI_MODEL, extraction_confidence: Number(min.toFixed(3)), extraction_status: status,
    };
    if (typeof fields["expiry_date"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fields["expiry_date"]) && fields["expiry_date"] >= new Date().toISOString().slice(0, 10)) {
      patch["expires_on"] = fields["expiry_date"];
    }
    await db.from("supplier_documents").update(patch as never).eq("id", doc.id);
    await audit([{ actor_id: null, actor_role: null, entity_type: "supplier_documents", entity_id: doc.id, action: "ai_extracted",
      previous_value: null, new_value: { source: "ai", model: AI_MODEL, fields, confidence: conf } }]);
    return { status };
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
      ctx.supabase.from("supplier_documents").select("id, doc_type, expires_on, extracted_fields, field_confidence, extraction_status, extraction_confidence").eq("supplier_id", data.supplierId).order("created_at"),
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
