"use client";

import { useMemo } from "react";
import { joinClasses } from "@/lib/utils";
import type { CoverageEntry } from "@/domain";

export interface CoverageColumnCompactProps {
  title: string;
  icon: React.ReactNode;
  entries: CoverageEntry[];
  /** Porcentajes del resumen cuando aún no hay detalle por clínica. */
  fallbackPercentages?: number[];
  barClassName: string;
  percentClassName: string;
  headerClassName?: string;
  badgeClassName?: string;
  sectionClassName?: string;
  showDivider?: boolean;
  /** Resalta las clínicas activas en el filtro (si aplica). */
  highlightClinicIds?: string[];
}

function resolveMaxPercentage(
  entries: CoverageEntry[],
  fallbackPercentages: number[],
): number {
  if (entries.length > 0) {
    return Math.max(...entries.map((entry) => entry.percentage));
  }
  if (fallbackPercentages.length > 0) {
    return Math.max(...fallbackPercentages);
  }
  return 0;
}

function CoverageSummaryBar({
  percentage,
  barClassName,
}: {
  percentage: number;
  barClassName: string;
}) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/90">
      <div
        className={joinClasses("h-full rounded-full transition-[width] duration-500", barClassName)}
        style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
      />
    </div>
  );
}

export function CoverageColumnCompact({
  title,
  icon,
  entries,
  fallbackPercentages = [],
  barClassName,
  percentClassName,
  headerClassName = "text-muted",
  badgeClassName = "bg-surface-hover text-foreground/80",
  sectionClassName,
  showDivider = false,
  highlightClinicIds = [],
}: CoverageColumnCompactProps) {
  const maxPercentage = useMemo(
    () => resolveMaxPercentage(entries, fallbackPercentages),
    [entries, fallbackPercentages],
  );

  const highlightSet = useMemo(
    () => new Set(highlightClinicIds),
    [highlightClinicIds],
  );

  const visibleEntries = useMemo(() => {
    if (highlightSet.size === 0) return entries;

    const highlighted = entries.filter((entry) =>
      highlightSet.has(entry.clinic_id),
    );
    const rest = entries.filter((entry) => !highlightSet.has(entry.clinic_id));
    return [...highlighted, ...rest];
  }, [entries, highlightSet]);

  return (
    <section
      className={joinClasses(
        "flex min-w-0 flex-1 flex-col px-3.5 py-3 sm:px-4 sm:py-3.5",
        showDivider && "border-border md:border-r",
        sectionClassName,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={joinClasses("shrink-0", headerClassName)} aria-hidden>
            {icon}
          </span>
          <h4
            className={joinClasses(
              "truncate text-[10px] font-bold uppercase tracking-[0.1em] sm:text-[11px]",
              headerClassName,
            )}
          >
            {title}
          </h4>
        </div>
        <span
          className={joinClasses(
            "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums sm:text-xs",
            badgeClassName,
          )}
        >
          {maxPercentage > 0 ? `${maxPercentage}%` : "—"}
        </span>
      </div>

      <CoverageSummaryBar percentage={maxPercentage} barClassName={barClassName} />

      <ul className="mt-2 space-y-0.5">
        {visibleEntries.length > 0 ? (
          visibleEntries.map((entry, index) => {
            const isHighlighted = highlightSet.has(entry.clinic_id);

            return (
              <li
                key={`${entry.type}-${entry.clinic_id}-${entry.percentage}-${index}`}
                className={joinClasses(
                  "text-[11px] leading-relaxed sm:text-xs",
                  isHighlighted
                    ? "rounded-md border border-primary/35 bg-primary/10 px-2 py-1.5 font-medium text-primary-dark shadow-sm ring-1 ring-primary/15"
                    : "truncate text-foreground/85",
                )}
              >
                <span className={joinClasses("font-bold tabular-nums", percentClassName)}>
                  {entry.percentage}%
                </span>{" "}
                <span className={joinClasses(isHighlighted && "font-semibold")}>
                  {entry.clinic_name}
                </span>
                {isHighlighted ? (
                  <span className="ml-1.5 inline-flex rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary-foreground">
                    Filtrada
                  </span>
                ) : null}
              </li>
            );
          })
        ) : (
          <li className="text-[11px] text-muted sm:text-xs">
            {entries.length === 0 && fallbackPercentages.length > 0
              ? `Coberturas ${fallbackPercentages.map((value) => `${value}%`).join(" · ")}`
              : "Sin prestadores cargados"}
          </li>
        )}
      </ul>
    </section>
  );
}
