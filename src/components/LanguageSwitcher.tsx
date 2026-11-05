import { Languages } from "lucide-react";
import { UI_LOCALES, useI18n } from "@/lib/i18n";

/** Global language picker. Admins (passed in by the shell) also see a marker for unreviewed machine translations. */
export function LanguageSwitcher({ isAdmin = false }: { isAdmin?: boolean }) {
  const { locale, setLocale, t, unreviewedCount } = useI18n();
  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1 text-sm text-muted-foreground">
        <Languages className="h-4 w-4" aria-hidden />
        <span className="sr-only">Language</span>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          className="h-8 rounded-full border border-input bg-background px-2 text-xs font-semibold text-foreground"
          aria-label="Language"
        >
          {UI_LOCALES.map((l) => <option key={l} value={l}>{t(`lang.${l}`)}</option>)}
        </select>
      </label>
      {isAdmin && locale !== "en" && unreviewedCount > 0 && (
        <span className="hidden rounded-full border border-accent bg-accent/20 px-2 py-0.5 text-xs text-foreground sm:inline">
          Translation under review ({unreviewedCount})
        </span>
      )}
    </div>
  );
}
