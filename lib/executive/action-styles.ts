import { joinClasses } from "@/lib/utils";

/** Colores semánticos del panel ejecutivo (azul = marca; resto = acción). */
export const executiveAction = {
  whatsapp:
    "border border-[#1da851]/30 bg-[#25D366] text-white shadow-sm transition hover:brightness-105 active:scale-[0.98]",
  success:
    "border border-emerald-200 bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]",
  info:
    "border border-sky-200 bg-sky-600 text-white shadow-sm transition hover:bg-sky-700 active:scale-[0.98]",
  warning:
    "border border-amber-200 bg-amber-500 text-amber-950 shadow-sm transition hover:bg-amber-400 active:scale-[0.98]",
  danger:
    "border border-red-200 bg-red-600 text-white shadow-sm transition hover:bg-red-700 active:scale-[0.98]",
  manage:
    "border border-primary/20 bg-primary text-primary-foreground shadow-[0_4px_14px_-6px_var(--primary)] transition hover:bg-primary-hover active:scale-[0.98]",
  ghostMuted:
    "border border-border bg-white text-muted transition hover:bg-surface-hover hover:text-foreground",
} as const;

export type ExecutiveStatTone = "primary" | "info" | "warning" | "success";

export const executiveStatToneClass: Record<
  ExecutiveStatTone,
  { value: string; border: string; icon: string; bg: string }
> = {
  primary: {
    value: "text-primary-dark",
    border: "border-l-primary",
    icon: "bg-primary/12 text-primary-dark",
    bg: "from-primary/8 via-white to-white",
  },
  info: {
    value: "text-sky-800",
    border: "border-l-sky-500",
    icon: "bg-sky-100 text-sky-700",
    bg: "from-sky-50 via-white to-white",
  },
  warning: {
    value: "text-amber-800",
    border: "border-l-amber-500",
    icon: "bg-amber-100 text-amber-800",
    bg: "from-amber-50 via-white to-white",
  },
  success: {
    value: "text-emerald-800",
    border: "border-l-emerald-500",
    icon: "bg-emerald-100 text-emerald-800",
    bg: "from-emerald-50 via-white to-white",
  },
};

export function executiveStatCardClass(tone: ExecutiveStatTone): string {
  const styles = executiveStatToneClass[tone];
  return joinClasses(
    "overflow-hidden rounded-xl border bg-gradient-to-br px-4 py-4 shadow-sm",
    "border-border border-l-4",
    styles.border,
    styles.bg,
  );
}
