import { ZONE_FILTER_OPTIONS } from "@/lib/filter-options";

export type ZoneId = (typeof ZONE_FILTER_OPTIONS)[number]["id"];

export const ZONE_IDS = ZONE_FILTER_OPTIONS.map(
  (option) => option.id,
) as ZoneId[];

/** Subsectores de la Región Metropolitana + cobertura RM amplia. */
export const RM_ZONE_IDS = [
  "rm-metropolitana",
  "rm-norte",
  "rm-sur",
  "rm-oriente",
  "rm-poniente",
  "rm-centro",
] as const satisfies readonly ZoneId[];

export const NORTE_ZONE_IDS = ["norte", "octava"] as const satisfies readonly ZoneId[];
