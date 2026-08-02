import { DEFAULT_UF_VALUE_CLP } from "@/lib/economic-indicators";
import { resolveGesPremiumUf } from "@/lib/isapre-pricing-rules";
import type { BeneficiaryGroupSummary } from "@/types/beneficiary";

export interface PlanFinalPriceQuote {
  basePriceUf: number;
  groupTotalFactor: number;
  beneficiaryCount: number;
  gesPremiumUfPerPerson: number;
  gesTotalUf: number;
  riskComponentUf: number;
  finalPriceUf: number;
  finalPriceClp: number;
  ufToClp: number;
}

export function calculateFinalPlanPriceUf(
  basePriceUf: number,
  groupTotalFactor: number,
  beneficiaryCount: number,
  gesPremiumUfPerPerson: number,
): number {
  return (
    groupTotalFactor * basePriceUf + beneficiaryCount * gesPremiumUfPerPerson
  );
}

export function calculateFinalPlanPriceClp(
  finalPriceUf: number,
  ufToClp: number = DEFAULT_UF_VALUE_CLP,
): number {
  return Math.round(finalPriceUf * ufToClp);
}

export function buildPlanFinalPriceQuote(
  basePriceUf: number,
  summary: BeneficiaryGroupSummary,
  ufToClp: number = DEFAULT_UF_VALUE_CLP,
  gesPremiumUfPerPerson?: number,
): PlanFinalPriceQuote {
  const beneficiaryCount = summary.beneficiaryCount;
  const groupTotalFactor =
    beneficiaryCount === 0 ? 1 : summary.totalFactors;
  const gesRate = resolveGesPremiumUf(gesPremiumUfPerPerson);
  const gesTotalUf = beneficiaryCount * gesRate;
  const riskComponentUf = groupTotalFactor * basePriceUf;
  const finalPriceUf = riskComponentUf + gesTotalUf;
  const finalPriceClp = calculateFinalPlanPriceClp(finalPriceUf, ufToClp);

  return {
    basePriceUf,
    groupTotalFactor,
    beneficiaryCount,
    gesPremiumUfPerPerson: gesRate,
    gesTotalUf,
    riskComponentUf,
    finalPriceUf,
    finalPriceClp,
    ufToClp,
  };
}
