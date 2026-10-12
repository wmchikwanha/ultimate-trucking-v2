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
    // The API caps responses at 1000 rows, so page through each locale separately.
    const fetchLocale = async (l: string) => {
      const out: { locale: string; key: string; value: string; reviewed: boolean }[] = [];
      for (let from = 0; ; from += 1000) {
        const { data: page } = await sb.from("translations").select("locale,key,value,reviewed").eq("locale", l).order("key").range(from, from + 999);
        out.push(...((page ?? []) as typeof out));
        if (!page || page.length < 1000) break;
      }
      return out;
    };
    const [trs, ff] = await Promise.all([
      Promise.all(locales.map(fetchLocale)),
      sb.from("feature_flags").select("key,enabled,phase"),
    ]);
    const strings: Record<string, string> = {};
    const unreviewed: string[] = [];
    const rows = trs.flat();
    for (const r of rows) if (r.locale === "en") strings[r.key] = r.value;
    for (const r of rows) if (r.locale !== "en") {
      strings[r.key] = r.value;
      if (!r.reviewed) unreviewed.push(r.key);
    }
    const flags: Record<string, boolean> = {};
    for (const f of ff.data ?? []) flags[f.key] = f.enabled;
    return { strings, flags, unreviewed };
  });
