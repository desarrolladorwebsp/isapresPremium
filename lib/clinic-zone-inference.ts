import clinicLocationsAsset from "@/assets/clinic-locations.json";
import { resolveClinicZoneIds } from "@/lib/clinic-zones";
import type { ZoneId } from "@/types/zone";

interface GeoPoint {
  lat: number;
  lng: number;
}

const RM_BOUNDS = {
  minLat: -34.05,
  maxLat: -32.95,
  minLng: -71.05,
  maxLng: -70.25,
};

const RM_SECTOR_CENTROIDS: Record<string, GeoPoint> = {
  "rm-oriente": { lat: -33.41, lng: -70.57 },
  "rm-centro": { lat: -33.45, lng: -70.66 },
  "rm-poniente": { lat: -33.51, lng: -70.76 },
  "rm-sur": { lat: -33.6, lng: -70.71 },
  "rm-norte": { lat: -33.36, lng: -70.64 },
  "rm-metropolitana": { lat: -33.45, lng: -70.65 },
};

const REGION_CENTROIDS: Record<string, GeoPoint> = {
  norte: { lat: -20.5, lng: -69.8 },
  valparaiso: { lat: -33.05, lng: -71.55 },
  octava: { lat: -36.2, lng: -72.4 },
  biobio: { lat: -42.5, lng: -73.2 },
};

const NAME_ZONE_KEYWORDS: Array<{ pattern: RegExp; zones: ZoneId[] }> = [
  { pattern: /arica|iquique|antofagasta|atacama|copiap[oó]|elqui|la serena|tarapac[aá]|portada/i, zones: ["norte"] },
  { pattern: /valpara[ií]so|vi[nñ]a|renaca|reñaca|san antonio|quilpu[eé]/i, zones: ["valparaiso"] },
  { pattern: /talca|chill[aá]n|rancagua|los [aá]ngeles|arauco|curic[oó]|linares|maule|lircay/i, zones: ["octava"] },
  { pattern: /concepci[oó]n|temuco|valdivia|osorno|puerto montt|punta arenas|ancud|chil[oó]e|magallanes|del sur/i, zones: ["biobio"] },
  { pattern: /santiago|providencia|las condes|maip[uú]|recoleta|huechuraba|san bernardo|vitacura|independencia/i, zones: ["rm-metropolitana"] },
];

const clinicLocations = clinicLocationsAsset as {
  locations: Record<string, GeoPoint & { address?: string }>;
};

function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function isInsideRm(point: GeoPoint): boolean {
  return (
    point.lat >= RM_BOUNDS.minLat &&
    point.lat <= RM_BOUNDS.maxLat &&
    point.lng >= RM_BOUNDS.minLng &&
    point.lng <= RM_BOUNDS.maxLng
  );
}

function nearestZoneId(
  point: GeoPoint,
  centroids: Record<string, GeoPoint>,
): ZoneId {
  let best: ZoneId = "rm-metropolitana";
  let bestDistance = Infinity;

  for (const [zoneId, centroid] of Object.entries(centroids)) {
    const distance = haversineKm(point, centroid);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = zoneId as ZoneId;
    }
  }

  return best;
}

function inferZonesFromGeo(point: GeoPoint): ZoneId[] {
  if (isInsideRm(point)) {
    const sector = nearestZoneId(point, RM_SECTOR_CENTROIDS);
    if (sector === "rm-metropolitana") return [sector];
    return [sector, "rm-metropolitana"];
  }

  return [nearestZoneId(point, REGION_CENTROIDS)];
}

function inferZonesFromName(clinicName: string): ZoneId[] {
  for (const rule of NAME_ZONE_KEYWORDS) {
    if (rule.pattern.test(clinicName)) return [...rule.zones];
  }
  return [];
}

function getClinicLocation(clinicId: string): GeoPoint | null {
  return clinicLocations.locations[clinicId] ?? null;
}

/** Resuelve zonas: mapa estático → geolocalización → palabras clave del nombre. */
export function resolveClinicZoneIdsComplete(
  clinicId: string,
  clinicName?: string,
): ZoneId[] {
  const fromMap = resolveClinicZoneIds(clinicId, clinicName);
  if (fromMap.length > 0) return fromMap;

  const location = getClinicLocation(clinicId);
  if (location) return inferZonesFromGeo(location);

  if (clinicName?.trim()) {
    const fromName = inferZonesFromName(clinicName);
    if (fromName.length > 0) return fromName;
  }

  return [];
}
