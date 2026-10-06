import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

/** Public, anon-readable config: UI strings for a locale + feature flags. */
export const getPublicConfig = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ locale: z.string().min(2).max(10) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const [tr, ff] = await Promise.all([
      sb.from("translations").select("key,value").eq("locale", data.locale).limit(5000),
      sb.from("feature_flags").select("key,enabled,phase"),
    ]);
    const strings: Record<string, string> = {};
    for (const r of tr.data ?? []) strings[r.key] = r.value;
    const flags: Record<string, boolean> = {};
    for (const f of ff.data ?? []) flags[f.key] = f.enabled;
    return { strings, flags };
  });
