import { ZONE_FILTER_OPTIONS } from "@/lib/filter-options";
import type { DashboardFiltersState } from "@/types/filters";
import type { ZoneId } from "@/types/zone";

/** Zonas del filtro lateral que cubren la Región Metropolitana completa. */
export const RM_ZONE_FILTER_IDS: readonly ZoneId[] = [
  "rm-metropolitana",
  "rm-norte",
  "rm-sur",
  "rm-oriente",
  "rm-poniente",
  "rm-centro",
];

/**
 * Mapeo región administrativa (barra de criterios / deep link `region`)
 * → zonas del filtro geográfico del cotizador.
 */
export const REGION_TO_ZONE_IDS: Record<string, readonly ZoneId[]> = {
  rm: RM_ZONE_FILTER_IDS,
  arica: ["norte"],
  tarapaca: ["norte"],
  antofagasta: ["norte"],
  atacama: ["norte"],
  coquimbo: ["norte"],
  valparaiso: ["valparaiso"],
  ohiggins: ["octava"],
  maule: ["octava"],
  nuble: ["octava"],
  biobio: ["biobio", "octava"],
  araucania: ["biobio"],
  los_rios: ["biobio"],
  los_lagos: ["biobio"],
  aysen: ["biobio"],
  magallanes: ["biobio"],
};

export function resolveZoneIdsFromRegion(
  region: string | null | undefined,
): ZoneId[] {
  if (!region?.trim()) return [];
  const zoneIds = REGION_TO_ZONE_IDS[region.trim().toLowerCase()];
  return zoneIds ? [...zoneIds] : [];
}

export function buildZoneFilterStateFromRegion(
  region: string | null | undefined,
): Record<string, boolean> {
  const activeZoneIds = new Set(resolveZoneIdsFromRegion(region));
  return Object.fromEntries(
    ZONE_FILTER_OPTIONS.map((option) => [
      option.id,
      activeZoneIds.has(option.id as ZoneId),
    ]),
  );
}

/** Aplica la región seleccionada al estado de zonas del panel de filtros. */
export function applyRegionToDashboardFilters(
  filters: DashboardFiltersState,
  region: string | null | undefined,
): DashboardFiltersState {
  const zoneIds = resolveZoneIdsFromRegion(region);
  if (zoneIds.length === 0) return filters;

  return {
    ...filters,
    zones: buildZoneFilterStateFromRegion(region),
  };
}
