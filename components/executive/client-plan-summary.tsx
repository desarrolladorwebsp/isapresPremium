"use client";

import {
  formatClientPlanBasePrice,
  formatClientPlanLabel,
  formatClientPlanPrice,
} from "@/lib/client-plan/format";
import type { ClientPlanSnapshot } from "@/types/client-plan";

function proposalCountLabel(count: number): string | null {
  if (count <= 0) return null;
  return count === 1 ? "1 propuesta" : `${count} propuestas`;
}

export interface ClientPlanSummaryProps {
  requestedPlan?: ClientPlanSnapshot | null;
  advisedPlan?: ClientPlanSnapshot | null;
  assignedPlans?: ClientPlanSnapshot[] | null;
  compact?: boolean;
}

export function ClientPlanSummary({
  requestedPlan,
  advisedPlan,
  assignedPlans,
  compact = false,
}: ClientPlanSummaryProps) {
  const activePlan = advisedPlan ?? requestedPlan;
  const proposalCount = assignedPlans?.filter((plan) => plan.planCode).length ?? 0;
  const proposalsLabel = proposalCountLabel(proposalCount);
  const hasDifferentAdvisedPlan = Boolean(
    advisedPlan?.planCode &&
      requestedPlan?.planCode &&
      advisedPlan.planCode !== requestedPlan.planCode,
  );

  if (!activePlan?.planCode) {
    if (proposalsLabel) {
      return (
        <div
          className={
            compact
              ? "flex min-h-[3rem] max-w-[18rem] flex-col justify-center gap-1"
              : "space-y-1"
          }
        >
          <p className="text-sm text-muted">Sin plan elegido</p>
          <p className="text-[11px] font-semibold leading-tight text-primary">
            {proposalsLabel}
          </p>
        </div>
      );
    }
    return <span className="text-sm text-muted">Sin plan registrado</span>;
  }

  const pricePlan =
    advisedPlan &&
    requestedPlan &&
    advisedPlan.planCode === requestedPlan.planCode
      ? requestedPlan
      : advisedPlan ?? requestedPlan;
  const price = formatClientPlanPrice(pricePlan);
  const basePrice = formatClientPlanBasePrice(activePlan);
  const planLabel = formatClientPlanLabel(activePlan);

  if (compact) {
    return (
      <div className="flex min-h-[3rem] max-w-[18rem] flex-col justify-center gap-1">
        <p className="truncate text-sm font-medium leading-tight text-foreground">
          {planLabel}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] leading-tight text-muted">
          {activePlan.planCode ? (
            <span className="font-mono">{activePlan.planCode}</span>
          ) : null}
          {basePrice ? <span>Base {basePrice}</span> : null}
          {price ? <span>Precio {price}</span> : null}
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
        {proposalsLabel ? (
          <p className="text-[11px] font-semibold leading-tight text-primary">
            {proposalsLabel}
          </p>
        ) : null}
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
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
          {basePrice ? <span>Base: {basePrice}</span> : null}
          {price ? <span>Precio: {price}</span> : null}
        </div>
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
      {proposalsLabel ? (
        <p className="text-xs font-semibold text-primary">{proposalsLabel}</p>
      ) : null}
    </div>
  );
}
