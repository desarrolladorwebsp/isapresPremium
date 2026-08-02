"use client";

import { motion } from "framer-motion";
import { IconUserPlus, IconWhatsApp } from "@/components/executive/executive-icons";
import { touchTarget, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import { FileIcon, ShieldIcon } from "./icons";

export interface PlanCardActionsProps {
  selected: boolean;
  onSelect: () => void;
  onToggleSelection?: () => void;
  onDownloadPdf?: () => void;
  onAddInsurance?: () => void;
  onWhatsApp?: () => void;
  selectLabel?: string;
  selectVariant?: "primary" | "success";
  /** Nombre del cliente activo (solo CTA ejecutivo compacto). */
  assignClientName?: string | null;
}

type QuickActionTone = "download" | "shield" | "whatsapp" | "assign";

const quickActionToneClass: Record<QuickActionTone, string> = {
  /* PDF — cyan de marca */
  download:
    "border-[#1AC9EA]/55 bg-[#E6F9FD] text-[#0A8FAD] hover:border-[#1AC9EA] hover:bg-[#1AC9EA]/20 hover:shadow-[0_4px_12px_-4px_rgb(26,201,234/0.5)]",
  /* Seguros — ámbar / amarillo */
  shield:
    "border-amber-400/60 bg-amber-50 text-amber-700 hover:border-amber-500 hover:bg-amber-100 hover:shadow-[0_4px_12px_-4px_rgb(245,158,11/0.5)]",
  /* WhatsApp — verde marca */
  whatsapp:
    "border-[#25D366]/55 bg-[#25D366]/15 text-[#128C7E] hover:border-[#25D366] hover:bg-[#25D366]/25 hover:shadow-[0_4px_12px_-4px_rgb(37,211,102/0.5)]",
  /* Asignar — azul royal */
  assign:
    "border-[#0D6DEE]/50 bg-[#0D6DEE]/10 text-[#0D6DEE] hover:border-[#0D6DEE] hover:bg-[#0D6DEE]/18 hover:shadow-[0_4px_12px_-4px_rgb(13,109,238/0.5)]",
};

function QuickActionButton({
  label,
  shortLabel,
  onClick,
  tone,
  children,
}: {
  label: string;
  shortLabel: string;
  onClick?: () => void;
  tone: QuickActionTone;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      data-executive-quick-action={tone === "assign" ? undefined : tone}
      data-executive-assign-cta={tone === "assign" ? "true" : undefined}
      className={joinClasses(
        touchTarget,
        "h-auto min-h-12 min-w-[3.25rem] flex-col gap-0.5 rounded-xl border px-2 py-1.5 transition active:scale-[0.98] md:min-h-11 md:min-w-[3.5rem]",
        quickActionToneClass[tone],
      )}
    >
      {children}
      <span className="text-[9px] font-bold uppercase leading-none tracking-wide">
        {shortLabel}
      </span>
    </button>
  );
}

export function PlanCardActions({
  selected,
  onSelect,
  onToggleSelection,
  onDownloadPdf,
  onAddInsurance,
  onWhatsApp,
  selectLabel,
  selectVariant = "primary",
  assignClientName = null,
}: PlanCardActionsProps) {
  const isAssignCta = selectVariant === "success";
  const assignAria = assignClientName
    ? `Asignar plan a ${assignClientName}`
    : "Asignar plan a cliente";
  const showMultiSelect = Boolean(onToggleSelection);

  return (
    <footer
      className={joinClasses(
        "flex flex-col gap-4 border-t bg-white px-4 py-5 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8",
        ui.border,
      )}
    >
      {showMultiSelect ? (
        <button
          type="button"
          onClick={onToggleSelection}
          aria-pressed={selected}
          aria-label={
            selected ? "Quitar plan de la selección" : "Seleccionar plan"
          }
          className={joinClasses(
            touchTarget,
            "h-auto w-full gap-2.5 rounded-xl border px-3.5 py-2.5 transition active:scale-[0.98] md:w-auto",
            selected
              ? "border-primary bg-primary text-primary-foreground shadow-[0_4px_14px_-4px_var(--primary)] hover:bg-primary-hover"
              : "border-primary/35 bg-primary/8 text-primary-dark hover:border-primary/55 hover:bg-primary/14 hover:shadow-[0_4px_12px_-4px_rgb(13,109,238/0.28)]",
          )}
        >
          <span
            aria-hidden
            className={joinClasses(
              "flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition",
              selected
                ? "border-white/80 bg-white text-primary"
                : "border-primary/45 bg-white",
            )}
          >
            {selected ? (
              <svg
                viewBox="0 0 16 16"
                className="size-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
              >
                <path
                  d="M3.5 8.5 6.5 11.5 12.5 4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
          </span>
          <span className="text-sm font-bold tracking-tight">
            {selected ? "Seleccionado" : "Seleccionar"}
          </span>
        </button>
      ) : null}

      <div
        className={joinClasses(
          "flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center md:w-auto",
          showMultiSelect ? "md:justify-end" : "md:ml-auto md:justify-end",
        )}
      >
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          <QuickActionButton
            label="Ver detalle del plan (PDF)"
            shortLabel="PDF"
            onClick={onDownloadPdf}
            tone="download"
          >
            <FileIcon />
          </QuickActionButton>
          <QuickActionButton
            label="Agregar seguros"
            shortLabel="Seguros"
            onClick={onAddInsurance}
            tone="shield"
          >
            <ShieldIcon />
          </QuickActionButton>
          {onWhatsApp ? (
            <QuickActionButton
              label="Compartir por WhatsApp"
              shortLabel="WhatsApp"
              onClick={onWhatsApp}
              tone="whatsapp"
            >
              <IconWhatsApp className="size-4" />
            </QuickActionButton>
          ) : null}
          {isAssignCta ? (
            <QuickActionButton
              label={assignAria}
              shortLabel="Asignar"
              onClick={onSelect}
              tone="assign"
            >
              <IconUserPlus className="size-4" />
            </QuickActionButton>
          ) : null}
        </div>

        {!isAssignCta ? (
          <motion.button
            type="button"
            onClick={onSelect}
            whileTap={{ scale: 0.98 }}
            className={joinClasses(
              touchTarget,
              "w-full rounded-full px-6 text-sm font-bold tracking-tight shadow-md md:min-w-[11.5rem] md:w-auto",
              selected
                ? "border-2 border-primary bg-white text-primary-dark"
                : joinClasses(
                    ui.cta,
                    "shadow-[0_6px_20px_-6px_var(--primary)] hover:shadow-[0_8px_24px_-4px_var(--primary)]",
                  ),
            )}
          >
            {selected
              ? "Plan seleccionado"
              : (selectLabel ?? "Seleccionar plan")}
          </motion.button>
        ) : null}
      </div>
    </footer>
  );
}
