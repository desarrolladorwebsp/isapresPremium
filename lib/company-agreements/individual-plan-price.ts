import { calculateFinalPlanPriceClp } from "@/lib/plan-final-price";
import type { BeneficiaryPlanPrice, PlanFinalPriceQuote } from "@/lib/plan-final-price";
import { isValidBeneficiaryAge } from "@/lib/risk-factor-table-604";
import type { ValidatedCompanyAgreement } from "@/types/company-agreement";
import {
  resolveAgreementDiscountPercentForPlan,
  resolveAgreementPlanMapping,
  type PlanAgreementPriceDisplay,
} from "./plan-price-discount";

const roundUf = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

/** Una base por cotizante. Ni el otro cotizante ni las cargas heredan convenio. */
export function buildIndividualPlanAgreementPricing(
  standardQuote: PlanFinalPriceQuote,
  planCode: string,
  planIsapre: string,
  legacyAgreement?: ValidatedCompanyAgreement | null,
): { quote: PlanFinalPriceQuote; prices: PlanAgreementPriceDisplay } {
  // Si se reutiliza una cotización ya desglosada, no aplicar dos veces el ahorro.
  if (standardQuote.beneficiaryPrices) {
    const riskComponentUf = standardQuote.groupTotalFactor * standardQuote.basePriceUf;
    const finalPriceUf = riskComponentUf + standardQuote.gesTotalUf;
    standardQuote = {
      ...standardQuote,
      riskComponentUf,
      finalPriceUf,
      finalPriceClp: calculateFinalPlanPriceClp(finalPriceUf, standardQuote.ufToClp),
    };
  }
  let firstContributorSeen = false;
  let savingsUf = 0;
  const beneficiaryPrices: BeneficiaryPlanPrice[] = [];

  for (const person of standardQuote.beneficiaryFactors ?? []) {
    // La compatibilidad con el convenio antiguo se limita al primer cotizante.
    const isFirstContributor = person.role === "contributor" && !firstContributorSeen;
    if (person.role === "contributor") firstContributorSeen = true;
    if (person.age === null || !isValidBeneficiaryAge(person.age)) continue;
    const agreement = person.role === "contributor"
      ? (person.companyAgreement !== undefined
          ? person.companyAgreement
          : isFirstContributor ? legacyAgreement : null)
      : null;
    const mapping = resolveAgreementPlanMapping(planCode, planIsapre, agreement);
    const percent = resolveAgreementDiscountPercentForPlan(planIsapre, agreement);
    const basePriceUf = mapping
      ? mapping.price
      : standardQuote.basePriceUf * (1 - (percent ?? 0) / 100);
    const factor = person.factor ?? 0;
    const riskComponentUf = factor * basePriceUf;
    savingsUf += factor * standardQuote.basePriceUf - riskComponentUf;
    const discountPercent = standardQuote.basePriceUf > 0
      ? (1 - basePriceUf / standardQuote.basePriceUf) * 100
      : 0;
    beneficiaryPrices.push({
      id: person.id,
      role: person.role,
      basePriceUf,
      riskComponentUf,
      // Conserva exactamente el cobro GES del motor, sin descuento.
      gesUf: standardQuote.gesPremiumUfPerPerson,
      finalPriceUf: roundUf(riskComponentUf + standardQuote.gesPremiumUfPerPerson),
      discountPercent,
      agreementName: mapping || percent ? agreement?.companyName ?? null : null,
      mappingCode: mapping?.code ?? null,
    });
  }

  const riskComponentUf = standardQuote.riskComponentUf - savingsUf;
  const finalPriceUf = savingsUf === 0 ? standardQuote.finalPriceUf : roundUf(riskComponentUf + standardQuote.gesTotalUf);
  const quote = {
    ...standardQuote,
    riskComponentUf,
    finalPriceUf,
    finalPriceClp: calculateFinalPlanPriceClp(finalPriceUf, standardQuote.ufToClp),
    beneficiaryPrices,
  };
  return {
    quote,
    prices: {
      listFinalPriceUf: standardQuote.finalPriceUf,
      listFinalPriceClp: standardQuote.finalPriceClp,
      displayFinalPriceUf: quote.finalPriceUf,
      displayFinalPriceClp: quote.finalPriceClp,
      hasAgreementDiscount: savingsUf > 0.0000001,
      individualBenefits: true,
      // Porcentaje efectivo sobre el componente base del grupo, no sobre GES.
      discountPercent: standardQuote.riskComponentUf > 0
        ? savingsUf / standardQuote.riskComponentUf * 100
        : 0,
    },
  };
}
