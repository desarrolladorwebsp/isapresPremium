import { findManyHealthPlans } from "@/lib/api/plan-query";
import { resolveIsapreIdFromName } from "@/lib/isapre-catalog";
import type { IsapreFeaturedPlan, IsaprePageStats } from "@/lib/isapre-pages/types";
import type { HealthPlan } from "@/types/plan";

function pickFeaturedPlans(
  plans: HealthPlan[],
  descriptions: Record<string, string>,
): IsapreFeaturedPlan[] {
  if (plans.length === 0) return [];

  const sorted = [...plans].sort(
    (a, b) => a.base_price_uf - b.base_price_uf,
  );
  const cheapest = sorted[0];
  const mid = sorted[Math.floor(sorted.length / 2)];
  const top = sorted[sorted.length - 1];

  const picks: Array<{ plan: HealthPlan; badge?: IsapreFeaturedPlan["badge"]; key: string }> =
    [
      { plan: cheapest, badge: "economico", key: "economico" },
      { plan: mid, key: "medio" },
      { plan: top, badge: "premium", key: "premium" },
    ];

  const seen = new Set<string>();
  const featured: IsapreFeaturedPlan[] = [];

  for (const pick of picks) {
    if (seen.has(pick.plan.unique_code)) continue;
    seen.add(pick.plan.unique_code);
    featured.push({
      code: pick.plan.unique_code,
      name: pick.plan.plan_name.replace(/^(Banmédica|Colmena|Consalud|Cruz Blanca|Vida Tres|Nueva Masvida|Esencial)\s+/i, ""),
      priceUf: Math.round(pick.plan.base_price_uf * 100) / 100,
      description:
        descriptions[pick.key] ??
        "Plan disponible en el catálogo de Cotizador Premium.",
      badge: pick.badge,
    });
  }

  return featured;
}

function computeStatsForPlans(
  plans: HealthPlan[],
  descriptions: Record<string, string>,
): IsaprePageStats {
  if (plans.length === 0) {
    return {
      planCount: 0,
      minPriceUf: null,
      avgHospitalPct: null,
      avgAmbulatoryPct: null,
      providerCount: 0,
      featuredPlans: [],
    };
  }

  const hospitalPcts: number[] = [];
  const ambulatoryPcts: number[] = [];
  const clinics = new Set<string>();
  let minPrice = Infinity;

  for (const plan of plans) {
    minPrice = Math.min(minPrice, plan.base_price_uf);
    for (const entry of plan.coverage) {
      if (entry.clinic_id) clinics.add(entry.clinic_id);
      if (entry.type === "hospitalaria" && entry.percentage) {
        hospitalPcts.push(entry.percentage);
      }
      if (entry.type === "ambulatoria" && entry.percentage) {
        ambulatoryPcts.push(entry.percentage);
      }
    }
  }

  const avg = (values: number[]) =>
    values.length
      ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
      : null;

  return {
    planCount: plans.length,
    minPriceUf: minPrice === Infinity ? null : Math.round(minPrice * 100) / 100,
    avgHospitalPct: avg(hospitalPcts),
    avgAmbulatoryPct: avg(ambulatoryPcts),
    providerCount: clinics.size,
    featuredPlans: pickFeaturedPlans(plans, descriptions),
  };
}

export async function loadIsaprePageStats(
  isapreId: string,
  descriptions: Record<string, string>,
): Promise<IsaprePageStats> {
  const plans = await findManyHealthPlans();
  const filtered = plans.filter(
    (plan) => resolveIsapreIdFromName(plan.isapre) === isapreId,
  );
  return computeStatsForPlans(filtered, descriptions);
}
