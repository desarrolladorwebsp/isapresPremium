import {
  percentageToneActiveClass,
  type PercentageTone,
} from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

type PercentagePillSize = "sm" | "md" | "lg";

export interface PercentagePillProps {
  value: number;
  tone?: PercentageTone;
  size?: PercentagePillSize;
  className?: string;
}

const sizeStyles: Record<PercentagePillSize, string> = {
  sm: "min-w-[2.25rem] px-1.5 py-0.5 text-[10px]",
  md: "min-w-[2.75rem] px-2 py-0.5 text-xs",
  lg: "min-w-[3.25rem] px-2.5 py-1 text-sm font-bold",
};

export function PercentagePill({
  value,
  tone = "neutral",
  size = "md",
  className,
}: PercentagePillProps) {
  return (
    <span
      className={joinClasses(
        "inline-flex shrink-0 items-center justify-center rounded-full border font-semibold tabular-nums tracking-tight",
        percentageToneActiveClass[tone],
        sizeStyles[size],
        className,
      )}
    >
      {value}%
    </span>
  );
}
