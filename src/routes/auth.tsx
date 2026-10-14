import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { demoSignIn } from "@/lib/demo.functions";
import { useFlags, useT } from "@/lib/i18n";
import { ALL_ROLES, type AppRole } from "@/lib/nav";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Sign in — UTS" },
      { name: "description", content: "Sign in to the UTS operations platform." },
      { property: "og:title", content: "Sign in — UTS" },
      { property: "og:description", content: "Sign in to the UTS operations platform." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const t = useT();
  const flags = useFlags();
  const navigate = useNavigate();
  const demo = useServerFn(demoSignIn);
  const [busy, setBusy] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function enterAs(role: AppRole, fresh = false) {
    setBusy(fresh ? "fresh" : role);
    try {
      const { tokenHash } = await demo({ data: { role, fresh } });
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
      if (error) throw error;
      navigate({ to: "/home" });
    } catch {
      toast.error(t("auth.demo_failed"));
    } finally {
      setBusy(null);
    }
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy("email");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(null);
    if (error) { toast.error(t("auth.invalid")); return; }
    navigate({ to: "/home" });
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <Logo />
        {flags["demo_login"] && (
          <section className="mt-8">
            <h1 className="text-2xl font-bold text-primary">{t("auth.demo_title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("auth.demo_subtitle")}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {ALL_ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => enterAs(r)}
                  disabled={!!busy}
                  className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-colors disabled:opacity-60 ${r === "admin" ? "border-primary bg-primary text-primary-foreground sm:col-span-2" : "border-border hover:border-primary"}`}
                >
                  <div>
                    <div className="font-display font-bold">{t(`role.${r}`)}</div>
                    <div className={`text-xs ${r === "admin" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{t(`role.${r}.desc`)}</div>
                  </div>
                  {busy === r ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className={`rounded-full px-3 py-1 text-xs font-bold ${r === "admin" ? "bg-accent text-accent-foreground" : "bg-secondary text-primary"}`}>{t("auth.enter")}</span>}
                </button>
              ))}
              <button
                onClick={() => enterAs("supplier", true)}
                disabled={!!busy}
                className="flex items-center justify-between rounded-2xl border-2 border-accent bg-lime-soft p-4 text-left disabled:opacity-60 sm:col-span-2"
              >
                <div>
                  <div className="font-display font-bold text-primary">{t("auth.new_supplier")}</div>
                  <div className="text-xs text-muted-foreground">{t("auth.new_supplier.desc")}</div>
                </div>
                {busy === "fresh" ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">{t("auth.enter")}</span>}
              </button>
            </div>
          </section>
        )}
        <section className="mt-10 max-w-sm">
          <h2 className="text-lg font-bold text-primary">{t("auth.email_title")}</h2>
          <form onSubmit={signIn} className="mt-3 space-y-3">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("auth.email")} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm" />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("auth.password")} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm" />
            <button disabled={!!busy} className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60">{t("auth.sign_in")}</button>
          </form>
        </section>
      </div>
    </div>
  );
}
