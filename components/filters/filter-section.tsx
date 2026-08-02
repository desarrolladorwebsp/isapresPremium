"use client";

import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import { FilterInfoTip } from "./filter-info-tip";

export interface FilterSectionProps {
  title: string;
  description?: string;
  infoLabel?: string;
  info?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Oculta descripciones y reduce padding en widget móvil. */
  compactEmbed?: boolean;
  /** Oculta el texto descriptivo bajo el título de la sección. */
  hideDescription?: boolean;
  /** Tarjeta con borde acentuado (panel ejecutivo). */
  executiveVisual?: boolean;
  /** Acento de color en cabecera del filtro (panel ejecutivo). */
  executiveAccent?: "primary" | "secondary" | "neutral";
}

const executiveHeaderAccentClass: Record<
  NonNullable<FilterSectionProps["executiveAccent"]>,
  string
> = {
  primary:
    "border-l-[3px] border-l-[color:var(--dash-royal,#0d6dee)] bg-[color:color-mix(in_srgb,var(--dash-royal,#0d6dee)_10%,white)] text-[color:var(--dash-navy,#092558)] shadow-sm ring-1 ring-[color:color-mix(in_srgb,var(--dash-royal,#0d6dee)_18%,transparent)]",
  secondary:
    "border-l-[3px] border-l-[color:var(--dash-cyan,#1ac9ea)] bg-[color:color-mix(in_srgb,var(--dash-cyan,#1ac9ea)_12%,white)] text-[color:var(--dash-navy,#092558)] shadow-sm ring-1 ring-[color:color-mix(in_srgb,var(--dash-cyan,#1ac9ea)_22%,transparent)]",
  neutral:
    "border-l-[3px] border-l-[color:color-mix(in_srgb,var(--dash-navy,#092558)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--dash-navy,#092558)_6%,white)] text-[color:var(--dash-navy,#092558)] shadow-sm ring-1 ring-[color:color-mix(in_srgb,var(--dash-navy,#092558)_12%,transparent)]",
};

export function FilterSection({
  title,
  description,
  infoLabel,
  info,
  children,
  className,
  compactEmbed = false,
  hideDescription = false,
  executiveVisual = false,
  executiveAccent = "primary",
}: FilterSectionProps) {
  return (
    <section
      className={joinClasses(
        "min-w-0 py-4",
        compactEmbed && "max-md:py-3",
        className,
      )}
    >
      <header
        className={joinClasses(
          "mb-2.5 space-y-0.5",
          compactEmbed && "max-md:mb-2",
          executiveVisual &&
            joinClasses(
              "mb-3 rounded-lg px-2.5 py-2",
              executiveHeaderAccentClass[executiveAccent],
            ),
        )}
      >
        <div className="flex items-center gap-1.5">
          <h2
            className={joinClasses(
              compactEmbed && "max-md:text-[11px]",
              executiveVisual
                ? "text-xs font-bold uppercase tracking-wide"
                : joinClasses(
                    "text-[13px] font-bold tracking-tight",
                    ui.sectionTitle,
                  ),
            )}
          >
            {title}
          </h2>
          {info ? (
            <FilterInfoTip label={infoLabel ?? `Más información: ${title}`}>
              {info}
            </FilterInfoTip>
          ) : null}
        </div>
        {description && !hideDescription ? (
          <p
            className={joinClasses(
              "text-[11px] leading-relaxed",
              executiveVisual ? "text-current/70" : "text-muted",
              compactEmbed && "max-md:hidden",
            )}
          >
            {description}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
