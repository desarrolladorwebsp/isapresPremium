"use client";

import { useScrollLock } from "@/hooks/use-scroll-lock";
import { AnimatePresence, motion } from "framer-motion";
import { DashboardFiltersPanel } from "@/components/filters/dashboard-filters-panel";
import { usePlanClinicOptions } from "@/hooks/use-plan-clinic-options";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { touchTarget, filtersSidebarDesktopShell, filtersSidebarScrollBody } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { DashboardFiltersState } from "@/domain";

export interface PublicFiltersSidebarProps {
  open: boolean;
  onClose: () => void;
  priceMin: number;
  priceMax: number;
  ufToClp: number;
  onPriceMinChange: (value: number) => void;
  onPriceMaxChange: (value: number) => void;
  filters: DashboardFiltersState;
  onFiltersChange: (next: DashboardFiltersState) => void;
  hideCoverageFilter?: boolean;
  hidePlanTypeFilter?: boolean;
  showClinicFilter?: boolean;
  /** Vista compacta para widget embebido en móvil. */
  compactEmbed?: boolean;
  defaultPriceMin?: number;
  defaultPriceMax?: number;
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

export function PublicFiltersSidebar({
  open,
  onClose,
  priceMin,
  priceMax,
  ufToClp,
  onPriceMinChange,
  onPriceMaxChange,
  filters,
  onFiltersChange,
  hideCoverageFilter = false,
  hidePlanTypeFilter = false,
  showClinicFilter = false,
  compactEmbed = false,
  defaultPriceMin,
  defaultPriceMax,
}: PublicFiltersSidebarProps) {
  const isLargeScreen = useIsLargeScreen();
  const {
    options: clinicOptions,
    loading: clinicOptionsLoading,
    error: clinicOptionsError,
  } = usePlanClinicOptions(showClinicFilter);

  useScrollLock(open && !isLargeScreen);

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
            aria-label="Cerrar filtros"
            className="fixed inset-0 z-40 bg-primary-dark/20 backdrop-blur-[2px] lg:hidden"
            onClick={onClose}
          />
        ) : null}
      </AnimatePresence>

      <motion.aside
        role="dialog"
        aria-modal={open ? "true" : undefined}
        aria-hidden={open ? undefined : true}
        aria-label="Filtros de búsqueda"
        data-filters-panel
        initial={false}
        animate={{ x: isLargeScreen ? 0 : open ? 0 : "-100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className={joinClasses(
          "fixed inset-y-0 left-0 z-50 flex w-full max-w-full flex-col overflow-hidden border-r shadow-xl",
          "bg-white text-foreground",
          compactEmbed
            ? "max-md:max-w-[min(100%,20rem)] lg:static lg:z-20 lg:h-auto lg:max-h-none lg:w-52 lg:max-w-[13rem] lg:shrink-0 lg:translate-x-0 lg:overflow-visible lg:rounded-lg lg:border lg:shadow-sm"
            : joinClasses(
                "lg:w-72 lg:max-w-[18rem] lg:shrink-0 lg:translate-x-0 lg:overflow-visible lg:rounded-lg lg:border lg:shadow-sm",
                filtersSidebarDesktopShell,
              ),
          !open && "pointer-events-none lg:pointer-events-auto",
          open ? "lg:flex" : "lg:hidden",
        )}
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex h-full min-h-0 w-full flex-col lg:max-h-[inherit]">
          <div
            data-filters-header
            className={joinClasses(
              "flex shrink-0 items-center justify-between border-b px-4 py-4",
              compactEmbed && "max-md:px-3 max-md:py-2.5",
            )}
          >
            <p
              data-filters-title
              className={joinClasses(
                "text-sm font-bold",
                compactEmbed && "max-md:text-xs",
              )}
            >
              Filtros
            </p>
            <button
              type="button"
              onClick={onClose}
              data-filters-close
              className={joinClasses("rounded-lg lg:hidden", touchTarget)}
              aria-label="Cerrar"
            >
              <CloseIcon />
            </button>
          </div>

          <div
            className={joinClasses(
              filtersSidebarScrollBody,
              "px-4 py-2",
              compactEmbed && "max-md:px-3 max-md:py-1",
            )}
          >
            <DashboardFiltersPanel
              value={filters}
              onChange={onFiltersChange}
              hideCoverageFilter={hideCoverageFilter}
              hidePlanTypeFilter={hidePlanTypeFilter}
              showClinicFilter={showClinicFilter}
              compactEmbed={compactEmbed}
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
            />
          </div>
        </div>
      </motion.aside>
    </>
  );
}
