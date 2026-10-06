import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { kv } from "./offline/idb";

export const SUPPLIER_KINDS = [
  "mobile_mechanic", "workshop", "auto_electrician", "trailer_technician", "tyre_specialist", "welder",
  "recovery_operator", "parts_supplier", "telematics_installer", "inspector", "logistics", "marketplace_participant",
] as const;

async function fetchTaxonomy() {
  const [ac, sys, mk, md, ft, ct, cur] = await Promise.all([
    supabase.from("asset_classes").select("id,code,name").order("name"),
    supabase.from("systems").select("id,code,name").order("name"),
    supabase.from("makes").select("id,name").order("name"),
    supabase.from("models").select("id,name,make_id,asset_class_id").order("name"),
    supabase.from("fault_types").select("id,code,name,system_id,severity").order("name"),
    supabase.from("countries").select("iso2,name,status,currency_code").order("name"),
    supabase.from("currencies").select("code,name").order("code"),
  ]);
  const err = [ac, sys, mk, md, ft, ct, cur].find((r) => r.error)?.error;
  if (err) throw err;
  return {
    assetClasses: ac.data ?? [], systems: sys.data ?? [], makes: mk.data ?? [], models: md.data ?? [],
    faultTypes: ft.data ?? [], countries: ct.data ?? [], currencies: cur.data ?? [],
  };
}
export type Taxonomy = Awaited<ReturnType<typeof fetchTaxonomy>>;

/** Taxonomy lists, cached on the device so the wizard keeps working without signal. */
export function useTaxonomy() {
  return useQuery({
    queryKey: ["taxonomy"],
    staleTime: 5 * 60_000,
    retry: 1,
    queryFn: async () => {
      try {
        const data = await fetchTaxonomy();
        kv.set("taxonomy", data).catch(() => {});
        return data;
      } catch (e) {
        const cached = await kv.get<Taxonomy>("taxonomy");
        if (cached) return cached;
        throw e;
      }
    },
  });
}
