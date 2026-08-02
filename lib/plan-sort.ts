import { buildPlanFinalPriceQuote } from "@/domain";
import type { BeneficiaryGroupSummary } from "@/types/beneficiary";
import type { HealthPlan, HealthPlanSummary } from "@/types/plan";
import { resolveAgreementPlanMapping } from "@/lib/company-agreements/plan-price-discount";
import type { ValidatedCompanyAgreement } from "@/types/company-agreement";

type PlanWithBasePrice = {
  base_price_uf: number;
  plan_name?: string;
  unique_code?: string;
};

type PlanWithFinalPrice = {
  base_price_uf: number;
  ges_premium_uf?: number;
  plan_name: string;
  unique_code: string;
  isapre?: string;
};

function comparePlanNames(a: PlanWithBasePrice, b: PlanWithBasePrice): number {
  const nameA = a.plan_name ?? a.unique_code ?? "";
  const nameB = b.plan_name ?? b.unique_code ?? "";
  return nameA.localeCompare(nameB, "es");
}

export function comparePlansByBasePriceAsc(
  a: PlanWithBasePrice,
  b: PlanWithBasePrice,
): number {
  const diff = a.base_price_uf - b.base_price_uf;
  if (diff !== 0) return diff;
  return comparePlanNames(a, b);
}

export function sortPlansByBasePriceAsc<T extends PlanWithBasePrice>(
  plans: T[],
): T[] {
  return [...plans].sort(comparePlansByBasePriceAsc);
}

export function comparePlansByFinalPriceAsc(
  a: PlanWithFinalPrice,
  b: PlanWithFinalPrice,
  beneficiarySummary: BeneficiaryGroupSummary,
  ufToClp: number,
  agreement?: ValidatedCompanyAgreement | null,
): number {
  // If there is an active agreement, check if the plans have mapped base prices
  const mappingA = a.isapre ? resolveAgreementPlanMapping(a.unique_code, a.isapre, agreement) : null;
  const mappingB = b.isapre ? resolveAgreementPlanMapping(b.unique_code, b.isapre, agreement) : null;

  const basePriceA = mappingA ? mappingA.price : a.base_price_uf;
  const basePriceB = mappingB ? mappingB.price : b.base_price_uf;

  const priceA = buildPlanFinalPriceQuote(
    basePriceA,
    beneficiarySummary,
    ufToClp,
    a.ges_premium_uf,
  ).finalPriceUf;
  const priceB = buildPlanFinalPriceQuote(
    basePriceB,
    beneficiarySummary,
    ufToClp,
    b.ges_premium_uf,
  ).finalPriceUf;
  const diff = priceA - priceB;
  if (Math.abs(diff) > 1e-9) return diff;
  const baseDiff = basePriceA - basePriceB;
  if (Math.abs(baseDiff) > 1e-9) return baseDiff;
  return comparePlanNames(a, b);
}

export function sortPlansByFinalPriceAsc<T extends PlanWithFinalPrice>(
  plans: T[],
  beneficiarySummary: BeneficiaryGroupSummary,
  ufToClp: number,
  agreement?: ValidatedCompanyAgreement | null,
): T[] {
  return [...plans].sort((a, b) =>
    comparePlansByFinalPriceAsc(a, b, beneficiarySummary, ufToClp, agreement),
  );
}

/** Orden estable por precio final para catálogos completos del panel ejecutivo. */
export function sortHealthPlansByFinalPriceAsc(
  plans: HealthPlan[],
  beneficiarySummary: BeneficiaryGroupSummary,
  ufToClp: number,
  agreement?: ValidatedCompanyAgreement | null,
): HealthPlan[] {
  return sortPlansByFinalPriceAsc(plans, beneficiarySummary, ufToClp, agreement);
}

export function sortHealthPlanSummariesByFinalPriceAsc(
  plans: HealthPlanSummary[],
  beneficiarySummary: BeneficiaryGroupSummary,
  ufToClp: number,
  agreement?: ValidatedCompanyAgreement | null,
): HealthPlanSummary[] {
  return sortPlansByFinalPriceAsc(plans, beneficiarySummary, ufToClp, agreement);
}

