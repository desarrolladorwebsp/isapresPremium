import { findManyHealthPlanCatalogItems } from "@/lib/api/plan-query";
import { findManyHealthPlans } from "@/lib/api/plan-query";
import { invalidateCoverageCache } from "@/lib/api/plan-coverage-cache";
import { invalidatePlanCatalogBoundsCache } from "@/lib/api/plan-search";
import { invalidatePlanCatalogClinicsCache } from "@/lib/api/plan-clinics";
import type { HealthPlan, HealthPlanCatalogItem } from "@/types/plan";

/** TTL del catálogo en memoria del servidor (reduce transferencia Neon). */
const CATALOG_CACHE_TTL_MS = 30 * 60 * 1000;

interface CatalogCacheEntry {
  plans: HealthPlan[];
  loadedAt: number;
}

interface CatalogItemsCacheEntry {
  items: HealthPlanCatalogItem[];
  loadedAt: number;
}

let catalogCache: CatalogCacheEntry | null = null;
let catalogInflight: Promise<HealthPlan[]> | null = null;

let catalogItemsCache: CatalogItemsCacheEntry | null = null;
let catalogItemsInflight: Promise<HealthPlanCatalogItem[]> | null = null;

/** Catálogo completo (admin / filtros internos) con deduplicación de requests. */
export async function getCachedHealthPlans(): Promise<HealthPlan[]> {
  const now = Date.now();

  if (
    catalogCache &&
    now - catalogCache.loadedAt < CATALOG_CACHE_TTL_MS
  ) {
    return catalogCache.plans;
  }

  if (catalogInflight) {
    return catalogInflight;
  }

  catalogInflight = findManyHealthPlans()
    .then((plans) => {
      catalogCache = { plans, loadedAt: Date.now() };
      return plans;
    })
    .finally(() => {
      catalogInflight = null;
    });

  return catalogInflight;
}

/** Catálogo ligero para cotizador público (sin arrays coverage en el payload). */
export async function getCachedCatalogItems(): Promise<HealthPlanCatalogItem[]> {
  const now = Date.now();

  if (
    catalogItemsCache &&
    now - catalogItemsCache.loadedAt < CATALOG_CACHE_TTL_MS
  ) {
    return catalogItemsCache.items;
  }

  if (catalogItemsInflight) {
    return catalogItemsInflight;
  }

  catalogItemsInflight = findManyHealthPlanCatalogItems()
    .then((items) => {
      catalogItemsCache = { items, loadedAt: Date.now() };
      return items;
    })
    .finally(() => {
      catalogItemsInflight = null;
    });

  return catalogItemsInflight;
}

export function invalidatePlanCatalogCache(): void {
  catalogCache = null;
  catalogItemsCache = null;
  invalidatePlanCatalogBoundsCache();
  invalidateCoverageCache();
  invalidatePlanCatalogClinicsCache();
}
