import { normalizeIncomeDigits } from "@/lib/deep-link/income";
import { getPrimaryContributorAge } from "@/lib/beneficiary-state";
import type { BeneficiaryGroupSummary, FamilyBeneficiariesState } from "@/types/beneficiary";
import type { QuoteCriteria } from "@/lib/quote-criteria-options";

export const QUOTE_CRITERIA_CONFIRM_MESSAGE =
  "Confirma tus datos de cotización antes de buscar planes.";

export const EMBED_CRITERIA_HINT =
  "Completa edad, tipo de cotizante y renta imponible, y confírmalos en la barra superior.";

export function getMissingQuoteCriteriaFields(input: {
  criteria: QuoteCriteria;
  beneficiaries: FamilyBeneficiariesState;
  beneficiarySummary?: BeneficiaryGroupSummary;
}): string[] {
  const missing: string[] = [];

  const age =
    input.beneficiarySummary?.contributor.age ??
    getPrimaryContributorAge(input.beneficiaries);

  if (age === null || age === undefined || age < 18 || age > 120) {
    missing.push("edad");
  }

  if (!input.criteria.contributorType) {
    missing.push("tipo de cotizante");
  }

  if (!normalizeIncomeDigits(input.criteria.monthlyIncome)) {
    missing.push("renta imponible");
  }

  return missing;
}

export function hasCompleteQuoteCriteria(input: {
  criteria: QuoteCriteria;
  beneficiaries: FamilyBeneficiariesState;
  beneficiarySummary?: BeneficiaryGroupSummary;
}): boolean {
  return getMissingQuoteCriteriaFields(input).length === 0;
}

export function formatMissingQuoteCriteriaMessage(
  missing: string[],
  prefix: string,
): string {
  if (missing.length === 0) return "";
  return `${prefix} Falta: ${missing.join(", ")}.`;
}
