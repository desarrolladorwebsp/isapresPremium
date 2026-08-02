"use client";

import { REGION_OPTIONS } from "@/lib/quote-criteria-options";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

export interface RegionFilterSelectProps {
  id?: string;
  value: string;
  onChange: (region: string) => void;
  className?: string;
  labelClassName?: string;
  selectClassName?: string;
  compact?: boolean;
}

export function RegionFilterSelect({
  id = "filter-region",
  value,
  onChange,
  className,
  labelClassName,
  selectClassName,
  compact = false,
}: RegionFilterSelectProps) {
  return (
    <div className={joinClasses("space-y-1.5", className)}>
      <label
        htmlFor={id}
        className={joinClasses(
          "text-xs font-semibold text-muted",
          compact && "text-[11px]",
          labelClassName,
        )}
      >
        Región
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={joinClasses(
          "h-11 w-full rounded-md border-0 bg-white px-3 text-sm shadow-sm ring-1 ring-border/80 focus:ring-2 focus:ring-primary/40",
          compact && "h-9 rounded-md px-2.5 text-xs",
          ui.input,
          selectClassName,
        )}
      >
        <option value="">Selecciona...</option>
        {REGION_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
