import { Languages } from "lucide-react";
import { UI_LOCALES, useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

/** Language picker; admins also see a marker when the active language has unreviewed machine translations. */
export function LanguageSwitcher() {
  const { locale, setLocale, t, unreviewedCount } = useI18n();
  const { isAdmin } = useAuth();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1 text-sm text-muted-foreground">
        <Languages className="h-4 w-4" aria-hidden />
        <span className="sr-only">Language</span>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
          aria-label="Language"
        >
          {UI_LOCALES.map((l) => <option key={l} value={l}>{t(`lang.${l}`)}</option>)}
        </select>
      </label>
      {isAdmin && locale !== "en" && unreviewedCount > 0 && (
        <span className="rounded-full border border-accent bg-accent/20 px-2 py-0.5 text-xs text-foreground">
          Translation under review ({unreviewedCount})
        </span>
      )}
    </div>
  );
}
