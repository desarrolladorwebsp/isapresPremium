import { isRiskFactorExemptByAge, resolveGesPremiumUf } from "@/lib/isapre-pricing-rules";
import {
  calculateFinalPlanPriceClp,
  calculateFinalPlanPriceUf,
} from "@/lib/plan-final-price";
import { getRiskFactor604 } from "@/lib/risk-factor-table-604";

export interface AgePricePoint {
  age: number;
  factor: number;
  priceUf: number;
  priceClp: number;
}

export const SINGLE_PERSON_AGE_SAMPLES = [
  18, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70,
] as const;

export function buildSinglePersonPricesByAge(
  basePriceUf: number,
  ufToClp: number,
  ages: readonly number[] = SINGLE_PERSON_AGE_SAMPLES,
  gesPremiumUfPerPerson?: number,
): AgePricePoint[] {
  const gesRate = resolveGesPremiumUf(gesPremiumUfPerPerson);

  return ages.map((age) => {
    const factor = isRiskFactorExemptByAge(age)
      ? 0
      : (getRiskFactor604(age, "contributor") ?? 0);
    const priceUf = calculateFinalPlanPriceUf(basePriceUf, factor, 1, gesRate);
    const priceClp = calculateFinalPlanPriceClp(priceUf, ufToClp);

    return { age, factor, priceUf, priceClp };
  });
}

export function formatAgePriceClpShort(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1).replace(".", ",")}M`;
  }
  if (value >= 1_000) {
    return `$${Math.round(value / 1_000)}k`;
  }
  return `$${value.toLocaleString("es-CL")}`;
}
