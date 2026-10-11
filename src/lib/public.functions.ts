import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

/** Public, anon-readable config: UI strings for a locale (English fallback) + feature flags. */
export const getPublicConfig = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ locale: z.string().min(2).max(10) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const locales = data.locale === "en" ? ["en"] : ["en", data.locale];
    const [tr, ff] = await Promise.all([
      sb.from("translations").select("locale,key,value,reviewed").in("locale", locales).limit(10000),
      sb.from("feature_flags").select("key,enabled,phase"),
    ]);
    const strings: Record<string, string> = {};
    const unreviewed: string[] = [];
    const rows = tr.data ?? [];
    for (const r of rows) if (r.locale === "en") strings[r.key] = r.value;
    for (const r of rows) if (r.locale !== "en") {
      strings[r.key] = r.value;
      if (!r.reviewed) unreviewed.push(r.key);
    }
    const flags: Record<string, boolean> = {};
    for (const f of ff.data ?? []) flags[f.key] = f.enabled;
    return { strings, flags, unreviewed };
  });
