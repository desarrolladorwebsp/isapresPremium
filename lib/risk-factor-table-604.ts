import type { BeneficiaryRole } from "@/types/beneficiary";

interface AgeBracketRow {
  minAge: number;
  maxAge: number | null;
  contributorFactor: number;
  dependentFactor: number;
}

const TABLE_604_BRACKETS: AgeBracketRow[] = [
  { minAge: 0, maxAge: 20, contributorFactor: 0.6, dependentFactor: 0.6 },
  { minAge: 20, maxAge: 25, contributorFactor: 0.9, dependentFactor: 0.7 },
  { minAge: 25, maxAge: 35, contributorFactor: 1.0, dependentFactor: 0.7 },
  { minAge: 35, maxAge: 45, contributorFactor: 1.3, dependentFactor: 0.9 },
  { minAge: 45, maxAge: 55, contributorFactor: 1.4, dependentFactor: 1.0 },
  { minAge: 55, maxAge: 65, contributorFactor: 2.0, dependentFactor: 1.4 },
  { minAge: 65, maxAge: null, contributorFactor: 2.4, dependentFactor: 2.2 },
];

const MIN_AGE = 0;
const MAX_AGE = 120;

export function isValidBeneficiaryAge(age: number): boolean {
  return Number.isInteger(age) && age >= MIN_AGE && age <= MAX_AGE;
}

export function parseBeneficiaryAge(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  const age = Math.trunc(parsed);
  return isValidBeneficiaryAge(age) ? age : null;
}

function resolveBracket(age: number): AgeBracketRow | null {
  return (
    TABLE_604_BRACKETS.find(
      (row) =>
        age >= row.minAge && (row.maxAge === null || age < row.maxAge),
    ) ?? null
  );
}

export function getRiskFactor604(
  age: number,
  role: BeneficiaryRole,
): number | null {
  if (!isValidBeneficiaryAge(age)) return null;
  const bracket = resolveBracket(age);
  if (!bracket) return null;
  return role === "contributor"
    ? bracket.contributorFactor
    : bracket.dependentFactor;
}

export function formatRiskFactor(value: number): string {
  return value.toLocaleString("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
