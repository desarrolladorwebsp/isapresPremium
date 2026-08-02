import {
  coverageGlobalPercentage,
  splitCoverageByType,
} from "@/lib/plan-format";
import { inferPlanTypes } from "@/lib/plan-metadata";
import { planMatchesZoneFilter } from "@/lib/plan-zones";
import {
  getActiveCheckboxIds,
  getActiveAmbulatoryClinicIds,
  getActiveHospitalClinicIds,
  isCheckboxGroupActive,
  resolveIsapreDisplayName,
} from "@/lib/filter-options";
import { normalizeSearchText } from "@/lib/normalize-search-text";
import type { DashboardFiltersState, PlanTypeFilterId } from "@/types/filters";
import type { CoverageEntry, HealthPlan, HealthPlanCatalogItem } from "@/types/plan";

function normalizeText(value: string): string {
  return normalizeSearchText(value);
}

function getCoverageEntriesByType(
  plan: HealthPlan,
  type: "hospitalaria" | "ambulatoria",
): CoverageEntry[] {
  const { hospitalaria, ambulatoria } = splitCoverageByType(plan.coverage);
  return type === "hospitalaria" ? hospitalaria : ambulatoria;
}

type PlanFilterMetadata = Pick<
  HealthPlan,
  "isapre" | "plan_name" | "plan_type" | "has_top" | "additional_notes"
>;

function matchesIsapreFilter(
  plan: PlanFilterMetadata,
  filters: DashboardFiltersState,
): boolean {
  if (!isCheckboxGroupActive(filters.isapres)) return true;
  const activeIds = getActiveCheckboxIds(filters.isapres);
  const planIsapre = normalizeText(plan.isapre);
  return activeIds.some((id) => {
    const label = normalizeText(resolveIsapreDisplayName(id));
    return planIsapre.includes(label) || label.includes(planIsapre);
  });
}

function matchesZoneFilter(
  plan: HealthPlan,
  filters: DashboardFiltersState,
): boolean {
  if (!isCheckboxGroupActive(filters.zones)) return true;
  const activeIds = getActiveCheckboxIds(filters.zones);
  return planMatchesZoneFilter(plan, activeIds);
}

function matchesPlanTypeFilter(
  plan: PlanFilterMetadata,
  filters: DashboardFiltersState,
): boolean {
  if (!isCheckboxGroupActive(filters.planTypes)) return true;
  const activeTypes = getActiveCheckboxIds(
    filters.planTypes,
  ) as PlanTypeFilterId[];
  const planTypes = inferPlanTypes(plan);
  return activeTypes.some((type) => planTypes.includes(type));
}

function planIncludesAllClinicsForType(
  plan: HealthPlan,
  type: "hospitalaria" | "ambulatoria",
  clinicIds: string[],
): boolean {
  if (clinicIds.length === 0) return true;
  const entries = getCoverageEntriesByType(plan, type);
  const present = new Set(entries.map((entry) => entry.clinic_id));
  return clinicIds.every((clinicId) => present.has(clinicId));
}

function getClinicIdsForCoverageType(
  filters: DashboardFiltersState,
  type: "hospitalaria" | "ambulatoria",
): string[] {
  return type === "hospitalaria"
    ? getActiveHospitalClinicIds(filters)
    : getActiveAmbulatoryClinicIds(filters);
}

function coverageTypeMeetsThresholdForClinics(
  entries: CoverageEntry[],
  clinicIds: string[],
  threshold: number,
): boolean {
  if (clinicIds.length === 0) return true;
  const byClinic = new Map(
    entries.map((entry) => [entry.clinic_id, entry.percentage]),
  );
  return clinicIds.every((clinicId) => {
    const percentage = byClinic.get(clinicId);
    return typeof percentage === "number" && percentage >= threshold;
  });
}

/**
 * Cobertura por tipo (hospitalaria / ambulatoria).
 * - Clínica(s) + %: todas las clínicas seleccionadas deben existir en el plan
 *   y cumplir >= umbral en ese tipo (AND).
 * - Solo %: algún prestador del tipo debe cumplir >= umbral.
 * - Solo clínica(s) (sin %): el plan debe incluir todas las clínicas seleccionadas (AND).
 */
function matchesCoverageTypeFilter(
  plan: HealthPlan,
  type: "hospitalaria" | "ambulatoria",
  filters: DashboardFiltersState,
): boolean {
  const clinicIds = getClinicIdsForCoverageType(filters, type);
  const threshold =
    type === "hospitalaria"
      ? filters.hospitalCoveragePercent
      : filters.ambulatoryCoveragePercent;

  const entries = getCoverageEntriesByType(plan, type);

  if (threshold !== null) {
    if (clinicIds.length > 0) {
      return coverageTypeMeetsThresholdForClinics(
        entries,
        clinicIds,
        threshold,
      );
    }

    if (entries.length === 0) return false;
    const bestPercent = Math.max(...entries.map((entry) => entry.percentage));
    return bestPercent >= threshold;
  }

  if (clinicIds.length > 0) {
    return planIncludesAllClinicsForType(plan, type, clinicIds);
  }

  return true;
}

function matchesClinicOnlyFilter(
  _plan: HealthPlan,
  _filters: DashboardFiltersState,
): boolean {
  return true;
}

export function applyDashboardFilters(
  plans: HealthPlan[],
  filters: DashboardFiltersState,
): HealthPlan[] {
  return plans.filter(
    (plan) =>
      matchesIsapreFilter(plan, filters) &&
      matchesZoneFilter(plan, filters) &&
      matchesPlanTypeFilter(plan, filters) &&
      matchesClinicOnlyFilter(plan, filters) &&
      matchesCoverageTypeFilter(plan, "hospitalaria", filters) &&
      matchesCoverageTypeFilter(plan, "ambulatoria", filters),
  );
}

/** Evalúa cobertura en un plan completo (p. ej. resúmenes enriquecidos con detalle). */
export function planMatchesCoverageFilters(
  plan: HealthPlan,
  filters: DashboardFiltersState,
): boolean {
  return (
    matchesClinicOnlyFilter(plan, filters) &&
    matchesCoverageTypeFilter(plan, "hospitalaria", filters) &&
    matchesCoverageTypeFilter(plan, "ambulatoria", filters)
  );
}

/** Fallback cuando solo hay resumen agregado (sin detalle por clínica). */
export function summaryMatchesCoverageThresholds(
  hospitalAvg: number,
  ambulatoryAvg: number,
  filters: DashboardFiltersState,
): boolean {
  if (
    getActiveHospitalClinicIds(filters).length > 0 ||
    getActiveAmbulatoryClinicIds(filters).length > 0
  ) {
    return true;
  }

  if (
    filters.hospitalCoveragePercent !== null &&
    hospitalAvg < filters.hospitalCoveragePercent
  ) {
    return false;
  }

  if (
    filters.ambulatoryCoveragePercent !== null &&
    ambulatoryAvg < filters.ambulatoryCoveragePercent
  ) {
    return false;
  }

  return true;
}

export function getBestCoveragePercentForType(
  plan: HealthPlan,
  type: "hospitalaria" | "ambulatoria",
): number {
  const entries = getCoverageEntriesByType(plan, type);
  if (entries.length === 0) return 0;
  return Math.max(...entries.map((entry) => entry.percentage));
}

export function getClinicCoveragePercent(
  plan: HealthPlan,
  type: "hospitalaria" | "ambulatoria",
  clinicId: string,
): number | null {
  const entry = getCoverageEntriesByType(plan, type).find(
    (item) => item.clinic_id === clinicId,
  );
  return entry?.percentage ?? null;
}

function catalogIncludesAllClinicsForType(
  plan: HealthPlanCatalogItem,
  type: "hospitalaria" | "ambulatoria",
  clinicIds: string[],
): boolean {
  if (clinicIds.length === 0) return true;
  const index = type === "hospitalaria" ? 0 : 1;
  return clinicIds.every((clinicId) => {
    const values = plan.clinic_index[clinicId];
    return values ? values[index] > 0 : false;
  });
}

function catalogCoverageMeetsThresholdForClinics(
  plan: HealthPlanCatalogItem,
  type: "hospitalaria" | "ambulatoria",
  clinicIds: string[],
  threshold: number,
): boolean {
  const index = type === "hospitalaria" ? 0 : 1;
  return clinicIds.every((clinicId) => {
    const values = plan.clinic_index[clinicId];
    return values ? values[index] >= threshold : false;
  });
}

function catalogBestCoveragePercent(
  plan: HealthPlanCatalogItem,
  type: "hospitalaria" | "ambulatoria",
): number {
  const index = type === "hospitalaria" ? 0 : 1;
  let best = 0;

  for (const values of Object.values(plan.clinic_index)) {
    if (values[index] > best) best = values[index];
  }

  return best;
}

function matchesCatalogCoverageTypeFilter(
  plan: HealthPlanCatalogItem,
  type: "hospitalaria" | "ambulatoria",
  filters: DashboardFiltersState,
): boolean {
  const clinicIds = getClinicIdsForCoverageType(filters, type);
  const threshold =
    type === "hospitalaria"
      ? filters.hospitalCoveragePercent
      : filters.ambulatoryCoveragePercent;

  if (threshold !== null) {
    if (clinicIds.length > 0) {
      return catalogCoverageMeetsThresholdForClinics(
        plan,
        type,
        clinicIds,
        threshold,
      );
    }

    const bestPercent = catalogBestCoveragePercent(plan, type);
    if (bestPercent <= 0) {
      const avg =
        type === "hospitalaria"
          ? plan.coverage_summary.hospital_avg
          : plan.coverage_summary.ambulatory_avg;
      return avg >= threshold;
    }

    return bestPercent >= threshold;
  }

  if (clinicIds.length > 0) {
    return catalogIncludesAllClinicsForType(plan, type, clinicIds);
  }

  return true;
}

function matchesCatalogClinicOnlyFilter(
  _plan: HealthPlanCatalogItem,
  _filters: DashboardFiltersState,
): boolean {
  return true;
}

function matchesCatalogZoneFilter(
  plan: HealthPlanCatalogItem,
  filters: DashboardFiltersState,
): boolean {
  if (!isCheckboxGroupActive(filters.zones)) return true;
  const activeIds = getActiveCheckboxIds(filters.zones);
  if (activeIds.length === 0) return true;
  if (plan.zones.length === 0) return false;

  const active = new Set(activeIds);
  return plan.zones.some((zoneId) => active.has(zoneId));
}

export function applyDashboardFiltersToCatalog(
  plans: HealthPlanCatalogItem[],
  filters: DashboardFiltersState,
): HealthPlanCatalogItem[] {
  return plans.filter(
    (plan) =>
      matchesIsapreFilter(plan, filters) &&
      matchesCatalogZoneFilter(plan, filters) &&
      matchesPlanTypeFilter(plan, filters) &&
      matchesCatalogClinicOnlyFilter(plan, filters) &&
      matchesCatalogCoverageTypeFilter(plan, "hospitalaria", filters) &&
      matchesCatalogCoverageTypeFilter(plan, "ambulatoria", filters),
  );
}
