import { useMemo } from "react";
import { useOptionalCompanyAgreementContext } from "@/components/cotizador/company-agreement";
import { ExecutivePlanAgreementPrices } from "@/components/cotizador/company-agreement/plan-agreement-price";
import { buildIndividualPlanAgreementPricing } from "@/lib/company-agreements/individual-plan-price";
import type { PlanFinalPriceQuote } from "@/domain";
import {
  formatBasePriceBadgeLabel,
  PLAN_TYPE_LABELS,
  resolveCommercialPlanName,
  resolvePrimaryPlanType,
} from "@/domain";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { HealthPlan } from "@/domain";
import { IsapreLogo } from "./isapre-logo";
import { PlanMetaBadge } from "./plan-meta-badge";

export interface PlanCardHeaderProps {
  plan: HealthPlan;
  priceQuote: PlanFinalPriceQuote;
  className?: string;
}

export function PlanCardHeader({
  plan,
  priceQuote,
  className,
}: PlanCardHeaderProps) {
  const agreement =
    useOptionalCompanyAgreementContext()?.validatedAgreement ?? null;

  const { prices: agreementPrices } = useMemo(
    () => buildIndividualPlanAgreementPricing(priceQuote, plan.unique_code, plan.isapre, agreement),
    [priceQuote, plan.unique_code, plan.isapre, agreement],
  );

  const commercialName = resolveCommercialPlanName(plan);
  const planType = resolvePrimaryPlanType(plan);
  const planTypeLabel = PLAN_TYPE_LABELS[planType];
  const activeBasePrice = plan.base_price_uf;
  const basePriceLabel = formatBasePriceBadgeLabel(activeBasePrice);

  return (
    <header
      className={joinClasses(
        "flex flex-col gap-5 border-b bg-white px-5 py-5 sm:gap-6 sm:px-6 sm:py-6",
        "lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-7",
        ui.border,
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-4 sm:gap-5">
        <IsapreLogo isapre={plan.isapre} size="lg" />

        <div className="min-w-0 flex-1 space-y-2.5">
          <h3 className="text-lg font-bold leading-tight tracking-tight text-primary-dark sm:text-xl lg:text-[1.35rem]">
            {commercialName}
          </h3>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span
              className="font-mono text-xs tabular-nums tracking-tight text-muted sm:text-[13px]"
              title="Código único del plan"
            >
              {plan.unique_code}
            </span>


            <span className="hidden h-3.5 w-px bg-border sm:inline" aria-hidden />

            <PlanMetaBadge label={basePriceLabel} tone="base" />

            <PlanMetaBadge label={planTypeLabel} planType={planType} />
          </div>
        </div>
      </div>

      <ExecutivePlanAgreementPrices prices={agreementPrices} />
    </header>
  );
}

