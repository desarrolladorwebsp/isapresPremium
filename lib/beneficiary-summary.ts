import { isRiskFactorExemptByAge } from "@/lib/isapre-pricing-rules";
import { normalizeFamilyBeneficiaries } from "@/lib/beneficiary-state";
import { getRiskFactor604, isValidBeneficiaryAge } from "@/lib/risk-factor-table-604";
import type {
  BeneficiaryGroupSummary,
  FamilyBeneficiariesState,
  LegacyFamilyBeneficiariesState,
  PersonRiskFactor,
} from "@/types/beneficiary";

function resolveBillableFactor(
  age: number | null,
  role: PersonRiskFactor["role"],
): number | null {
  if (age === null || !isValidBeneficiaryAge(age)) return null;
  if (isRiskFactorExemptByAge(age)) return 0;
  return getRiskFactor604(age, role);
}

function isCountedBeneficiary(age: number | null): boolean {
  return age !== null && isValidBeneficiaryAge(age);
}

function toPersonRiskFactor(
  id: string,
  age: number | null,
  role: PersonRiskFactor["role"],
): PersonRiskFactor {
  const tableFactor =
    age !== null ? getRiskFactor604(age, role) : null;

  return {
    id,
    role,
    age,
    tableFactor,
    factor: resolveBillableFactor(age, role),
    isRiskFactorExempt: isRiskFactorExemptByAge(age),
  };
}

const EMPTY_CONTRIBUTOR: PersonRiskFactor = {
  id: "contributor",
  role: "contributor",
  age: null,
  tableFactor: null,
  factor: null,
  isRiskFactorExempt: false,
};

export function buildBeneficiaryGroupSummary(
  state: FamilyBeneficiariesState | LegacyFamilyBeneficiariesState,
): BeneficiaryGroupSummary {
  const normalized = normalizeFamilyBeneficiaries(state);

  const contributors = normalized.contributors.map((person) =>
    toPersonRiskFactor(person.id, person.age, "contributor"),
  );

  const dependents = normalized.dependents.map((person) =>
    toPersonRiskFactor(person.id, person.age, "dependent"),
  );

  const allPersons = [...contributors, ...dependents];
  const totalFactors = allPersons.reduce(
    (sum, person) => sum + (person.factor ?? 0),
    0,
  );
  const beneficiaryCount = allPersons.filter((person) =>
    isCountedBeneficiary(person.age),
  ).length;

  return {
    contributor: contributors[0] ?? EMPTY_CONTRIBUTOR,
    contributors,
    dependents,
    beneficiaryCount,
    personCount: beneficiaryCount,
    totalFactors,
  };
}
