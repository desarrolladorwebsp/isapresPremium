import { buildCoverageSummary } from "@/lib/api/plan-summary";
import { enrichHealthPlanZones } from "@/lib/plan-zones";
import type {
  ClinicCoverageIndex,
  CoverageEntry,
  HealthPlan,
  HealthPlanCatalogItem,
} from "@/types/plan";

export function buildClinicCoverageIndex(
  coverage: CoverageEntry[],
): ClinicCoverageIndex {
  const index: ClinicCoverageIndex = {};

  for (const entry of coverage) {
    const current = index[entry.clinic_id] ?? [0, 0];
    if (entry.type === "hospitalaria") {
      current[0] = Math.max(current[0], entry.percentage);
    } else {
      current[1] = Math.max(current[1], entry.percentage);
    }
    index[entry.clinic_id] = current;
  }

  return index;
}

export function buildHealthPlanCatalogItem(
  plan: Omit<HealthPlan, "coverage">,
  coverage: CoverageEntry[],
): HealthPlanCatalogItem {
  const enriched = enrichHealthPlanZones({ ...plan, coverage });

  return {
    isapre: enriched.isapre,
    plan_name: enriched.plan_name,
    unique_code: enriched.unique_code,
    base_price_uf: enriched.base_price_uf,
    ges_premium_uf: enriched.ges_premium_uf,
    plan_type: enriched.plan_type,
    has_top: enriched.has_top,
    additional_notes: enriched.additional_notes,
    pdf_url: enriched.pdf_url,
    pdf_public_id: enriched.pdf_public_id,
    coverage_summary: buildCoverageSummary(coverage),
    zones: enriched.zones,
    clinic_index: buildClinicCoverageIndex(coverage),
  };
}

export function attachCoverageToHealthPlan(
  plan: Omit<HealthPlan, "coverage">,
  coverage: CoverageEntry[],
): HealthPlan {
  return enrichHealthPlanZones({ ...plan, coverage });
}
