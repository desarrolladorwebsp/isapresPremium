"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { accent, safeWidth, touchTarget, ui } from "@/lib/ui-tokens";
import { COMPANY_AGREEMENT_DISCOUNT_DISCLAIMER } from "@/lib/company-agreements/constants";
import { joinClasses } from "@/lib/utils";

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden>
      <path
        d="M8 8l8 8M16 8l-8 8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden>
      <path
        d="M4 21V9l8-5 8 5v12M9 21v-6h6v6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9 11h.01M12 11h.01M15 11h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface CompanyAgreementInfoModalProps {
  open: boolean;
  onClose: () => void;
  /** Modal inline en widget embebido (sin overlay fijo a pantalla completa). */
  embedded?: boolean;
}

const BENEFIT_ITEMS = [
  {
    title: "Convenios colectivos",
    text: "Algunas empresas mantienen convenios que permiten acceder a condiciones preferentes para sus trabajadores y cargas.",
  },
  {
    title: "Descuentos de hasta un 10%",
    text: "Según la empresa y el convenio vigente, puedes obtener beneficios que reducen el costo de tu plan de salud.",
  },
  {
    title: "Validación sin compromiso",
    text: "Revisamos si tu empleador tiene convenio activo y te orientamos sobre los planes que aplican, sin afectar tu cotización actual.",
  },
] as const;

export function CompanyAgreementInfoModal({
  open,
  onClose,
  embedded = false,
}: CompanyAgreementInfoModalProps) {
  useScrollLock(open && !embedded);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          data-embed-measure
          className={joinClasses(
            embedded
              ? "relative z-50 w-full overflow-visible py-2"
              : "fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4",
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {embedded ? null : (
            <button
              type="button"
              aria-label="Cerrar"
              className="absolute inset-0 bg-primary-dark/50 backdrop-blur-[2px]"
              onClick={onClose}
            />
          )}

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="company-agreement-info-title"
            initial={{ opacity: 0, y: embedded ? 12 : 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: embedded ? 8 : 16 }}
            className={joinClasses(
              safeWidth,
              embedded
                ? "relative z-10 mx-auto w-full max-w-full rounded-2xl border bg-white shadow-xl"
                : "relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border bg-white shadow-2xl sm:rounded-2xl",
              ui.border,
            )}
          >
            <div
              className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-secondary/70 to-accent-warning/80"
              aria-hidden
            />

            <div className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-4 sm:px-5">
              <div className="flex items-start gap-3">
                <span
                  className={joinClasses(
                    "inline-flex size-10 shrink-0 items-center justify-center rounded-xl",
                    accent.iconPrimary,
                  )}
                  aria-hidden
                >
                  <BuildingIcon />
                </span>
                <div>
                  <p
                    id="company-agreement-info-title"
                    className="text-base font-bold text-primary-dark"
                  >
                    Convenios empresa
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Beneficios colectivos para trabajadores
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar información"
                className={joinClasses(
                  "shrink-0 rounded-lg text-muted transition hover:bg-surface-hover hover:text-foreground",
                  touchTarget,
                )}
              >
                <CloseIcon />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-5 sm:py-5">
              <p className="text-sm leading-relaxed text-foreground/90">
                Algunas empresas cuentan con convenios colectivos que pueden
                habilitar descuentos, bonificaciones o condiciones preferentes
                para sus trabajadores y cargas.
              </p>

              <ul className="space-y-3">
                {BENEFIT_ITEMS.map((item) => (
                  <li
                    key={item.title}
                    className={joinClasses(
                      "rounded-xl border bg-bg-layout/40 px-3.5 py-3",
                      ui.border,
                    )}
                  >
                    <p className="text-sm font-semibold text-primary-dark">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      {item.text}
                    </p>
                  </li>
                ))}
              </ul>

              <p className="rounded-lg bg-primary/8 px-3 py-2.5 text-[11px] leading-relaxed text-primary-dark">
                El beneficio depende del convenio vigente de tu empresa. Nuestro
                equipo puede validarlo con la información que nos compartas.{" "}
                {COMPANY_AGREEMENT_DISCOUNT_DISCLAIMER}
              </p>
            </div>

            <div className="shrink-0 border-t px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={onClose}
                className={joinClasses(
                  "h-10 w-full rounded-lg text-sm font-semibold",
                  ui.cta,
                )}
              >
                Entendido
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
