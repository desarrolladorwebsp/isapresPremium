"use client";

import { useEffect, useId, useState } from "react";
import { touchTarget } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

export interface ConfirmableFieldInputProps {
  id?: string;
  label: string;
  value: string;
  /** Valor ya confirmado en el estado padre (para feedback visual). */
  committedValue?: string | null;
  onChange: (raw: string) => void;
  /** Confirma el borrador y aplica el valor al cálculo / criterios. */
  onConfirm: () => void;
  /** true cuando el borrador es válido y se puede agregar/actualizar. */
  canConfirm: boolean;
  placeholder?: string;
  type?: "text" | "number";
  inputMode?: "none" | "text" | "decimal" | "numeric" | "tel" | "search" | "email" | "url";
  min?: number;
  max?: number;
  autoComplete?: string;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  /** Variante compacta (widget embebido). */
  compact?: boolean;
  onBlur?: () => void;
  /** Aria / accesibilidad del botón. */
  confirmLabel?: string;
}

/**
 * Input con borrador local + botón «Agregar» (o «Actualizar»).
 * El valor solo impacta precios/criterios cuando el usuario confirma.
 */
export function ConfirmableFieldInput({
  id: idProp,
  label,
  value,
  committedValue = null,
  onChange,
  onConfirm,
  canConfirm,
  placeholder,
  type = "text",
  inputMode,
  min,
  max,
  autoComplete = "off",
  className,
  inputClassName,
  labelClassName,
  compact = false,
  onBlur,
  confirmLabel,
}: ConfirmableFieldInputProps) {
  const generatedId = useId();
  const inputId = idProp ?? generatedId;
  const trimmedCommitted = committedValue?.trim() || "";
  const trimmedDraft = value.trim();
  const isCommitted =
    trimmedCommitted.length > 0 && trimmedDraft === trimmedCommitted;
  const hasCommitted = trimmedCommitted.length > 0;
  const actionLabel = hasCommitted && !isCommitted ? "Actualizar" : "Agregar";
  const [justConfirmed, setJustConfirmed] = useState(false);

  useEffect(() => {
    if (!justConfirmed) return;
    const timer = window.setTimeout(() => setJustConfirmed(false), 1600);
    return () => window.clearTimeout(timer);
  }, [justConfirmed]);

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm();
    setJustConfirmed(true);
  }

  return (
    <div className={joinClasses("min-w-0 space-y-1.5", compact && "space-y-1", className)}>
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={inputId}
          className={joinClasses(
            "text-xs font-semibold text-muted",
            !compact && "text-sm",
            compact && "text-[11px]",
            labelClassName,
          )}
        >
          {label}
        </label>
        {isCommitted || justConfirmed ? (
          <span
            data-criteria-added
            className={joinClasses(
              "inline-flex items-center gap-1 text-[10px] font-semibold text-primary-dark",
              compact && "text-[9px]",
            )}
            aria-live="polite"
          >
            <svg viewBox="0 0 16 16" fill="none" className="size-3" aria-hidden>
              <path
                d="M3.5 8.5 6.5 11.5 12.5 4.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Agregado
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 items-center gap-1.5">
        <input
          id={inputId}
          type={type}
          min={min}
          max={max}
          inputMode={inputMode}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => {
            setJustConfirmed(false);
            onChange(event.target.value);
          }}
          onBlur={onBlur}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleConfirm();
            }
          }}
          className={joinClasses(
            "h-11 min-w-0 flex-1 rounded-xl border-0 bg-white px-3 text-sm text-primary-dark shadow-sm ring-1 ring-border/80 placeholder:text-primary-dark/45 focus:ring-2 focus:ring-primary/40",
            !compact && "h-12 text-base",
            isCommitted && "ring-primary/35",
            compact && "max-md:h-9 max-md:rounded-lg max-md:px-2.5 max-md:text-xs",
            inputClassName,
          )}
        />
        {isCommitted ? (
          <span
            data-criteria-committed-icon
            className={joinClasses(
              "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-dark",
              !compact && "h-12 w-12",
              compact && "max-md:h-9 max-md:w-9 max-md:rounded-lg",
            )}
            title="Dato agregado al cálculo"
            aria-hidden
          >
            <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden>
              <path
                d="M3.5 8.5 6.5 11.5 12.5 4.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        ) : (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            data-criteria-add
            aria-label={confirmLabel ?? `${actionLabel} ${label.toLowerCase()}`}
            className={joinClasses(
              touchTarget,
              "h-11 shrink-0 rounded-md px-3.5 text-xs font-bold transition disabled:cursor-not-allowed",
              !compact && "h-12 px-4 text-sm",
              compact && "max-md:h-9 max-md:rounded-md max-md:px-2.5 max-md:text-[11px]",
              canConfirm
                ? "bg-secondary text-primary-dark shadow-sm hover:brightness-105"
                : "border border-white/50 bg-white/70 text-primary-dark",
            )}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
