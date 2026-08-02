import { buildBeneficiaryGroupSummary } from "@/lib/beneficiary-summary";
import {
  resolveGesPremiumUf,
} from "@/lib/isapre-pricing-rules";
import { calculateFinalPlanPriceClp } from "@/lib/plan-final-price";
import { getRiskFactor604 } from "@/lib/risk-factor-table-604";
import { isRiskFactorExemptByAge } from "@/lib/isapre-pricing-rules";
import type { BeneficiaryGroupSummary } from "@/types/beneficiary";
import type { FamilyBeneficiariesState } from "@/types/beneficiary";

export interface CargasPriceScenario {
  id: string;
  label: string;
  dependentCount: number;
  dependentAges: number[];
  totalFactors: number;
  beneficiaryCount: number;
  gesBillableCount: number;
  riskUf: number;
  riskClp: number;
  gesUf: number;
  gesClp: number;
  priceUf: number;
  priceClp: number;
}

export interface GesScalePoint {
  beneficiaries: number;
  gesUf: number;
  gesClp: number;
}

export interface PriceCompositionBreakdown {
  riskUf: number;
  riskClp: number;
  gesUf: number;
  gesClp: number;
  totalUf: number;
  totalClp: number;
  gesBillableCount: number;
  beneficiaryCount: number;
}

const CARGAS_SCENARIO_DEPENDENTS = [
  { id: "solo", label: "Solo cotizante", dependentAges: [] },
  { id: "c1", label: "+ 1 carga", dependentAges: [8] },
  { id: "c2", label: "+ 2 cargas", dependentAges: [8, 15] },
  { id: "c3", label: "+ 3 cargas", dependentAges: [8, 15, 28] },
] as const;

function resolveBillableFactor(
  age: number,
  role: "contributor" | "dependent",
): number {
  if (isRiskFactorExemptByAge(age)) return 0;
  return getRiskFactor604(age, role) ?? 0;
}

/** Personas que pagan GES (excluye menores de 2 años). */
export function countGesBillableBeneficiaries(ages: number[]): number {
  return ages.filter((age) => !isRiskFactorExemptByAge(age)).length;
}

function buildScenarioQuote(
  basePriceUf: number,
  ufToClp: number,
  contributorAge: number,
  dependentAges: number[],
  label: string,
  id: string,
  gesPremiumUfPerPerson: number,
): CargasPriceScenario {
  const contributorFactor = resolveBillableFactor(contributorAge, "contributor");
  const dependentFactors = dependentAges.map((age) =>
    resolveBillableFactor(age, "dependent"),
  );
  const totalFactors =
    contributorFactor + dependentFactors.reduce((sum, value) => sum + value, 0);
  const allAges = [contributorAge, ...dependentAges];
  const beneficiaryCount = allAges.length;
  const gesBillableCount = countGesBillableBeneficiaries(allAges);
  const riskUf = totalFactors * basePriceUf;
  const gesUf = gesBillableCount * gesPremiumUfPerPerson;
  const priceUf = riskUf + gesUf;
  const priceClp = calculateFinalPlanPriceClp(priceUf, ufToClp);

  return {
    id,
    label,
    dependentCount: dependentAges.length,
    dependentAges,
    totalFactors,
    beneficiaryCount,
    gesBillableCount,
    riskUf,
    riskClp: calculateFinalPlanPriceClp(riskUf, ufToClp),
    gesUf,
    gesClp: calculateFinalPlanPriceClp(gesUf, ufToClp),
    priceUf,
    priceClp,
  };
}

export function buildCargasPriceScenarios(
  basePriceUf: number,
  ufToClp: number,
  contributorAge: number = 35,
  gesPremiumUfPerPerson?: number,
): CargasPriceScenario[] {
  const gesRate = resolveGesPremiumUf(gesPremiumUfPerPerson);

  return CARGAS_SCENARIO_DEPENDENTS.map((scenario) =>
    buildScenarioQuote(
      basePriceUf,
      ufToClp,
      contributorAge,
      [...scenario.dependentAges],
      scenario.label,
      scenario.id,
      gesRate,
    ),
  );
}

export function buildGesScalePoints(
  ufToClp: number,
  maxBeneficiaries: number = 5,
  gesPremiumUfPerPerson?: number,
): GesScalePoint[] {
  const gesRate = resolveGesPremiumUf(gesPremiumUfPerPerson);

  return Array.from({ length: maxBeneficiaries }, (_, index) => {
    const beneficiaries = index + 1;
    const gesUf = beneficiaries * gesRate;
    return {
      beneficiaries,
      gesUf,
      gesClp: calculateFinalPlanPriceClp(gesUf, ufToClp),
    };
  });
}

export function buildPriceCompositionFromSummary(
  basePriceUf: number,
  summary: BeneficiaryGroupSummary,
  ufToClp: number,
  quotedFinalPriceUf?: number,
  quotedFinalPriceClp?: number,
  gesPremiumUfPerPerson?: number,
): PriceCompositionBreakdown {
  const gesRate = resolveGesPremiumUf(gesPremiumUfPerPerson);
  const allAges = [
    summary.contributor.age,
    ...summary.dependents.map((d) => d.age),
  ].filter((age): age is number => age !== null);

  const gesBillableCount = countGesBillableBeneficiaries(allAges);
  const riskUf = summary.totalFactors * basePriceUf;
  const quotedGesUf =
    quotedFinalPriceUf !== undefined
      ? Math.max(quotedFinalPriceUf - riskUf, 0)
      : gesBillableCount * gesRate;
  const gesUf = quotedGesUf;
  const totalUf = quotedFinalPriceUf ?? riskUf + gesUf;
  const totalClp =
    quotedFinalPriceClp ?? calculateFinalPlanPriceClp(totalUf, ufToClp);

  return {
    riskUf,
    riskClp: calculateFinalPlanPriceClp(riskUf, ufToClp),
    gesUf,
    gesClp: calculateFinalPlanPriceClp(gesUf, ufToClp),
    totalUf,
    totalClp,
    gesBillableCount,
    beneficiaryCount: summary.beneficiaryCount,
  };
}

/** Escenario de cargas que coincide con el grupo familiar actual. */
export function buildCargasScenarioFromSummary(
  basePriceUf: number,
  summary: BeneficiaryGroupSummary,
  ufToClp: number,
  gesPremiumUfPerPerson?: number,
): CargasPriceScenario | null {
  const contributorAges = summary.contributors
    .map((person) => person.age)
    .filter((age): age is number => age !== null);
  if (contributorAges.length === 0) return null;

  const dependentAges = summary.dependents
    .map((d) => d.age)
    .filter((age): age is number => age !== null);

  const gesRate = resolveGesPremiumUf(gesPremiumUfPerPerson);
  const allAges = [...contributorAges, ...dependentAges];
  const beneficiaryCount = allAges.length;
  const gesBillableCount = countGesBillableBeneficiaries(allAges);
  const totalFactors = summary.totalFactors;
  const riskUf = totalFactors * basePriceUf;
  const gesUf = gesBillableCount * gesRate;
  const priceUf = riskUf + gesUf;

  return {
    id: "current",
    label:
      dependentAges.length === 0
        ? "Tu grupo"
        : `Tu grupo (${dependentAges.length} carga${dependentAges.length === 1 ? "" : "s"})`,
    dependentCount: dependentAges.length,
    dependentAges,
    totalFactors,
    beneficiaryCount,
    gesBillableCount,
    riskUf,
    riskClp: calculateFinalPlanPriceClp(riskUf, ufToClp),
    gesUf,
    gesClp: calculateFinalPlanPriceClp(gesUf, ufToClp),
    priceUf,
    priceClp: calculateFinalPlanPriceClp(priceUf, ufToClp),
  };
}

/** Escenarios de cargas usando edad real del cotizante del criterio. */
export function buildCargasScenariosForGroup(
  basePriceUf: number,
  ufToClp: number,
  contributorAge: number | null,
  dependents: FamilyBeneficiariesState["dependents"],
  gesPremiumUfPerPerson?: number,
): CargasPriceScenario[] {
  const gesRate = resolveGesPremiumUf(gesPremiumUfPerPerson);
  const age = contributorAge ?? 35;
  const scenarios = buildCargasPriceScenarios(
    basePriceUf,
    ufToClp,
    age,
    gesRate,
  );

  if (contributorAge === null) return scenarios;

  const summary = buildBeneficiaryGroupSummary({
    contributorAge,
    dependents,
  });
  const current = buildCargasScenarioFromSummary(
    basePriceUf,
    summary,
    ufToClp,
    gesRate,
  );
  if (!current) return scenarios;

  const matchIndex = scenarios.findIndex(
    (s) => s.dependentCount === current.dependentCount,
  );
  if (matchIndex >= 0) {
    const next = [...scenarios];
    next[matchIndex] = { ...current, label: scenarios[matchIndex].label };
    return next;
  }

  return scenarios;
}
