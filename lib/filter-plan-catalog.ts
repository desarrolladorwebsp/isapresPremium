import { applyDashboardFilters } from "@/lib/apply-plan-filters";
import { mapHealthPlanToSummary } from "@/lib/api/plan-summary";
import type { PlanSearchQuery } from "@/lib/api/plan-search";
import { sortPlansByBasePriceAsc } from "@/lib/plan-sort";
import { MAX_PLAN_SEARCH_LIMIT } from "@/lib/plan-search-config";
import type { HealthPlan, HealthPlanSummary, PlanSearchResult } from "@/types/plan";

function matchesTextQuery(plan: HealthPlanSummary, query: string): boolean {
  const normalized = query.toLowerCase();
  return (
    plan.plan_name.toLowerCase().includes(normalized) ||
    plan.unique_code.toLowerCase().includes(normalized) ||
    plan.isapre.toLowerCase().includes(normalized)
  );
}

function matchesPriceRange(
  plan: HealthPlanSummary,
  priceMin?: number,
  priceMax?: number,
): boolean {
  if (priceMin !== undefined && Number.isFinite(priceMin)) {
    if (plan.base_price_uf < priceMin) return false;
  }
  if (priceMax !== undefined && Number.isFinite(priceMax)) {
    if (plan.base_price_uf > priceMax) return false;
  }
  return true;
}

function clampSearchLimit(limit: number | undefined, total: number): number {
  if (limit === undefined || !Number.isFinite(limit) || limit <= 0) {
    return total;
  }

  return Math.min(Math.floor(limit), MAX_PLAN_SEARCH_LIMIT, total);
}

/** Filtra el catálogo en memoria (misma lógica que GET /api/plans/search). */
export function filterPlanCatalog(
  catalog: HealthPlan[],
  query: PlanSearchQuery,
): PlanSearchResult {
  let plans = catalog;

  if (query.filters) {
    plans = applyDashboardFilters(plans, query.filters);
  }

  let summaries = plans.map(mapHealthPlanToSummary);

  if (query.q) {
    summaries = summaries.filter((plan) => matchesTextQuery(plan, query.q!));
  }

  summaries = summaries.filter((plan) =>
    matchesPriceRange(plan, query.priceMin, query.priceMax),
  );

  summaries = sortPlansByBasePriceAsc(summaries);

  const total = summaries.length;
  const offset =
    query.offset !== undefined && Number.isFinite(query.offset) && query.offset > 0
      ? Math.floor(query.offset)
      : 0;
  const limit = clampSearchLimit(query.limit, total);

  return {
    plans: summaries.slice(offset, offset + limit),
    total,
    limit,
    offset,
  };
}
