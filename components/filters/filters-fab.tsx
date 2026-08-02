"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

export interface FiltersFabProps {
  visible: boolean;
  onClick: () => void;
  activeFilterCount?: number;
  compactEmbed?: boolean;
  /**
   * Altura extra a sumar al `bottom` (p. ej. barra de selección).
   * Acepta cualquier valor CSS de longitud (`12rem`, `148px`, `var(--selection-bar-height)`).
   * Sin valor, el FAB usa la posición original.
   */
  bottomOffset?: string;
}

export function FiltersFab({
  visible,
  onClick,
  activeFilterCount,
  compactEmbed = false,
  bottomOffset,
}: FiltersFabProps) {
  const elevated = Boolean(bottomOffset?.trim());
  const baseGap = compactEmbed ? "1rem" : "1.25rem";

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.85, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 12 }}
          transition={{ type: "spring", stiffness: 400, damping: 26 }}
          onClick={onClick}
          aria-label="Abrir filtros y beneficiarios"
          style={
            elevated
              ? {
                  bottom: `max(${baseGap}, calc(env(safe-area-inset-bottom, 0px) + ${bottomOffset} + ${baseGap}))`,
                }
              : undefined
          }
          className={joinClasses(
            "fixed left-[max(1.25rem,env(safe-area-inset-left))] z-40 inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-full px-5 shadow-[0_8px_28px_-6px_var(--primary)] lg:hidden",
            !elevated &&
              "bottom-[max(1.25rem,env(safe-area-inset-bottom))]",
            compactEmbed &&
              "max-md:left-[max(1rem,env(safe-area-inset-left))] max-md:min-h-10 max-md:min-w-10 max-md:px-3.5",
            compactEmbed &&
              !elevated &&
              "max-md:bottom-[max(1rem,env(safe-area-inset-bottom))]",
            ui.cta,
          )}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className={joinClasses(
              "size-5 shrink-0",
              compactEmbed && "max-md:size-4",
            )}
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden
          >
            <path
              d="M4 7h16M4 12h10M4 17h16"
              strokeLinecap="round"
            />
          </svg>
          <span
            className={joinClasses(
              "text-sm font-bold",
              compactEmbed && "max-md:text-xs",
            )}
          >
            Filtros
          </span>
          {activeFilterCount && activeFilterCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-warning text-[10px] font-bold text-warning-foreground">
              {activeFilterCount}
            </span>
          ) : null}
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
