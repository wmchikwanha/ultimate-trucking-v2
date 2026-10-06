import { createContext, useContext, type ReactNode } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getPublicConfig } from "./public.functions";

export const DEFAULT_LOCALE = "en";

export const publicConfigQuery = (locale: string = DEFAULT_LOCALE) =>
  queryOptions({
    queryKey: ["public-config", locale],
    queryFn: () => getPublicConfig({ data: { locale } }),
    staleTime: 60_000,
  });

type Ctx = { locale: string; t: (key: string, vars?: Record<string, string | number>) => string; flags: Record<string, boolean> };
const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = DEFAULT_LOCALE;
  const { data } = useSuspenseQuery(publicConfigQuery(locale));
  const t: Ctx["t"] = (key, vars) => {
    let s = data.strings[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
  return <I18nCtx.Provider value={{ locale, t, flags: data.flags }}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("useI18n outside I18nProvider");
  return c;
}
export const useT = () => useI18n().t;
export const useFlags = () => useI18n().flags;
