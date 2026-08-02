import type { DashboardFiltersState } from "@/types/filters";

export interface PlanSearchRequest {
  q?: string;
  priceMin?: number;
  priceMax?: number;
  filters?: DashboardFiltersState;
  limit?: number;
  offset?: number;
}

/** Clave estable para deduplicar búsquedas idénticas. */
export function buildPlanSearchRequestKey(request: PlanSearchRequest): string {
  return JSON.stringify({
    q: request.q?.trim() || "",
    priceMin: request.priceMin ?? null,
    priceMax: request.priceMax ?? null,
    limit: request.limit ?? null,
    offset: request.offset ?? null,
    filters: request.filters ?? null,
  });
}

export function buildPlanSearchUrl(request: PlanSearchRequest): string {
  const params = new URLSearchParams();

  if (request.q?.trim()) {
    params.set("q", request.q.trim());
  }
  if (request.priceMin !== undefined) {
    params.set("priceMin", String(request.priceMin));
  }
  if (request.priceMax !== undefined) {
    params.set("priceMax", String(request.priceMax));
  }
  if (request.filters) {
    params.set("filters", JSON.stringify(request.filters));
  }
  if (request.limit !== undefined) {
    params.set("limit", String(request.limit));
  }
  if (request.offset !== undefined) {
    params.set("offset", String(request.offset));
  }

  return `/api/plans/search?${params.toString()}`;
}
