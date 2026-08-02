"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import "./premium-executive.css";

interface PremiumExecutiveShellProps {
  children: ReactNode;
  /** `auth` aplica fondo decorativo para login; `dashboard` para panel ejecutivo. */
  variant?: "auth" | "dashboard";
}

export function PremiumExecutiveShell({
  children,
  variant = "dashboard",
}: PremiumExecutiveShellProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div
      data-premium-surface
      data-premium-variant={variant}
      className="premium-surface-root flex min-h-0 flex-1 flex-col"
    >
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: variant === "auth" ? 16 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 280,
          damping: 30,
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        {children}
      </motion.div>
    </div>
  );
}

export function PremiumExecutiveAuthFallback() {
  return (
    <div
      data-premium-surface
      data-premium-variant="auth"
      className="flex min-h-screen items-center justify-center bg-bg-layout text-sm text-muted"
    >
      Cargando...
    </div>
  );
}
