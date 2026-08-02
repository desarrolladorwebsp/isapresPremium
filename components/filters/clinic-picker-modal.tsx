"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { createPortal } from "react-dom";
import type { PlanCatalogClinicOption } from "@/lib/api/plan-clinics";
import { textIncludesSearch } from "@/lib/normalize-search-text";
import { touchTarget, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

export interface ClinicPickerModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  options: PlanCatalogClinicOption[];
  value: string[];
  onApply: (clinicIds: string[]) => void;
  loading?: boolean;
}

type PortalThemeScope =
  | { kind: "premium"; variant: string }
  | { kind: "brand"; brand: string }
  | null;

/**
 * El modal se porta a `document.body` y sale del árbol con `data-premium-surface`
 * / `data-brand`. Sin reaplicar el scope, cae a la paleta verde de `:root`.
 */
function resolvePortalThemeScope(): PortalThemeScope {
  if (typeof document === "undefined") return null;

  const premium = document.querySelector("[data-premium-surface]");
  if (premium) {
    return {
      kind: "premium",
      variant: premium.getAttribute("data-premium-variant") || "dashboard",
    };
  }

  const brandHost =
    document.querySelector("[data-brand]") ?? document.documentElement;
  const brand = brandHost.getAttribute("data-brand");
  if (brand) return { kind: "brand", brand };

  return null;
}

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

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M20 20l-3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-3.5" aria-hidden>
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ClinicPickerModal({
  open,
  onClose,
  title,
  options,
  value,
  onApply,
  loading = false,
}: ClinicPickerModalProps) {
  const [query, setQuery] = useState("");
  const [draftSelection, setDraftSelection] = useState<string[]>(value);
  const [mounted, setMounted] = useState(false);
  const [themeScope, setThemeScope] = useState<PortalThemeScope>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setDraftSelection(value);
    setThemeScope(resolvePortalThemeScope());
    const timer = window.setTimeout(() => searchRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [open, value]);

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return options;

    return options.filter(
      (option) =>
        textIncludesSearch(option.name, normalizedQuery) ||
        textIncludesSearch(option.id, normalizedQuery),
    );
  }, [options, query]);

  const selectedSet = useMemo(
    () => new Set(draftSelection),
    [draftSelection],
  );

  function toggleClinic(clinicId: string) {
    setDraftSelection((current) =>
      current.includes(clinicId)
        ? current.filter((id) => id !== clinicId)
        : [...current, clinicId],
    );
  }

  function handleClearDraft() {
    setDraftSelection([]);
  }

  function handleApply() {
    onApply(draftSelection);
    onClose();
  }

  if (!mounted || !open) return null;

  const portalThemeProps =
    themeScope?.kind === "premium"
      ? {
          "data-premium-surface": true as const,
          "data-premium-variant": themeScope.variant,
        }
      : themeScope?.kind === "brand"
        ? { "data-brand": themeScope.brand }
        : {};

  return createPortal(
    <div
      {...portalThemeProps}
      className={joinClasses(
        "fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4",
        themeScope?.kind === "premium" && "premium-surface-root",
      )}
    >
      <button
        type="button"
        className="absolute inset-0 bg-primary-dark/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Cerrar selector de prestador"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="clinic-picker-modal-title"
        className={joinClasses(
          "relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl",
          ui.border,
        )}
      >
        <div className="shrink-0 bg-primary-dark px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="clinic-picker-modal-title"
                className="text-base font-bold leading-snug text-white sm:text-lg"
              >
                {title}
              </h2>
              <p className="mt-1 text-xs text-white/70">
                Puedes elegir una o más clínicas. Si seleccionas varias, los
                planes deben incluir todas las seleccionadas.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={joinClasses(
                "shrink-0 rounded-lg text-white/75 transition hover:bg-white/10 hover:text-white",
                touchTarget,
              )}
              aria-label="Cerrar"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="relative mt-3 sm:mt-4">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/55">
              <SearchIcon />
            </span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar prestador…"
              disabled={loading}
              autoComplete="off"
              className="h-11 w-full rounded-lg border border-white/15 bg-white/12 pl-10 pr-4 text-sm text-white placeholder:text-white/50 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/25"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-bg-layout/70 p-3 sm:p-5">
          {loading ? (
            <p className="py-16 text-center text-sm text-muted">
              Cargando prestadores…
            </p>
          ) : filteredOptions.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">
              No hay prestadores que coincidan con tu búsqueda.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filteredOptions.map((option, index) => {
                const isSelected = selectedSet.has(option.id);

                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleClinic(option.id)}
                    className={joinClasses(
                      "group relative flex min-h-[4.75rem] flex-col items-center justify-center rounded-lg border bg-white px-2 py-3 text-center text-xs font-medium leading-snug text-foreground transition sm:min-h-[5rem] sm:text-[13px]",
                      ui.borderHairline,
                      "hover:border-primary hover:shadow-sm hover:ring-2 hover:ring-primary/20",
                      isSelected &&
                        "border-primary bg-primary/20 font-semibold text-primary-dark ring-2 ring-primary/40 shadow-sm",
                    )}
                  >
                    <span className="absolute right-1.5 top-1 text-[10px] tabular-nums text-muted/45">
                      {index + 1}
                    </span>
                    {isSelected ? (
                      <span className="absolute left-1.5 top-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <CheckIcon />
                      </span>
                    ) : null}
                    <span className="line-clamp-3 px-1">{option.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div
          className={joinClasses(
            "flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-white px-4 py-3 sm:px-6",
            ui.borderHairline,
          )}
        >
          <p className="text-xs text-muted">
            {draftSelection.length === 0
              ? "Ningún prestador seleccionado"
              : `${draftSelection.length} prestador${draftSelection.length === 1 ? "" : "es"} seleccionado${draftSelection.length === 1 ? "" : "s"}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleClearDraft}
              disabled={draftSelection.length === 0}
              className={joinClasses(
                "rounded-lg px-3 text-xs font-semibold text-muted transition hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
                touchTarget,
              )}
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={handleApply}
              className={joinClasses(
                "rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground transition hover:bg-primary-hover",
                touchTarget,
              )}
            >
              Aplicar
              {draftSelection.length > 0 ? ` (${draftSelection.length})` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
