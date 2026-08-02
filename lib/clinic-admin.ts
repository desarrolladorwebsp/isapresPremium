import { ZONE_FILTER_OPTIONS } from "@/lib/filter-options";
import { resolveClinicZoneIds } from "@/lib/clinic-zones";
import type { Clinic, HealthPlan } from "@/domain";
import type { CoverageEntry } from "@/types/plan";

const ZONE_LABEL_BY_ID = Object.fromEntries(
  ZONE_FILTER_OPTIONS.map((option) => [option.id, option.label]),
);

export type ClinicSortKey =
  | "name_asc"
  | "name_desc"
  | "zone_asc"
  | "plans_desc"
  | "plans_asc";

export interface ClinicPlanUsage {
  plan: HealthPlan;
  coverages: CoverageEntry[];
}

export function getClinicZoneIds(clinic: Clinic): string[] {
  if (clinic.zones.length > 0) return clinic.zones;
  return resolveClinicZoneIds(clinic.id, clinic.name);
}

export function getZoneLabel(zoneId: string): string {
  return ZONE_LABEL_BY_ID[zoneId] ?? zoneId;
}

export function countCoverageEntries(
  plans: HealthPlan[],
  clinicId: string,
): number {
  return plans.reduce(
    (total, plan) =>
      total +
      plan.coverage.filter((entry) => entry.clinic_id === clinicId).length,
    0,
  );
}

export function getPlansForClinic(
  plans: HealthPlan[],
  clinicId: string,
): ClinicPlanUsage[] {
  return plans
    .map((plan) => ({
      plan,
      coverages: plan.coverage.filter((entry) => entry.clinic_id === clinicId),
    }))
    .filter((item) => item.coverages.length > 0)
    .sort((a, b) => a.plan.plan_name.localeCompare(b.plan.plan_name, "es"));
}

export function clinicMatchesZoneFilter(
  clinic: Clinic,
  zoneFilter: string,
): boolean {
  if (zoneFilter === "all") return true;
  if (zoneFilter === "none") return getClinicZoneIds(clinic).length === 0;
  return getClinicZoneIds(clinic).includes(zoneFilter);
}

export function sortClinics(
  items: Clinic[],
  plans: HealthPlan[],
  sortKey: ClinicSortKey,
): Clinic[] {
  const sorted = [...items];

  sorted.sort((a, b) => {
    switch (sortKey) {
      case "name_desc":
        return b.name.localeCompare(a.name, "es");
      case "zone_asc": {
        const zoneA = getZoneLabel(getClinicZoneIds(a)[0] ?? "zzz");
        const zoneB = getZoneLabel(getClinicZoneIds(b)[0] ?? "zzz");
        const byZone = zoneA.localeCompare(zoneB, "es");
        return byZone !== 0 ? byZone : a.name.localeCompare(b.name, "es");
      }
      case "plans_desc":
        return (
          getPlansForClinic(plans, b.id).length -
          getPlansForClinic(plans, a.id).length
        );
      case "plans_asc":
        return (
          getPlansForClinic(plans, a.id).length -
          getPlansForClinic(plans, b.id).length
        );
      case "name_asc":
      default:
        return a.name.localeCompare(b.name, "es");
    }
  });

  return sorted;
}
