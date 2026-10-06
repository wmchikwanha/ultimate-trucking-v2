import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <div className="mb-1 text-xs font-bold uppercase tracking-wider text-accent-foreground/70">{eyebrow}</div>}
        <h1 className="text-2xl font-bold text-primary md:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function RoleNotice({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-border bg-muted p-6 text-center text-sm text-muted-foreground">{text}</div>;
}
