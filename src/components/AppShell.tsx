import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, MoreHorizontal, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useFlags, useT } from "@/lib/i18n";
import { ALL_ROLES, navFor, type AppRole, type NavItem } from "@/lib/nav";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

function PhaseBadge({ item }: { item: NavItem }) {
  const t = useT();
  const flags = useFlags();
  if (item.flag === null || flags[item.flag]) return null;
  return (
    <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-primary">
      {t("common.phase_n", { n: item.phase ?? 0 })}
    </span>
  );
}

function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}

function RoleSwitcher() {
  const t = useT();
  const { isAdmin, viewRole, setViewRole, roles } = useAuth();
  if (!isAdmin) {
    return (
      <span className="rounded-full bg-lime-soft px-3 py-1 text-xs font-semibold text-accent-foreground">
        {t(`role.${roles[0] ?? "none"}`)}
      </span>
    );
  }
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="hidden sm:inline">{t("shell.view_as")}</span>
      <select
        value={viewRole ?? "admin"}
        onChange={(e) => setViewRole(e.target.value as AppRole)}
        className="rounded-full border border-border bg-lime-soft px-3 py-1 text-xs font-semibold text-accent-foreground"
      >
        {ALL_ROLES.map((r) => (
          <option key={r} value={r}>{t(`role.${r}`)}</option>
        ))}
      </select>
    </label>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const t = useT();
  const { viewRole, user } = useAuth();
  const signOut = useSignOut();
  const items = navFor(viewRole);
  const primary = items.slice(0, 4);
  const overflow = items.slice(4);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="p-5"><Logo /></div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {items.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent"
              activeProps={{ className: "!bg-primary !text-primary-foreground" }}
            >
              <item.icon className="h-4 w-4" />
              <span>{t(`nav.${item.id}`)}</span>
              <PhaseBadge item={item} />
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4 text-xs">
          <div className="mb-2 truncate text-muted-foreground">{user.email}</div>
          <button onClick={signOut} className="flex items-center gap-2 font-semibold text-primary">
            <LogOut className="h-4 w-4" /> {t("shell.sign_out")}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div className="md:hidden"><Logo compact /></div>
          <div className="hidden text-sm text-muted-foreground md:block">Productive Asset Intelligence</div>
          <div className="flex items-center gap-3">
            <RoleSwitcher />
            <button onClick={signOut} aria-label={t("shell.sign_out")} className="text-primary md:hidden">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>
        <main className="flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-10">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background md:hidden">
        {primary.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            className="flex flex-col items-center gap-1 py-2 text-[11px] font-semibold text-muted-foreground"
            activeProps={{ className: "!text-primary" }}
          >
            <item.icon className="h-5 w-5" />
            <span className="max-w-full truncate px-1">{t(`nav.${item.id}`)}</span>
          </Link>
        ))}
        {overflow.length > 0 ? (
          <button onClick={() => setMoreOpen(true)} className="flex flex-col items-center gap-1 py-2 text-[11px] font-semibold text-muted-foreground">
            <MoreHorizontal className="h-5 w-5" />
            {t("shell.more")}
          </button>
        ) : <span />}
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/30 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-background p-4 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-primary">{t("shell.more")}</h2>
              <button onClick={() => setMoreOpen(false)} aria-label={t("common.close")}><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {overflow.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setMoreOpen(false)}
                  className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-secondary")}
                  activeProps={{ className: "bg-secondary text-primary" }}
                >
                  <item.icon className="h-5 w-5 text-primary" />
                  {t(`nav.${item.id}`)}
                  <PhaseBadge item={item} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
