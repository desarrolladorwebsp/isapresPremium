"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ExecutiveToastItem, ExecutiveToastTone } from "@/hooks/use-executive-toast";
import { joinClasses } from "@/lib/utils";

export interface ExecutiveToastStackProps {
  toasts: ExecutiveToastItem[];
  onDismiss: (id: string) => void;
}

const toneStyles: Record<
  ExecutiveToastTone,
  {
    card: string;
    icon: string;
    progress: string;
    label: string;
  }
> = {
  success: {
    card: "border-emerald-200/80 bg-white text-emerald-950 shadow-[0_12px_40px_-18px_rgba(5,150,105,0.55)]",
    icon: "bg-emerald-100 text-emerald-700",
    progress: "bg-emerald-500",
    label: "Listo",
  },
  error: {
    card: "border-red-200/80 bg-white text-red-950 shadow-[0_12px_40px_-18px_rgba(220,38,38,0.45)]",
    icon: "bg-red-100 text-red-700",
    progress: "bg-red-500",
    label: "Error",
  },
  info: {
    card: "border-sky-200/80 bg-white text-sky-950 shadow-[0_12px_40px_-18px_rgba(14,165,233,0.4)]",
    icon: "bg-sky-100 text-sky-700",
    progress: "bg-sky-500",
    label: "Info",
  },
  warning: {
    card: "border-amber-200/80 bg-white text-amber-950 shadow-[0_12px_40px_-18px_rgba(245,158,11,0.45)]",
    icon: "bg-amber-100 text-amber-800",
    progress: "bg-amber-500",
    label: "Aviso",
  },
};

const dismissDurationMs: Record<ExecutiveToastTone, number> = {
  success: 4200,
  error: 6500,
  info: 4800,
  warning: 5200,
};

function ToastIcon({ tone }: { tone: ExecutiveToastTone }) {
  if (tone === "error") {
    return (
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
      </svg>
    );
  }

  if (tone === "warning") {
    return (
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 3l9 16H3L12 3z" strokeLinejoin="round" />
        <path d="M12 10v4M12 17h.01" strokeLinecap="round" />
      </svg>
    );
  }

  if (tone === "info") {
    return (
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExecutiveToastCard({
  toast,
  onDismiss,
}: {
  toast: ExecutiveToastItem;
  onDismiss: (id: string) => void;
}) {
  const styles = toneStyles[toast.tone];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 48, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 48, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className={joinClasses(
        "pointer-events-auto overflow-hidden rounded-2xl border backdrop-blur-sm",
        styles.card,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        <span
          className={joinClasses(
            "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl",
            styles.icon,
          )}
        >
          <ToastIcon tone={toast.tone} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide opacity-70">
            {styles.label}
          </p>
          <p className="mt-0.5 text-sm font-medium leading-snug">{toast.message}</p>
        </div>

        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 rounded-lg p-1 text-xs font-semibold opacity-50 transition hover:bg-black/5 hover:opacity-100"
          aria-label="Cerrar notificación"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="h-1 w-full bg-black/5">
        <motion.div
          className={joinClasses("h-full origin-left", styles.progress)}
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{
            duration: dismissDurationMs[toast.tone] / 1000,
            ease: "linear",
          }}
        />
      </div>
    </motion.div>
  );
}

export function ExecutiveToastStack({ toasts, onDismiss }: ExecutiveToastStackProps) {
  return (
    <div
      className="pointer-events-none fixed right-4 top-16 z-[60] flex w-[min(92vw,22rem)] flex-col gap-3 sm:right-6 sm:top-24"
      aria-label="Notificaciones"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ExecutiveToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
