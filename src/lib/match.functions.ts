import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

/** Free text ("truck won't start, clicking noise") -> a fault type from the taxonomy. */
export const matchFaultText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ text: z.string().trim().min(3).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { data: faults } = await ctx.supabase.from("fault_types").select("id, code, name, system_id, systems(name)");
    const list = (faults ?? []) as any[];
    const catalogue = list.map((f) => `${f.code} = ${f.name} (${f.systems?.name ?? ""})`).join("\n");
    const { structuredResponse } = await import("./ai/gateway.server");
    try {
      const out = await structuredResponse<{ code: string | null; confidence: number }>({
        schemaName: "fault_match",
        schema: {
          type: "object", additionalProperties: false, required: ["code", "confidence"],
          properties: { code: { type: ["string", "null"] }, confidence: { type: "number" } },
        },
        instructions:
          "A truck driver describes a breakdown. Pick the single best fault code from the catalogue (the part left of '='). " +
          "Return null if nothing fits. confidence 0..1.\n\n" + catalogue,
        content: [{ type: "input_text", text: data.text }],
      });
      const hit = list.find((f) => f.code === out.code);
      if (!hit) return { ok: false as const };
      return { ok: true as const, faultTypeId: hit.id as string, systemId: hit.system_id as string, name: hit.name as string, confidence: Math.max(0, Math.min(1, Number(out.confidence) || 0)) };
    } catch (e) {
      return { ok: false as const, message: e instanceof Error ? e.message : "AI failed" };
    }
  });

export const findProviders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      faultTypeId: z.string().uuid().nullable(),
      systemId: z.string().uuid().nullable(),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      radiusKm: z.number().int().min(5).max(1500).default(250),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { data: rows, error } = await ctx.supabase.rpc("rank_suppliers", {
      _fault_type_id: data.faultTypeId, _system_id: data.systemId, _lat: data.lat, _lng: data.lng, _radius_km: data.radiusKm, _exclude: [],
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{ supplier_id: string; score: number; rationale: any }>;
  });

export const findParts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ q: z.string().trim().min(2).max(120), lat: z.number(), lng: z.number(), radiusKm: z.number().int().min(5).max(1500).default(400) }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { data: rows, error } = await ctx.supabase.rpc("search_parts", { _q: data.q, _lat: data.lat, _lng: data.lng, _radius_km: data.radiusKm });
    if (error) throw new Error(error.message);
    const seen = new Set<string>();
    return ((rows ?? []) as any[]).filter((r) => {
      const k = `${r.supplier_id}:${r.part_id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  });
