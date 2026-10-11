import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { getPublicConfig } from "./public.functions";
import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_LOCALE = "en";
export const UI_LOCALES = ["en", "tn", "af", "zu"] as const;
const LS_KEY = "uts_preferred_locale";

export const publicConfigQuery = (locale: string = DEFAULT_LOCALE) =>
  queryOptions({
    queryKey: ["public-config", locale],
    queryFn: () => getPublicConfig({ data: { locale } }),
    staleTime: 60_000,
  });

type Ctx = {
  locale: string;
  setLocale: (l: string) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  flags: Record<string, boolean>;
  unreviewedCount: number;
};
const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<string>(DEFAULT_LOCALE);
  const base = useSuspenseQuery(publicConfigQuery(DEFAULT_LOCALE)).data;
  const loc = useQuery({ ...publicConfigQuery(locale), enabled: locale !== DEFAULT_LOCALE });
  const data = locale !== DEFAULT_LOCALE && loc.data ? loc.data : base;

  // Restore: local device first, then the signed-in profile (across devices).
  useEffect(() => {
    const ls = localStorage.getItem(LS_KEY);
    if (ls && (UI_LOCALES as readonly string[]).includes(ls)) setLocaleState(ls);
    const load = async (uid?: string) => {
      if (!uid) return;
      const { data: p } = await supabase.from("profiles").select("preferred_locale").eq("user_id", uid).maybeSingle();
      const pl = p?.preferred_locale;
      if (pl && (UI_LOCALES as readonly string[]).includes(pl)) { setLocaleState(pl); localStorage.setItem(LS_KEY, pl); }
    };
    supabase.auth.getUser().then(({ data: u }) => load(u.user?.id));
    const { data: sub } = supabase.auth.onAuthStateChange((ev, s) => { if (ev === "SIGNED_IN") load(s?.user.id); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const setLocale = useCallback((l: string) => {
    setLocaleState(l);
    localStorage.setItem(LS_KEY, l);
    supabase.auth.getUser().then(({ data: u }) => {
      if (u.user) supabase.from("profiles").update({ preferred_locale: l }).eq("user_id", u.user.id).then(() => {});
    });
  }, []);

  const t: Ctx["t"] = (key, vars) => {
    let s = data.strings[key] ?? base.strings[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
  return (
    <I18nCtx.Provider value={{ locale, setLocale, t, flags: data.flags, unreviewedCount: data.unreviewed?.length ?? 0 }}>
      {children}
    </I18nCtx.Provider>
  );
}

export function useI18n() {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("useI18n outside I18nProvider");
  return c;
}
export const useT = () => useI18n().t;
export const useFlags = () => useI18n().flags;
