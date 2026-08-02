"use client";

import { AnimatePresence, motion } from "framer-motion";
import { joinClasses } from "@/lib/utils";

export type ToastTone = "success" | "error";

export interface AdminToastProps {
  message: string | null;
  tone?: ToastTone;
  onDismiss: () => void;
}

const toneClass: Record<ToastTone, string> = {
  success: "border-primary/30 bg-primary/10 text-primary-dark",
  error: "border-danger/30 bg-danger-muted text-danger",
};

export function AdminToast({
  message,
  tone = "success",
  onDismiss,
}: AdminToastProps) {
  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="pointer-events-none fixed bottom-5 left-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2"
        >
          <div
            className={joinClasses(
              "pointer-events-auto flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-card",
              toneClass[tone],
            )}
            role="status"
          >
            <span>{message}</span>
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 text-xs font-semibold opacity-70 transition hover:opacity-100"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
