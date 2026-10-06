import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function staffRole(ctx: Ctx, allowed: string[]) {
  const { data } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId);
  const roles: string[] = (data ?? []).map((r: { role: string }) => r.role);
  const role = roles.find((r) => allowed.includes(r));
  if (!role) throw new Response("Forbidden", { status: 403 });
  return role;
}

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

/** Queue rows with document counts, flags and (for approved) the approver's name. */
export const listQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ status: z.enum(["pending_review", "approved", "rejected", "draft"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await staffRole(ctx, ["admin", "approver", "ops", "auditor"]);
    const db = await admin();
    const { data: rows, error } = await db
      .from("suppliers")
      .select("id,legal_name,trading_name,kind,country_code,phone,created_at,submitted_at,approved_at,approved_by,status,supplier_capabilities(id,active,asset_classes(name),systems(name),makes(name)),supplier_documents(id,status,extraction_status,expires_at)")
      .eq("status", data.status)
      .order("submitted_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    const today = new Date().toISOString().slice(0, 10);
    const approverIds = [...new Set((rows ?? []).map((r: any) => r.approved_by).filter(Boolean))];
    const { data: profs } = approverIds.length
      ? await db.from("profiles").select("user_id, full_name, email").in("user_id", approverIds)
      : { data: [] as any[] };
    const nameOf = new Map((profs ?? []).map((p: any) => [p.user_id, p.full_name || p.email]));
    return (rows ?? []).map((r: any) => {
      const docs = r.supplier_documents ?? [];
      const caps = (r.supplier_capabilities ?? []).filter((c: any) => c.active);
      const flags =
        docs.filter((d: any) => d.status === "rejected" || d.extraction_status === "rejected").length +
        docs.filter((d: any) => d.expires_at && d.expires_at < today).length +
        docs.filter((d: any) => ["pending", "processing", "failed", "needs_review"].includes(d.extraction_status)).length +
        (caps.length === 0 ? 1 : 0) + (docs.length === 0 ? 1 : 0);
      return { ...r, caps, docCount: docs.length, flags, approverName: r.approved_by ? nameOf.get(r.approved_by) ?? "—" : null };
    });
  });

/** Approve / reject / request more evidence. The database enforces the hard rules; this records the reason and audit trail. */
export const decideSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      supplierId: z.string().uuid(),
      action: z.enum(["approve", "reject", "request_evidence"]),
      reason: z.string().trim().max(1000).optional().default(""),
      verified: z.array(z.string().max(200)).max(40).default([]),
      overridden: z.array(z.string().max(300)).max(60).default([]),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const role = await staffRole(ctx, data.action === "approve" ? ["admin", "approver"] : ["admin", "approver", "ops"]);
    if (data.action !== "approve" && data.reason.length < 3) return { ok: false, message: "A reason is required" };
    const status = data.action === "approve" ? "approved" : data.action === "reject" ? "rejected" : "draft";
    const { data: before } = await ctx.supabase.from("suppliers").select("status").eq("id", data.supplierId).maybeSingle();
    if (!before) return { ok: false, message: "Not found" };
    // Update as the signed-in human so database guards see who acted.
    const { error } = await ctx.supabase.from("suppliers").update({ status }).eq("id", data.supplierId);
    if (error) return { ok: false, message: error.message };
    const db = await admin();
    const { data: hist } = await db.from("supplier_status_history").select("id").eq("supplier_id", data.supplierId).eq("to_status", status).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (hist) await db.from("supplier_status_history").update({ reason: data.reason || null, changed_by: ctx.userId } as never).eq("id", (hist as any).id);
    const { data: prof } = await db.from("profiles").select("full_name, email").eq("user_id", ctx.userId).maybeSingle();
    await db.from("audit_events").insert({
      actor_id: ctx.userId, actor_role: role, entity_type: "suppliers", entity_id: data.supplierId,
      action: data.action === "approve" ? "supplier_approved" : data.action === "reject" ? "supplier_rejected" : "evidence_requested",
      previous_value: { status: (before as any).status },
      new_value: { status, reason: data.reason || null, verified: data.verified, overridden: data.overridden, decided_by: (prof as any)?.full_name || (prof as any)?.email || ctx.userId, source: "human" },
    } as never);
    return { ok: true };
  });

/** Latest reason UTS gave when sending an application back. Visible to the supplier's own members. */
export const latestDecisionReason = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ supplierId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { data: mem } = await ctx.supabase.from("supplier_members").select("user_id").eq("supplier_id", data.supplierId).eq("user_id", ctx.userId).maybeSingle();
    if (!mem) return { reason: null };
    const db = await admin();
    const { data: h } = await db.from("supplier_status_history").select("to_status, reason, created_at").eq("supplier_id", data.supplierId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    return { reason: (h as any)?.to_status === "draft" ? (h as any)?.reason ?? null : null };
  });
