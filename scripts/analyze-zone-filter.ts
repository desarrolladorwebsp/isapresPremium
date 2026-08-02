import path from "node:path";
import { config } from "dotenv";
import { applyDashboardFilters } from "../lib/apply-plan-filters";
import { findManyHealthPlans } from "../lib/api/plan-query";
import { resolveClinicZoneIds } from "../lib/clinic-zones";
import {
  createDefaultDashboardFilters,
  toggleCheckboxFilter,
} from "../lib/filter-options";
import { resolvePlanZoneIds } from "../lib/plan-zones";

config({ path: path.join(process.cwd(), ".env.local") });

async function main() {
  const plans = await findManyHealthPlans();
  let withZones = 0;
  let withoutZones = 0;
  const unmapped = new Set<string>();

  for (const plan of plans) {
    const zoneIds = resolvePlanZoneIds(plan);
    if (zoneIds.length > 0) withZones += 1;
    else withoutZones += 1;

    for (const entry of plan.coverage) {
      if (resolveClinicZoneIds(entry.clinic_id, entry.clinic_name).length === 0) {
        unmapped.add(entry.clinic_id);
      }
    }
  }

  const base = createDefaultDashboardFilters();

  function countForZone(zoneId: string): number {
    const filters = {
      ...base,
      zones: toggleCheckboxFilter(base.zones, zoneId, true),
    };
    return applyDashboardFilters(plans, filters).length;
  }

  console.log(
    JSON.stringify(
      {
        total: plans.length,
        withZones,
        withoutZones,
        unmappedClinics: unmapped.size,
        unmappedSample: [...unmapped].slice(0, 25),
        noZoneFilter: applyDashboardFilters(plans, base).length,
        rmOriente: countForZone("rm-oriente"),
        norte: countForZone("norte"),
        valparaiso: countForZone("valparaiso"),
        biobio: countForZone("biobio"),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
