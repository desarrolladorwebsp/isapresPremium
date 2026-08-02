import { touchRow } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { FilterOption } from "@/domain";

export interface FilterCheckboxListProps {
  options: FilterOption[];
  state: Record<string, boolean>;
  idPrefix: string;
  onToggle: (optionId: string, checked: boolean) => void;
  scrollable?: boolean;
  className?: string;
  compactEmbed?: boolean;
  executiveVisual?: boolean;
}

export function FilterCheckboxList({
  options,
  state,
  idPrefix,
  onToggle,
  scrollable = false,
  className,
  compactEmbed = false,
  executiveVisual = false,
}: FilterCheckboxListProps) {
  return (
    <div
      className={joinClasses(
        "space-y-0.5",
        scrollable && "max-h-52 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]",
        compactEmbed && scrollable && "max-md:max-h-36",
        className,
      )}
    >
      {options.map((option) => {
        const inputId = `${idPrefix}-${option.id}`;

        return (
          <label
            key={option.id}
            htmlFor={inputId}
            data-filter-option={state[option.id] ? "active" : "idle"}
            className={joinClasses(
              "flex w-full cursor-pointer items-center gap-2.5 rounded-md text-sm text-foreground transition",
              executiveVisual ? "px-1 py-1.5 hover:bg-surface-hover/70" : joinClasses(touchRow, "hover:bg-surface-hover/70"),
              compactEmbed && "max-md:gap-2 max-md:text-xs",
            )}
          >
            <input
              id={inputId}
              type="checkbox"
              checked={Boolean(state[option.id])}
              onChange={(event) => onToggle(option.id, event.target.checked)}
              className={joinClasses(
                "size-5 shrink-0 rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 md:size-4",
                compactEmbed && "max-md:size-4",
              )}
            />
            <span
              className={joinClasses(
                "flex flex-1 items-center leading-snug",
                !executiveVisual && "min-h-12 md:min-h-0",
                compactEmbed && !executiveVisual && "max-md:min-h-9",
              )}
            >
              {option.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
