"use client";

import { COVERAGE_PERCENTAGE_OPTIONS } from "@/domain";
import {
  percentageToneActiveClass,
  type PercentageTone,
  touchTarget,
  ui,
} from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { CoveragePercentageOption } from "@/domain";

export interface CoveragePercentageFilterProps {
  title: string;
  value: CoveragePercentageOption | null;
  tone?: PercentageTone;
  onChange: (value: CoveragePercentageOption | null) => void;
  compactEmbed?: boolean;
}

const percentButtonClass = joinClasses(
  touchTarget,
  "h-10 w-full rounded-md border text-xs font-bold tabular-nums transition md:h-9 md:min-h-0 md:min-w-0",
);

export function CoveragePercentageFilter({
  title,
  value,
  tone = "neutral",
  onChange,
  compactEmbed = false,
}: CoveragePercentageFilterProps) {
  const isAllActive = value === null;
  const activeClass = percentageToneActiveClass[tone];

  return (
    <div
      className={joinClasses(
        "space-y-2.5",
        compactEmbed && "max-md:space-y-2",
      )}
    >
      <p
        className={joinClasses(
          "text-xs font-semibold text-primary-dark/80",
          compactEmbed && "max-md:text-[11px]",
        )}
      >
        {title}
      </p>

      <div
        data-coverage-chip-group
        className="grid grid-cols-4 gap-1.5 rounded-md border border-border bg-white p-1.5"
      >
        <button
          type="button"
          onClick={() => onChange(null)}
          data-filter-chip
          data-filter-tone={tone}
          className={joinClasses(
            "col-span-4",
            percentButtonClass,
            isAllActive
              ? activeClass
              : joinClasses("border border-border text-muted", ui.hoverSurface),
          )}
          aria-pressed={isAllActive}
        >
          Todos
        </button>

        {COVERAGE_PERCENTAGE_OPTIONS.map((percent) => {
          const isActive = value === percent;

          return (
            <button
              key={percent}
              type="button"
              onClick={() => onChange(percent)}
              data-filter-chip
              data-filter-tone={tone}
              className={joinClasses(
                percentButtonClass,
                isActive
                  ? activeClass
                  : joinClasses(
                      "border border-border text-foreground/75",
                      ui.hoverSurface,
                    ),
              )}
              aria-pressed={isActive}
              aria-label={`Filtrar ${percent}%`}
            >
              {percent}%
            </button>
          );
        })}
      </div>
    </div>
  );
}
