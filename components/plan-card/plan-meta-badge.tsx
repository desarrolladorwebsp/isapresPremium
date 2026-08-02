import {
  planTypeBadgeTone,
  statusBadgeToneClass,
  type StatusBadgeTone,
} from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { PlanTypeFilterId } from "@/domain";

export interface PlanMetaBadgeProps {
  label: string;
  tone?: StatusBadgeTone;
  planType?: PlanTypeFilterId;
  className?: string;
}

const pillBase =
  "inline-flex shrink-0 items-center rounded-md border px-2.5 py-1 text-[11px] font-bold leading-none tracking-wide shadow-sm";

/** Badges con color sólido y alto contraste (solo card ejecutiva). */
const executiveBadgeToneClass: Record<StatusBadgeTone, string> = {
  preferred:
    "border-amber-500 bg-amber-400 text-amber-950 shadow-[0_2px_10px_-3px_rgb(245,158,11/0.55)]",
  top: "border-primary bg-primary text-primary-foreground shadow-[0_2px_10px_-3px_rgb(26,111,217/0.45)]",
  neutral: "border-slate-300 bg-slate-100 text-slate-700",
  base: "border-primary bg-primary text-primary-foreground shadow-[0_2px_10px_-3px_rgb(26,111,217/0.45)]",
  closed:
    "border-secondary bg-secondary text-white shadow-[0_2px_10px_-3px_rgb(13,158,196/0.45)]",
  free_choice:
    "border-emerald-600 bg-emerald-500 text-white shadow-[0_2px_10px_-3px_rgb(16,185,129/0.45)]",
};

export function PlanMetaBadge({
  label,
  tone = "neutral",
  planType,
  className,
}: PlanMetaBadgeProps) {
  const resolvedTone = planType
    ? planTypeBadgeTone[planType]
    : tone;

  return (
    <span
      className={joinClasses(
        pillBase,
        "tabular-nums",
        executiveBadgeToneClass[resolvedTone] ?? statusBadgeToneClass[resolvedTone],
        className,
      )}
    >
      {label}
    </span>
  );
}
