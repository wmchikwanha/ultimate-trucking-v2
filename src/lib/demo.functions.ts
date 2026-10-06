import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ROLES = ["admin", "approver", "ops", "auditor", "customer", "supplier", "driver"] as const;

/**
 * Demo-only quick sign-in. Only works while the `demo_login` feature flag is on.
 * Ensures a demo account exists for the role and returns a one-time login token.
 */
export const demoSignIn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ role: z.enum(ROLES), fresh: z.boolean().optional() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: flag } = await supabaseAdmin
      .from("feature_flags")
      .select("enabled")
      .eq("key", "demo_login")
      .maybeSingle();
    if (!flag?.enabled) throw new Error("Demo sign-in is disabled");

    // fresh = brand-new account each time (e.g. a new supplier registering from scratch)
    const email = data.fresh
      ? `demo.${data.role}.${crypto.randomUUID().slice(0, 8)}@uts-demo.co.bw`
      : `demo.${data.role}@uts-demo.co.bw`;
    await supabaseAdmin.auth.admin.createUser({ email, email_confirm: true }).catch(() => null);

    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
    if (error || !link?.user) throw new Error(error?.message ?? "Could not create demo session");
    const userId = link.user.id;

    await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: data.role }, { onConflict: "user_id,role" });
    await supabaseAdmin
      .from("profiles")
      .upsert({ user_id: userId, email, full_name: `Demo ${data.role}`, country_code: "BW" }, { onConflict: "user_id" });

    return { tokenHash: link.properties.hashed_token };
  });
