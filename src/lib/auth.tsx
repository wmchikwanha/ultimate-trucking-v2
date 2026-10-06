import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ALL_ROLES, type AppRole } from "./nav";

type AuthCtx = {
  user: User;
  roles: AppRole[];
  /** Role currently used to shape navigation. Admin (General Manager) can preview any role. */
  viewRole: AppRole | null;
  setViewRole: (r: AppRole) => void;
  isAdmin: boolean;
};
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ user, children }: { user: User; children: ReactNode }) {
  const { data: roles = [], isPending } = useQuery({
    queryKey: ["my-roles", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      return (data ?? []).map((r) => r.role).sort((a, b) => ALL_ROLES.indexOf(a) - ALL_ROLES.indexOf(b));
    },
  });
  const isAdmin = roles.includes("admin");
  const [override, setOverride] = useState<AppRole | null>(null);
  useEffect(() => setOverride(null), [user.id]);
  const viewRole = (isAdmin && override) || roles[0] || null;
  if (isPending) return <div className="grid min-h-screen place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-primary" /></div>;
  return <Ctx.Provider value={{ user, roles, viewRole, setViewRole: setOverride, isAdmin }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
