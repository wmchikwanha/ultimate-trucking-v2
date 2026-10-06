import type { ReactNode } from "react";
import { Check, Minus, Plus } from "lucide-react";

export const inputCls = "w-full rounded-xl border border-input bg-background px-4 py-3 text-base";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function Chip({ on, label, onClick, saved }: { on: boolean; label: string; onClick: () => void; saved?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}
    >
      {on && saved && <Check className="h-3.5 w-3.5 text-accent" />}
      {label}
    </button>
  );
}

export function Stepper({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border px-4 py-2.5">
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex items-center gap-3">
        <button type="button" aria-label="-" onClick={() => onChange(Math.max(0, value - 1))} className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-primary"><Minus className="h-4 w-4" /></button>
        <span className="w-6 text-center font-bold">{value}</span>
        <button type="button" aria-label="+" onClick={() => onChange(Math.min(99, value + 1))} className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground"><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

export const toggleIn = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
