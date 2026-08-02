"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PremiumExecutiveShell } from "@/components/executive/premium-executive-shell";
import { EXECUTIVE_HOME_PATH } from "@/lib/auth/constants";

interface ExecutivePanelErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ExecutivePanelError({
  error,
  reset,
}: ExecutivePanelErrorProps) {
  useEffect(() => {
    console.error("[executive-panel]", error);
  }, [error]);

  return (
    <PremiumExecutiveShell variant="dashboard">
      <main className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
          Panel de ejecutivos
        </p>
        <h1 className="mt-2 text-2xl font-bold text-primary-dark sm:text-3xl">
          No pudimos cargar el panel
        </h1>
        <p className="mt-3 max-w-md text-sm text-muted">
          Ocurrió un problema temporal al abrir esta sección. El sistema sigue
          operativo; intenta recargar o vuelve al inicio del panel.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-8 text-sm font-bold text-white shadow-[var(--shadow-cta)] transition hover:brightness-105"
          >
            Reintentar
          </button>
          <Link
            href={EXECUTIVE_HOME_PATH}
            className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-background px-8 text-sm font-bold text-primary-dark transition hover:bg-secondary-muted"
          >
            Ir al inicio
          </Link>
        </div>
      </main>
    </PremiumExecutiveShell>
  );
}
