"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { IsapreLogo } from "@/components/plan-card/isapre-logo";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { getPlanPdfInlineUrl, planHasPdf } from "@/lib/plan-pdf";
import { resolveCommercialPlanName } from "@/lib/plan-metadata";
import { safeWidth, touchTarget, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { HealthPlanSummary } from "@/domain";

export interface PublicPlanPdfModalProps {
  open: boolean;
  plan: HealthPlanSummary | null;
  onClose: () => void;
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PublicPlanPdfModal({
  open,
  plan,
  onClose,
}: PublicPlanPdfModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const hasPdf = plan ? planHasPdf(plan) : false;
  const inlineUrl = plan ? getPlanPdfInlineUrl(plan) : null;

  useEffect(() => {
    if (!open || !hasPdf || !inlineUrl) {
      setLoading(false);
      setFailed(false);
      return;
    }
    setLoading(true);
    setFailed(false);
  }, [open, hasPdf, inlineUrl, plan?.unique_code]);

  if (!mounted || !plan) return null;

  const commercialName = resolveCommercialPlanName(plan);

  const modal = (
    <AnimatePresence>
      {open ? (
        <motion.div
          data-embed-overlay="plan-pdf-modal"
          className="fixed inset-0 z-[110] flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Cerrar vista del PDF"
            className="absolute inset-0 bg-primary-dark/55 backdrop-blur-[3px]"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="public-plan-pdf-title"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={joinClasses(
              safeWidth,
              "relative z-10 flex max-h-[min(96dvh,100svh)] w-full max-w-full flex-col overflow-hidden rounded-t-2xl border bg-bg-layout shadow-2xl sm:max-h-[92dvh] sm:max-w-5xl sm:rounded-2xl",
              ui.border,
            )}
          >
            <header className="flex shrink-0 items-start gap-3 border-b bg-white px-4 py-3 sm:px-6 sm:py-4">
              <IsapreLogo isapre={plan.isapre} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                  Contrato del plan
                </p>
                <h2
                  id="public-plan-pdf-title"
                  className="truncate text-sm font-bold text-primary-dark sm:text-base"
                >
                  {commercialName}
                </h2>
                <p className="mt-0.5 font-mono text-[11px] text-muted">
                  {plan.unique_code}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className={joinClasses(
                  touchTarget,
                  "size-9 shrink-0 rounded-full border bg-white text-muted hover:bg-surface-hover",
                  ui.border,
                )}
              >
                <CloseIcon />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-hidden bg-surface-hover/40 p-3 sm:p-4">
              {!hasPdf || !inlineUrl ? (
                <div
                  className={joinClasses(
                    "flex h-full min-h-[22rem] flex-col items-center justify-center rounded-xl border border-dashed bg-white px-6 text-center",
                    ui.border,
                  )}
                >
                  <p className="text-base font-semibold text-foreground">
                    PDF disponible pronto
                  </p>
                  <p className="mt-1 max-w-sm text-sm text-muted">
                    Este plan aún no tiene contrato cargado. Cuando esté
                    disponible podrás verlo aquí.
                  </p>
                </div>
              ) : failed ? (
                <div
                  className={joinClasses(
                    "flex h-full min-h-[22rem] flex-col items-center justify-center rounded-xl border border-dashed bg-white px-6 text-center",
                    ui.border,
                  )}
                >
                  <p className="text-base font-semibold text-foreground">
                    No se pudo mostrar el PDF
                  </p>
                  <p className="mt-1 max-w-sm text-sm text-muted">
                    El visor no cargó el contrato. Intenta de nuevo en unos
                    momentos.
                  </p>
                </div>
              ) : (
                <div
                  className={joinClasses(
                    "relative h-full min-h-[min(70vh,36rem)] overflow-hidden rounded-xl border bg-white",
                    ui.border,
                  )}
                >
                  {loading ? (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 text-sm text-muted">
                      Cargando contrato…
                    </div>
                  ) : null}
                  <iframe
                    title={`Contrato PDF — ${commercialName}`}
                    src={inlineUrl}
                    className="h-full min-h-[min(70vh,36rem)] w-full"
                    onLoad={() => {
                      setLoading(false);
                      setFailed(false);
                    }}
                    onError={() => {
                      setLoading(false);
                      setFailed(true);
                    }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
