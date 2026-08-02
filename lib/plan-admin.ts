import {
  ISAPRE_FILTER_OPTIONS,
  PLAN_TYPE_FILTER_OPTIONS,
  resolveIsapreDisplayName,
} from "@/lib/filter-options";
import {
  inferPlanTypes,
  PLAN_TYPE_LABELS,
  resolvePrimaryPlanType,
} from "@/lib/plan-metadata";
import { resolvePlanZoneIds } from "@/lib/plan-zones";
import { getZoneLabel } from "@/lib/clinic-admin";
import type { PlanTypeFilterId } from "@/types/filters";
import type { HealthPlan } from "@/domain";

export type PlanSortKey =
  | "name_asc"
  | "name_desc"
  | "isapre_asc"
  | "price_asc"
  | "price_desc"
  | "coverage_desc"
  | "coverage_asc";

export type PlanPdfFilter = "all" | "with_pdf" | "without_pdf";

export type PlanCoverageFilter = "all" | "with_coverage" | "without_coverage";

export interface PlanAdminFilters {
  search: string;
  isapre: string;
  zone: string;
  planType: string;
  pdf: PlanPdfFilter;
  coverage: PlanCoverageFilter;
  sort: PlanSortKey;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function getPlanZoneIds(plan: HealthPlan): string[] {
  return resolvePlanZoneIds(plan);
}

export function getPlanTypeLabel(plan: HealthPlan): string {
  return PLAN_TYPE_LABELS[resolvePrimaryPlanType(plan)];
}

export function planMatchesIsapreFilter(
  plan: HealthPlan,
  isapreFilter: string,
): boolean {
  if (isapreFilter === "all") return true;

  const label = normalizeText(resolveIsapreDisplayName(isapreFilter));
  const planIsapre = normalizeText(plan.isapre);
  return planIsapre.includes(label) || label.includes(planIsapre);
}

export function planMatchesZoneFilter(
  plan: HealthPlan,
  zoneFilter: string,
): boolean {
  const zoneIds = getPlanZoneIds(plan);
  if (zoneFilter === "all") return true;
  if (zoneFilter === "none") return zoneIds.length === 0;
  return zoneIds.includes(zoneFilter);
}

export function planMatchesTypeFilter(
  plan: HealthPlan,
  planTypeFilter: string,
): boolean {
  if (planTypeFilter === "all") return true;
  return inferPlanTypes(plan).includes(planTypeFilter as PlanTypeFilterId);
}

export function planMatchesPdfFilter(
  plan: HealthPlan,
  pdfFilter: PlanPdfFilter,
): boolean {
  if (pdfFilter === "all") return true;
  const hasPdf = Boolean(plan.pdf_url?.trim());
  return pdfFilter === "with_pdf" ? hasPdf : !hasPdf;
}

export function planMatchesCoverageFilter(
  plan: HealthPlan,
  coverageFilter: PlanCoverageFilter,
): boolean {
  if (coverageFilter === "all") return true;
  const hasCoverage = plan.coverage.length > 0;
  return coverageFilter === "with_coverage" ? hasCoverage : !hasCoverage;
}

export function planMatchesSearch(plan: HealthPlan, query: string): boolean {
  if (!query) return true;

  const normalized = query.toLowerCase();
  const zoneLabels = getPlanZoneIds(plan)
    .map((zoneId) => getZoneLabel(zoneId))
    .join(" ");

  return [
    plan.plan_name,
    plan.unique_code,
    plan.isapre,
    getPlanTypeLabel(plan),
    zoneLabels,
  ].some((value) => value.toLowerCase().includes(normalized));
}

export function filterAndSortPlans(
  plans: HealthPlan[],
  filters: PlanAdminFilters,
): HealthPlan[] {
  const filtered = plans.filter(
    (plan) =>
      planMatchesSearch(plan, filters.search.trim()) &&
      planMatchesIsapreFilter(plan, filters.isapre) &&
      planMatchesZoneFilter(plan, filters.zone) &&
      planMatchesTypeFilter(plan, filters.planType) &&
      planMatchesPdfFilter(plan, filters.pdf) &&
      planMatchesCoverageFilter(plan, filters.coverage),
  );

  const sorted = [...filtered];
  sorted.sort((a, b) => {
    switch (filters.sort) {
      case "name_desc":
        return b.plan_name.localeCompare(a.plan_name, "es");
      case "isapre_asc":
        return (
          a.isapre.localeCompare(b.isapre, "es") ||
          a.plan_name.localeCompare(b.plan_name, "es")
        );
      case "price_asc":
        return a.base_price_uf - b.base_price_uf;
      case "price_desc":
        return b.base_price_uf - a.base_price_uf;
      case "coverage_desc":
        return b.coverage.length - a.coverage.length;
      case "coverage_asc":
        return a.coverage.length - b.coverage.length;
      case "name_asc":
      default:
        return a.plan_name.localeCompare(b.plan_name, "es");
    }
  });

  return sorted;
}

export { ISAPRE_FILTER_OPTIONS, PLAN_TYPE_FILTER_OPTIONS };
