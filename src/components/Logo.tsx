import { useT } from "@/lib/i18n";

export function Logo({ compact = false }: { compact?: boolean }) {
  const t = useT();
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary font-display text-sm font-bold text-accent">
        UTS
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="font-display text-sm font-bold text-primary">{t("brand.name")}</div>
          <div className="text-[11px] text-muted-foreground">{t("brand.short_tagline")}</div>
        </div>
      )}
    </div>
  );
}
