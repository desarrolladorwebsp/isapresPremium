import { formatRiskFactor } from "@/domain";
import { joinClasses } from "@/lib/utils";

export interface FactorBadgeProps {
  factor: number | null;
  className?: string;
}

export function FactorBadge({ factor, className }: FactorBadgeProps) {
  return (
    <span
      className={joinClasses(
        "inline-flex min-w-[3rem] shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-xs font-bold tabular-nums text-primary-dark",
        !factor && "border-border bg-white text-muted",
        className,
      )}
      aria-label={
        factor !== null
          ? `Factor de riesgo ${formatRiskFactor(factor)}`
          : "Factor de riesgo no disponible"
      }
    >
      {factor !== null ? formatRiskFactor(factor) : "—"}
    </span>
  );
}
