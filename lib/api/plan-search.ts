import { getCachedCatalogItems } from "@/lib/api/plan-catalog-cache";
import { filterCatalogItems } from "@/lib/filter-catalog-items";
import { prisma } from "@/lib/prisma";
import {
  getActiveCheckboxIds,
  getActiveAmbulatoryClinicIds,
  getActiveHospitalClinicIds,
  isCheckboxGroupActive,
} from "@/lib/filter-options";
import { sortPlansByBasePriceAsc } from "@/lib/plan-sort";
import type { DashboardFiltersState } from "@/types/filters";
import type { PlanSearchResult } from "@/types/plan";

export interface PlanSearchQuery {
  q?: string;
  priceMin?: number;
  priceMax?: number;
  filters?: DashboardFiltersState;
  limit?: number;
  offset?: number;
}

function parseDashboardFilters(
  searchParams: URLSearchParams,
): DashboardFiltersState | undefined {
  const raw = searchParams.get("filters");
  if (!raw) return undefined;

  try {
    return JSON.parse(raw) as DashboardFiltersState;
  } catch {
    return undefined;
  }
}

export function parsePlanSearchQuery(
  searchParams: URLSearchParams,
): PlanSearchQuery {
  const priceMinRaw = searchParams.get("priceMin");
  const priceMaxRaw = searchParams.get("priceMax");

  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");

  return {
    q: searchParams.get("q")?.trim() || undefined,
    priceMin: priceMinRaw !== null ? Number(priceMinRaw) : undefined,
    priceMax: priceMaxRaw !== null ? Number(priceMaxRaw) : undefined,
    filters: parseDashboardFilters(searchParams),
    limit: limitRaw !== null ? Number(limitRaw) : undefined,
    offset: offsetRaw !== null ? Number(offsetRaw) : undefined,
  };
}

export async function searchPlanSummaries(
  query: PlanSearchQuery,
): Promise<PlanSearchResult> {
  const catalog = await getCachedCatalogItems();
  return filterCatalogItems(catalog, query);
}

/** Primeros N planes del catálogo (desde caché en memoria). */
export async function readLimitedPlanSummaries(
  limit: number,
): Promise<PlanSearchResult> {
  const safeLimit =
    Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 1;

  const allPlans = await getCachedCatalogItems();
  const summaries = sortPlansByBasePriceAsc(allPlans).slice(0, safeLimit);

  return {
    plans: summaries,
    total: allPlans.length,
    limit: safeLimit,
    offset: 0,
  };
}

/** TTL del rango de precios (evita cargar el catálogo completo solo por bounds). */
const BOUNDS_CACHE_TTL_MS = 30 * 60 * 1000;

let boundsCache: {
  priceMin: number;
  priceMax: number;
  totalPlans: number;
  loadedAt: number;
} | null = null;

let boundsInflight: Promise<{
  priceMin: number;
  priceMax: number;
  totalPlans: number;
}> | null = null;

async function loadPlanCatalogBoundsFromDb(): Promise<{
  priceMin: number;
  priceMax: number;
  totalPlans: number;
}> {
  const rows = await prisma.$queryRaw<
    Array<{ price_min: number; price_max: number; total: bigint }>
  >`
    SELECT
      COALESCE(MIN(base_price_uf), 0)::float AS price_min,
      COALESCE(MAX(base_price_uf), 10)::float AS price_max,
      COUNT(*)::bigint AS total
    FROM plans
  `;

  const row = rows[0];
  const totalPlans = Number(row?.total ?? 0);

  if (totalPlans === 0) {
    return { priceMin: 0, priceMax: 10, totalPlans: 0 };
  }

  return {
    priceMin: row?.price_min ?? 0,
    priceMax: row?.price_max ?? 10,
    totalPlans,
  };
}

export async function readPlanCatalogBounds(): Promise<{
  priceMin: number;
  priceMax: number;
  totalPlans: number;
}> {
  const now = Date.now();

  if (boundsCache && now - boundsCache.loadedAt < BOUNDS_CACHE_TTL_MS) {
    const { priceMin, priceMax, totalPlans } = boundsCache;
    return { priceMin, priceMax, totalPlans };
  }

  if (boundsInflight) {
    return boundsInflight;
  }

  boundsInflight = loadPlanCatalogBoundsFromDb()
    .then((bounds) => {
      boundsCache = { ...bounds, loadedAt: Date.now() };
      return bounds;
    })
    .finally(() => {
      boundsInflight = null;
    });

  return boundsInflight;
}

export function invalidatePlanCatalogBoundsCache(): void {
  boundsCache = null;
}

/** Expone filtros activos para depuración en cliente (opcional). */
export function describeActiveFilters(filters: DashboardFiltersState): string {
  const parts: string[] = [];
  if (isCheckboxGroupActive(filters.isapres)) {
    parts.push(`isapres:${getActiveCheckboxIds(filters.isapres).join(",")}`);
  }
  if (isCheckboxGroupActive(filters.planTypes)) {
    parts.push(`tipos:${getActiveCheckboxIds(filters.planTypes).join(",")}`);
  }
  if (isCheckboxGroupActive(filters.zones)) {
    parts.push(`zonas:${getActiveCheckboxIds(filters.zones).join(",")}`);
  }
  const hospitalClinicIds = getActiveHospitalClinicIds(filters);
  if (hospitalClinicIds.length > 0) {
    parts.push(`clinicaH:${hospitalClinicIds.join(",")}`);
  }
  const ambulatoryClinicIds = getActiveAmbulatoryClinicIds(filters);
  if (ambulatoryClinicIds.length > 0) {
    parts.push(`clinicaA:${ambulatoryClinicIds.join(",")}`);
  }
  return parts.join(" ");
}
