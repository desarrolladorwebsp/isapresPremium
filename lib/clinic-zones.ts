import { slugifyClinicId } from "@/lib/slugify";
import {
  NORTE_ZONE_IDS,
  RM_ZONE_IDS,
  ZONE_IDS,
  type ZoneId,
} from "@/types/zone";

/** Cobertura libre elección: aplica en cualquier zona del filtro. */
export const LIBRE_ELECCION_ZONE_IDS = [...ZONE_IDS] as ZoneId[];

/** Redes con presencia metropolitana amplia (solo padre RM, no todos los sectores). */
const RM_WIDE: ZoneId[] = ["rm-metropolitana"];
const RM_ORIENTE: ZoneId[] = ["rm-oriente", "rm-metropolitana"];
const RM_CENTRO: ZoneId[] = ["rm-centro", "rm-metropolitana"];
const RM_PONIENTE: ZoneId[] = ["rm-poniente", "rm-metropolitana"];
const RM_SUR: ZoneId[] = ["rm-sur", "rm-metropolitana"];
const RM_NORTE: ZoneId[] = ["rm-norte", "rm-metropolitana"];
const NORTE: ZoneId[] = [...NORTE_ZONE_IDS];
const VALPARAISO: ZoneId[] = ["valparaiso"];
/** Octava / O’Higgins / Maule / Ñuble (criterio de producto actual). */
const OCTAVA: ZoneId[] = ["octava"];
/** Biobío y sur (Araucanía, Los Ríos, Los Lagos, Aysén, Magallanes). */
const BIOBIO: ZoneId[] = ["biobio"];

/**
 * Zonas geográficas por clínica/prestador.
 * Una clínica de sector RM lleva [sector, rm-metropolitana].
 * Fuera de RM: solo la zona regional correspondiente (sin mezclar RM).
 */
const CLINIC_ZONE_MAP: Record<string, readonly ZoneId[]> = {
  // Redes con cobertura metropolitana amplia
  integramedica: RM_WIDE,
  vidaintegra: RM_WIDE,
  "cm-redsalud": RM_WIDE,
  "cm-santa-maria": RM_ORIENTE,
  "cl-centros-medicos-santa-maria": RM_ORIENTE,
  "cl-hospital-clinico-uc-christus-clinica-santa-maria": RM_ORIENTE,
  "cm-davila": RM_NORTE,
  "cm-red-davila": RM_NORTE,
  centromed: VALPARAISO,
  "cl-centromed": VALPARAISO,
  "centros-medicos-red-uc-christus": RM_ORIENTE,
  "cl-red-uc-christus": RM_ORIENTE,

  // RM Oriente
  "cl-las-condes": RM_ORIENTE,
  "cl-san-carlos": RM_ORIENTE,
  "cl-redsalud-vitacura": RM_ORIENTE,
  "red-uc-christus": RM_ORIENTE,
  "red-uc-christus-a3": RM_ORIENTE,
  "red-uc-christus-a4": RM_ORIENTE,
  "cl-indisa-providencia-anexo": RM_ORIENTE,
  "cl-redsalud-providencia": RM_ORIENTE,
  "cl-redsalud-providencia-avansalud": RM_ORIENTE,
  "cl-alemana-santiago": RM_ORIENTE,
  "cl-alemana-santiago-a": RM_ORIENTE,
  "cl-alemana-santiago-a2": RM_ORIENTE,
  "cl-alemana-santiago-a3": RM_ORIENTE,
  "cl-santa-maria": RM_ORIENTE,
  "cl-univ-andes": RM_ORIENTE,
  "cl-los-leones": RM_ORIENTE,
  "cl-los-carrera": VALPARAISO,
  "cl-los-carrera-interclinica": VALPARAISO,
  "cl-cordillera": RM_ORIENTE,
  "cl-uc": RM_ORIENTE,
  "hospital-clinico-uc": RM_CENTRO,
  "clinica-universidad-de-los-andes": RM_ORIENTE,
  "clinica-los-leones": RM_ORIENTE,
  "clinica-redsalud-providencia": RM_ORIENTE,
  "clinica-alemana": RM_ORIENTE,
  "clinica-los-carrera-interclinica": VALPARAISO,
  falp: RM_ORIENTE,

  // RM Centro
  "cl-meds": RM_CENTRO,
  "cl-redsalud-santiago": RM_CENTRO,
  "cl-redsalud-santiago-bicentenario": RM_CENTRO,
  "cl-hospital-del-profesor": RM_CENTRO,
  "hosp-clinico-uc": RM_CENTRO,
  "hosp-clinico-uc-a2": RM_CENTRO,
  "hosp-clinico-uch": RM_CENTRO,
  "hosp-clinico-uch-a2": RM_CENTRO,
  "hosp-clinico-uch-a3": RM_CENTRO,
  "hosp-clinico-uch-a4": RM_CENTRO,

  // RM Poniente
  "cl-indisa-maipu": RM_PONIENTE,
  "cl-bupa-santiago": RM_PONIENTE,
  "cl-bupan-santiago": RM_PONIENTE,

  // RM Sur
  "hosp-parroquial-san-bernardo": RM_SUR,

  // RM Norte (sector) — Dávila Recoleta / Vespucio
  "cl-davila": RM_NORTE,
  "cl-davila-a3": RM_NORTE,
  "cl-davila-vespucio": RM_NORTE,
  "clinica-davila-vespucio": RM_NORTE,

  // Zona Norte (regiones)
  "cl-san-jose-arica": NORTE,
  "cl-san-jose-interclinica": NORTE,
  "cl-atacama": NORTE,
  "cl-atacama-achs": NORTE,
  "cl-portada-achs": NORTE,
  "cl-regional-la-portada": NORTE,
  "cl-la-portada": NORTE,
  "cl-la-portad": NORTE,
  "cl-redsalud-iquique": NORTE,
  "cl-tarapaca": NORTE,
  "cl-redsalud-elqui": NORTE,
  "cl-andes-salud-el-loa": NORTE,
  "cl-bupa-antofagasta": NORTE,
  "clinica-bupa-antofagasta": NORTE,
  "clinica-tarapaca-interclinica": NORTE,
  "cl-tarapaca-interclinica": NORTE,
  "cl-fleming-arica": NORTE,

  // Valparaíso
  "cl-redsalud-valparaiso": VALPARAISO,
  "cl-bupa-renaca": VALPARAISO,
  "cl-ciudad-del-mar": VALPARAISO,
  "hosp-vina-del-mar": VALPARAISO,
  "clinica-redsalud-valparaiso": VALPARAISO,
  "clinica-bupa-renaca": VALPARAISO,
  "clinica-ciudad-del-mar": VALPARAISO,
  "hospital-clinico-vina-del-mar": VALPARAISO,
  "cl-clinica-renaca": VALPARAISO,
  "cl-san-antonio": VALPARAISO,

  // O’Higgins / Maule / Ñuble → Octava (catálogo de filtros actual)
  "cl-redsalud-rancagua": OCTAVA,
  "cl-andes-salud-chillan": OCTAVA,
  "cl-andes-salud-talca": OCTAVA,
  "centro-medico-andes-salud-talca": OCTAVA,
  "cm-andes-salud-talca": OCTAVA,
  "clinica-curico-achs-salud": OCTAVA,
  "clinica-lircay-achs-salud": OCTAVA,
  "cl-lircay-de-talca-clinica-los-andes-de-los-angeles": OCTAVA,
  "cl-los-andes-la": OCTAVA,
  "clinica-los-andes-achs-salud": OCTAVA,
  "cm-andes-salud-la": OCTAVA,
  "cl-adventista-los-angeles": OCTAVA,

  // Biobío
  "cl-biobio": BIOBIO,
  "cl-andes-salud-concepcion": BIOBIO,
  "sanatorio-aleman": BIOBIO,
  "hosp-clinico-fusat": BIOBIO,
  "clinica-biobio": BIOBIO,
  "clinica-andes-salud-concepcion": BIOBIO,
  "clinica-sanatorio-aleman": BIOBIO,
  "hospital-clinico-fusat": BIOBIO,
  "hosp-clinico-del-sur": BIOBIO,
  "clinica-del-sur-achs-salud": BIOBIO,
  "centro-medico-redsalud-arauco": BIOBIO,
  "cl-juan-pablo-ii": BIOBIO,
  "hosp-ffaa-guzman": BIOBIO,

  // Sur Austral (sin zona propia en el catálogo → Biobío)
  "cl-alemana-osorno": BIOBIO,
  "cl-alemana-temuco": BIOBIO,
  "cl-alemana-valdivia": BIOBIO,
  "cl-andes-salud-puerto-montt": BIOBIO,
  "cl-puerto-montt": BIOBIO,
  "cl-puerto-varas": BIOBIO,
  "cl-redsalud-magallanes": BIOBIO,
  "cl-redsalud-mayor": BIOBIO,
  "clinica-alemana-de-osorno": BIOBIO,
  "clinica-alemana-de-temuco": BIOBIO,
  "clinica-alemana-de-valdivia": BIOBIO,
  "clinica-andes-salud-puerto-montt": BIOBIO,
  "clinica-puerto-montt-achs-salud": BIOBIO,
  "clinica-puerto-varas": BIOBIO,
  "clinica-redsalud-magallanes": BIOBIO,
  "clinica-redsalud-mayor-temuco": BIOBIO,
  "cm-andes-salud-ancud": BIOBIO,

  // Centros médicos / redes adicionales
  "cl-centros-medicos-davila": RM_NORTE,
  "cl-red-cm-uc-christus-e": RM_ORIENTE,

  // RM — prestadores adicionales
  "cl-cumbres-del-norte": RM_NORTE,
  "clinica-isamedica": RM_WIDE,
  "cl-las-amapolas": RM_ORIENTE,
  "cl-sierra-bella": RM_CENTRO,
  "hosp-clinico-fach": RM_WIDE,
  "hosp-militar-santiago": RM_WIDE,
  "clinica-indisa": RM_ORIENTE,
  "clinica-san-carlos-de-apoquindo": RM_ORIENTE,

  // Regiones
  "cl-rio-blanco": NORTE,
  "hosp-militar-norte": NORTE,
  "hosp-naval-nef": VALPARAISO,
  "clinica-renaca": VALPARAISO,
  "cl-clinica-san-jose": NORTE,

  // Placeholders libre elección (sin prestador geográfico fijo)
  "mv-libre-eleccion-h": LIBRE_ELECCION_ZONE_IDS,
  "mv-libre-eleccion-a": LIBRE_ELECCION_ZONE_IDS,
  "vt-libre-eleccion-h": LIBRE_ELECCION_ZONE_IDS,
  "vt-libre-eleccion-a": LIBRE_ELECCION_ZONE_IDS,
  "col-libre-eleccion-h": LIBRE_ELECCION_ZONE_IDS,
  "col-libre-eleccion-a": LIBRE_ELECCION_ZONE_IDS,
  "cb-libre-eleccion-h": LIBRE_ELECCION_ZONE_IDS,
  "cb-libre-eleccion-a": LIBRE_ELECCION_ZONE_IDS,
  "ban-libre-eleccion-h": LIBRE_ELECCION_ZONE_IDS,
  "ban-libre-eleccion-a": LIBRE_ELECCION_ZONE_IDS,
  "cs-libre-eleccion-h": LIBRE_ELECCION_ZONE_IDS,
  "cs-libre-eleccion-a": LIBRE_ELECCION_ZONE_IDS,
};

/** Alias automáticos clinica-* → cl-* para IDs importados con otro prefijo. */
function buildClinicZoneLookup(): ReadonlyMap<string, readonly ZoneId[]> {
  const lookup = new Map<string, readonly ZoneId[]>();

  for (const [clinicId, zones] of Object.entries(CLINIC_ZONE_MAP)) {
    lookup.set(clinicId, zones);
  }

  for (const [clinicId, zones] of Object.entries(CLINIC_ZONE_MAP)) {
    if (clinicId.startsWith("cl-")) {
      lookup.set(`clinica-${clinicId.slice(3)}`, zones);
    }
    if (clinicId.startsWith("hosp-")) {
      lookup.set(`hospital-${clinicId}`, zones);
      lookup.set(`hospital-clinico-${clinicId.slice(5)}`, zones);
    }
  }

  return lookup;
}

const CLINIC_ZONE_LOOKUP = buildClinicZoneLookup();

/** Largo mínimo para matching fuzzy (evita que IDs genéricos enganchen todo). */
const MIN_FUZZY_MATCH_LENGTH = 12;

function lookupClinicZoneIds(clinicId: string): ZoneId[] {
  const zones = CLINIC_ZONE_LOOKUP.get(clinicId.trim());
  return zones ? [...zones] : [];
}

/** Genera variantes de ID para resolver importaciones con distintos prefijos. */
export function buildClinicIdLookupCandidates(clinicId: string): string[] {
  const id = clinicId.trim();
  if (!id) return [];

  const candidates = new Set<string>([id]);

  if (id.startsWith("clinica-")) {
    candidates.add(`cl-${id.slice("clinica-".length)}`);
  }
  if (id.startsWith("cl-")) {
    candidates.add(`clinica-${id.slice(3)}`);
  }
  if (id.startsWith("hospital-clinico-")) {
    const tail = id.slice("hospital-clinico-".length);
    candidates.add(`hosp-clinico-${tail}`);
    candidates.add(`hosp-${tail}`);
  }
  if (id.startsWith("hosp-clinico-")) {
    candidates.add(`hosp-${id.slice("hosp-clinico-".length)}`);
  }
  if (id.startsWith("hospital-")) {
    candidates.add(id.replace(/^hospital-/, "hosp-"));
  }

  const slug = slugifyClinicId(id);
  if (slug && slug !== id) {
    candidates.add(slug);
  }

  return [...candidates];
}

export function resolveClinicZoneIds(
  clinicId: string,
  clinicName?: string,
): ZoneId[] {
  for (const candidate of buildClinicIdLookupCandidates(clinicId)) {
    const zones = lookupClinicZoneIds(candidate);
    if (zones.length > 0) return zones;
  }

  if (clinicName?.trim()) {
    return resolveClinicZoneIdsFromName(clinicName);
  }

  return [];
}

export function resolveClinicZoneIdsFromName(clinicName: string): ZoneId[] {
  const slug = slugifyClinicId(clinicName);
  if (!slug) return [];

  for (const candidate of buildClinicIdLookupCandidates(slug)) {
    const zones = lookupClinicZoneIds(candidate);
    if (zones.length > 0) return zones;
  }

  let bestMatch: readonly ZoneId[] | null = null;
  let bestLength = 0;

  for (const [mapId, zones] of CLINIC_ZONE_LOOKUP.entries()) {
    // No fuzzy-match placeholders de libre elección ni IDs cortos/genéricos.
    if (zones === LIBRE_ELECCION_ZONE_IDS) continue;
    if (mapId.length < MIN_FUZZY_MATCH_LENGTH) continue;
    if (slug.length < MIN_FUZZY_MATCH_LENGTH) continue;

    if (slug.includes(mapId) || mapId.includes(slug)) {
      if (mapId.length > bestLength) {
        bestMatch = zones;
        bestLength = mapId.length;
      }
    }
  }

  return bestMatch ? [...bestMatch] : [];
}

/** ¿La clínica intersecta alguna de las zonas activas del filtro? */
export function clinicMatchesActiveZones(
  clinicZoneIds: readonly string[] | null | undefined,
  activeZoneIds: readonly string[],
): boolean {
  if (activeZoneIds.length === 0) return true;
  if (!clinicZoneIds || clinicZoneIds.length === 0) return false;
  const active = new Set(activeZoneIds);
  return clinicZoneIds.some((zoneId) => active.has(zoneId));
}

/** Re-export útil para callers que listan el catálogo RM completo. */
export const ALL_RM_ZONE_IDS = [...RM_ZONE_IDS] as ZoneId[];
