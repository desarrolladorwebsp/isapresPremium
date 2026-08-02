"use client";

import {
  formatClientPlanLabel,
  formatClientPlanPrice,
} from "@/lib/client-plan/format";
import { joinClasses } from "@/lib/utils";
import type { ClientPlanSnapshot } from "@/types/client-plan";

export interface ClientPlanSummaryProps {
  requestedPlan?: ClientPlanSnapshot | null;
  advisedPlan?: ClientPlanSnapshot | null;
  compact?: boolean;
}

export function ClientPlanSummary({
  requestedPlan,
  advisedPlan,
  compact = false,
}: ClientPlanSummaryProps) {
  const activePlan = advisedPlan ?? requestedPlan;
  const hasDifferentAdvisedPlan = Boolean(
    advisedPlan?.planCode &&
      requestedPlan?.planCode &&
      advisedPlan.planCode !== requestedPlan.planCode,
  );

  if (!activePlan?.planCode) {
    return <span className="text-sm text-muted">Sin plan registrado</span>;
  }

  const price = formatClientPlanPrice(requestedPlan);
  const planLabel = formatClientPlanLabel(activePlan);

  if (compact) {
    return (
      <div className="flex min-h-[3rem] max-w-[16rem] flex-col justify-center gap-1">
        <p className="truncate text-sm font-medium leading-tight text-foreground">
          {planLabel}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] leading-tight text-muted">
          {activePlan.planCode ? (
            <span className="font-mono">{activePlan.planCode}</span>
          ) : null}
          {price ? <span>{price}</span> : null}
        </div>
        {hasDifferentAdvisedPlan ? (
          <p className="truncate text-[11px] leading-tight text-primary">
            Solicitó: {formatClientPlanLabel(requestedPlan)}
          </p>
        ) : advisedPlan?.planCode ? (
          <p className="text-[11px] leading-tight text-emerald-700">Plan asesorado</p>
        ) : (
          <p className="text-[11px] leading-tight text-muted">Plan solicitado</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-foreground">{planLabel}</p>
        {activePlan.planCode ? (
          <p className="text-xs text-muted">{activePlan.planCode}</p>
        ) : null}
        {price ? <p className="text-xs text-muted">Cotizado: {price}</p> : null}
      </div>

      {hasDifferentAdvisedPlan ? (
        <p className="text-xs text-primary">
          Solicitó: {formatClientPlanLabel(requestedPlan)}
        </p>
      ) : advisedPlan?.planCode ? (
        <p className="text-xs text-emerald-700">Plan asesorado</p>
      ) : (
        <p className="text-xs text-muted">Plan solicitado</p>
      )}
    </div>
  );
}
