"use client";

import { useCallback } from "react";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { AnimatePresence, motion } from "framer-motion";
import { BeneficiariesForm } from "@/components/beneficiaries";
import { usePlanClinicOptions } from "@/hooks/use-plan-clinic-options";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { createClearedDashboardFilters } from "@/domain";
import { touchTarget, filtersSidebarDesktopShell, filtersSidebarScrollBody, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type {
  BeneficiaryGroupSummary,
  FamilyBeneficiariesState,
} from "@/domain";
import type { DashboardFiltersState } from "@/domain";
import { DashboardFiltersPanel } from "./dashboard-filters-panel";

export interface FiltersSidebarProps {
  open: boolean;
  onClose: () => void;
  /** Reabre el panel (desktop tras “Ocultar”). */
  onOpen?: () => void;
  beneficiaries: FamilyBeneficiariesState;
  onBeneficiariesChange: (
    next: FamilyBeneficiariesState,
    summary: BeneficiaryGroupSummary,
  ) => void;
  filters: DashboardFiltersState;
  onFiltersChange: (next: DashboardFiltersState) => void;
  priceMin: number;
  priceMax: number;
  ufToClp: number;
  onPriceMinChange: (value: number) => void;
  onPriceMaxChange: (value: number) => void;
  defaultPriceMin?: number;
  defaultPriceMax?: number;
  /** Oculta textos de ayuda en beneficiarios y filtros. */
  hideHelperText?: boolean;
  /** Estilo reforzado para el panel ejecutivo. */
  executiveVisual?: boolean;
  /** Búsqueda de planes (opcional; p. ej. cotizador ejecutivo). */
  search?: string;
  onSearchChange?: (value: string) => void;
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

export function FiltersSidebar({
  open,
  onClose,
  onOpen,
  beneficiaries,
  onBeneficiariesChange,
  filters,
  onFiltersChange,
  priceMin,
  priceMax,
  ufToClp,
  onPriceMinChange,
  onPriceMaxChange,
  defaultPriceMin,
  defaultPriceMax,
  hideHelperText = false,
  executiveVisual = false,
  search,
  onSearchChange,
}: FiltersSidebarProps) {
  const isLargeScreen = useIsLargeScreen();
  const showPlanSearch =
    typeof search === "string" && typeof onSearchChange === "function";
  const {
    options: clinicOptions,
    loading: clinicOptionsLoading,
    error: clinicOptionsError,
  } = usePlanClinicOptions(true);

  useScrollLock(open && !isLargeScreen);

  const handleClearSidebarFilters = useCallback(() => {
    onFiltersChange(createClearedDashboardFilters());

    if (defaultPriceMin !== undefined && defaultPriceMax !== undefined) {
      onPriceMinChange(defaultPriceMin);
      onPriceMaxChange(defaultPriceMax);
    }

    onSearchChange?.("");
  }, [
    defaultPriceMax,
    defaultPriceMin,
    onFiltersChange,
    onPriceMaxChange,
    onPriceMinChange,
    onSearchChange,
  ]);

  /** Desktop oculto: riel compacto para volver a mostrar (después de todos los hooks). */
  if (isLargeScreen && !open) {
    return (
      <div
        className={joinClasses(
          filtersSidebarDesktopShell,
          "flex w-12 max-w-none shrink-0 flex-col border-r bg-white",
          executiveVisual
            ? "border-[color:color-mix(in_srgb,var(--dash-navy)_25%,var(--border))] lg:shadow-[8px_0_28px_-16px_rgb(9_37_88/0.14)]"
            : ui.border,
        )}
      >
        <button
          type="button"
          onClick={() => onOpen?.()}
          className={joinClasses(
            "flex flex-1 flex-col items-center gap-3 px-1.5 py-4 text-[10px] font-bold transition",
            executiveVisual
              ? "bg-[color:var(--dash-navy)] text-white hover:bg-[color:color-mix(in_srgb,var(--dash-navy)_88%,black)]"
              : "text-primary-dark hover:bg-primary/5",
          )}
          aria-label="Mostrar filtros y beneficiarios"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="size-4 shrink-0"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden
          >
            <path d="M4 7h16M4 12h10M4 17h16" strokeLinecap="round" />
          </svg>
          <span className="[writing-mode:vertical-rl] rotate-180 tracking-wide">
            Mostrar filtros
          </span>
        </button>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.button
            key="sidebar-backdrop"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-label="Cerrar panel de filtros"
            className="fixed inset-0 z-40 bg-primary-dark/20 backdrop-blur-[2px] lg:hidden"
            onClick={onClose}
          />
        ) : null}
      </AnimatePresence>

      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label="Panel de filtros"
        initial={false}
        animate={{
          x: isLargeScreen ? 0 : open ? 0 : "-100%",
        }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className={joinClasses(
          "fixed inset-y-0 left-0 z-50 flex w-full max-w-full flex-col overflow-hidden border-r shadow-xl",
          "lg:w-80 lg:max-w-[20rem] lg:shrink-0 lg:translate-x-0 lg:shadow-none",
          filtersSidebarDesktopShell,
          executiveVisual
            ? "border-[color:color-mix(in_srgb,var(--dash-navy)_25%,var(--border))] bg-white lg:shadow-[8px_0_28px_-16px_rgb(9_37_88/0.14)]"
            : joinClasses("bg-white", ui.border),
          !open && "pointer-events-none",
          open ? "lg:flex" : "lg:hidden",
        )}
        data-executive-filters={executiveVisual ? "true" : undefined}
      >
        <div className="flex h-full min-h-0 w-full flex-col lg:max-h-[inherit]">
          <div
            className={joinClasses(
              "flex shrink-0 items-center justify-between border-b px-4 py-3.5 sm:px-5 lg:px-5",
              executiveVisual
                ? "border-[color:color-mix(in_srgb,var(--dash-cyan)_35%,transparent)] bg-[color:var(--dash-navy)]"
                : joinClasses("bg-white py-4", ui.border),
            )}
          >
            <div className="min-w-0">
              <p
                className={joinClasses(
                  "text-sm font-bold tracking-tight",
                  executiveVisual ? "text-white" : "text-primary-dark",
                )}
              >
                Filtros y beneficiarios
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={joinClasses(
                  "inline-flex rounded-md transition lg:hidden",
                  touchTarget,
                  executiveVisual
                    ? "text-white/80 hover:bg-white/10 hover:text-white"
                    : joinClasses("text-muted", ui.hoverSurface),
                )}
                aria-label="Cerrar filtros"
              >
                <CloseIcon />
              </button>
              <button
                type="button"
                onClick={onClose}
                className={joinClasses(
                  "hidden rounded-md px-3 text-xs font-medium transition lg:inline-flex",
                  touchTarget,
                  executiveVisual
                    ? "text-white/80 hover:bg-white/10 hover:text-white"
                    : joinClasses("text-muted", ui.hoverSurface),
                )}
              >
                Ocultar
              </button>
            </div>
          </div>

          <div
            className={joinClasses(
              filtersSidebarScrollBody,
              "px-4 sm:px-5",
              executiveVisual ? "py-0" : "py-2",
            )}
          >
            <div
              className={joinClasses(
                executiveVisual ? "divide-y divide-border/40" : "divide-y divide-border/50",
              )}
            >
              <BeneficiariesForm
                value={beneficiaries}
                onChange={onBeneficiariesChange}
                hideHelperText={hideHelperText}
                executiveVisual={executiveVisual}
                className={joinClasses(
                  executiveVisual
                    ? "!rounded-none !border-0 !bg-transparent !p-0 !py-4 !shadow-none"
                    : "!rounded-none !border-0 !bg-transparent !p-0 !py-4 !shadow-none sm:!py-5",
                )}
              />

              {showPlanSearch ? (
                <div
                  className={joinClasses(
                    "space-y-2",
                    executiveVisual ? "py-4" : "py-4 sm:py-5",
                  )}
                >
                  <label
                    htmlFor="sidebar-plan-search"
                    className={joinClasses(
                      "block text-xs font-semibold",
                      executiveVisual ? "text-primary-dark" : "text-muted",
                    )}
                  >
                    Buscar planes
                  </label>
                  <div className="relative">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted/60"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden
                    >
                      <circle cx="11" cy="11" r="7" />
                      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
                    </svg>
                    <input
                      id="sidebar-plan-search"
                      type="search"
                      value={search}
                      onChange={(event) => onSearchChange(event.target.value)}
                      placeholder="Nombre, código o Isapre..."
                      className={joinClasses(
                        "h-11 w-full rounded-lg py-2 pl-10 pr-3 text-sm",
                        ui.input,
                      )}
                    />
                  </div>
                </div>
              ) : null}

              <div className={executiveVisual ? undefined : "py-2"}>
                <DashboardFiltersPanel
                  value={filters}
                  onChange={onFiltersChange}
                  showClinicFilter
                  clinicOptions={clinicOptions}
                  clinicOptionsLoading={clinicOptionsLoading}
                  clinicOptionsError={clinicOptionsError}
                  priceMin={priceMin}
                  priceMax={priceMax}
                  ufToClp={ufToClp}
                  onPriceMinChange={onPriceMinChange}
                  onPriceMaxChange={onPriceMaxChange}
                  defaultPriceMin={defaultPriceMin}
                  defaultPriceMax={defaultPriceMax}
                  hideHelperText={hideHelperText}
                  executiveVisual={executiveVisual}
                  showClearAction={false}
                />
              </div>

              <div
                className={joinClasses(
                  "border-t",
                  executiveVisual
                    ? "border-border/40 py-4"
                    : "border-border/50 py-4 sm:py-5",
                )}
              >
                <button
                  type="button"
                  onClick={handleClearSidebarFilters}
                  className={joinClasses(
                    "inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-600 bg-red-600 px-4 text-xs font-semibold text-white transition hover:border-red-700 hover:bg-red-700",
                    touchTarget,
                  )}
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
