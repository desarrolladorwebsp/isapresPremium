import {
  coverageGlobalPercentage,
  uniqueCoveragePercentages,
} from "@/lib/plan-format";
import type {
  CoverageEntry,
  HealthPlan,
  HealthPlanSummary,
  PlanCoverageSummary,
} from "@/types/plan";

export function buildCoverageSummary(
  coverage: CoverageEntry[],
): PlanCoverageSummary {
  const hospitalaria = coverage.filter((entry) => entry.type === "hospitalaria");
  const ambulatoria = coverage.filter((entry) => entry.type === "ambulatoria");

  return {
    clinic_count: coverage.length,
    hospital_percentages: uniqueCoveragePercentages(hospitalaria),
    ambulatory_percentages: uniqueCoveragePercentages(ambulatoria),
    hospital_avg: coverageGlobalPercentage(hospitalaria),
    ambulatory_avg: coverageGlobalPercentage(ambulatoria),
  };
}

export function mapHealthPlanToSummary(plan: HealthPlan): HealthPlanSummary {
  const { coverage, ...rest } = plan;
  return {
    ...rest,
    coverage_summary: buildCoverageSummary(coverage),
  };
}

export function formatSummaryPercentages(values: number[]): string {
  if (values.length === 0) return "—";
  return values.map((value) => `${value}%`).join(" ");
}

export function isHealthPlanSummary(
  plan: HealthPlan | HealthPlanSummary,
): plan is HealthPlanSummary {
  return "coverage_summary" in plan && !("coverage" in plan);
}

/** Combina resumen de listado con coberturas cargadas bajo demanda. */
export function mergePlanWithCoverage(
  summary: HealthPlanSummary,
  coverage: CoverageEntry[],
): HealthPlan {
  const { coverage_summary: _summary, ...rest } = summary;
  return {
    ...rest,
    zones: [],
    coverage,
  };
}
