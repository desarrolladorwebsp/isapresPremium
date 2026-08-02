import type { ClinicLocationRecord } from "@/types/clinic-location";

/**
 * Geocodificación server-side usando Nominatim (OpenStreetMap), la misma fuente
 * que el script offline `build-clinic-locations.mjs`. No requiere API key.
 *
 * El objetivo es doble:
 *  1. Normalizar la dirección a coordenadas para el mapa.
 *  2. Rechazar direcciones falsas/inexistentes antes de persistirlas.
 */

export interface GeocodeResult extends ClinicLocationRecord {
  /** Dirección normalizada devuelta por el proveedor. */
  address: string;
  lat: number;
  lng: number;
  source: "geocoded";
  /** Dirección exacta consultada por el usuario. */
  queried: string;
}

// Caja aproximada de Chile continental + extremos, para descartar resultados
// que caen fuera del país aunque el proveedor devuelva algo.
const CHILE_BBOX = {
  minLat: -56.6,
  maxLat: -17.3,
  minLng: -76.0,
  maxLng: -66.0,
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT =
  "cotizadorpremium-clinic-admin/1.0 (contacto@cotizadorpremium.cl)";

interface NominatimHit {
  lat: string;
  lon: string;
  display_name: string;
  class?: string;
  type?: string;
  address?: Record<string, string>;
}

export function isWithinChile(lat: number, lng: number): boolean {
  return (
    lat >= CHILE_BBOX.minLat &&
    lat <= CHILE_BBOX.maxLat &&
    lng >= CHILE_BBOX.minLng &&
    lng <= CHILE_BBOX.maxLng
  );
}

/**
 * Un resultado es "suficientemente específico" cuando apunta a una calle,
 * a un recinto concreto (clínica/hospital/edificio) o a una localidad con
 * numeración. Descarta coincidencias vagas tipo solo "Chile" o solo la región.
 */
function isSpecificEnough(hit: NominatimHit): boolean {
  const addr = hit.address ?? {};
  const hasStreet = Boolean(addr.road || addr.house_number || addr.pedestrian);
  const hasLocality = Boolean(
    addr.suburb || addr.neighbourhood || addr.city || addr.town || addr.village,
  );
  const placeClass = hit.class ?? "";
  const placeType = hit.type ?? "";
  const isVenue =
    ["amenity", "building", "healthcare", "office", "shop"].includes(
      placeClass,
    ) || ["hospital", "clinic", "doctors", "pharmacy"].includes(placeType);

  return hasStreet || isVenue || (hasLocality && Boolean(addr.house_number));
}

/**
 * Intenta geocodificar una dirección en Chile. Devuelve `null` cuando la
 * dirección no existe, no está en Chile o es demasiado imprecisa para el mapa.
 */
export async function geocodeAddressInChile(
  rawAddress: string,
): Promise<GeocodeResult | null> {
  const query = rawAddress.trim();
  if (query.length < 5) return null;

  const url = `${NOMINATIM_URL}?${new URLSearchParams({
    q: /chile/i.test(query) ? query : `${query}, Chile`,
    format: "json",
    limit: "3",
    countrycodes: "cl",
    addressdetails: "1",
  })}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "es",
      },
      cache: "no-store",
    });
  } catch {
    throw new GeocodeUnavailableError();
  }

  if (response.status === 429 || response.status >= 500) {
    throw new GeocodeUnavailableError();
  }
  if (!response.ok) return null;

  const results = (await response.json()) as NominatimHit[];
  if (!Array.isArray(results) || results.length === 0) return null;

  const hit = results.find((candidate) => {
    const lat = Number(candidate.lat);
    const lng = Number(candidate.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    return isWithinChile(lat, lng) && isSpecificEnough(candidate);
  });

  if (!hit) return null;

  return {
    address: hit.display_name,
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    source: "geocoded",
    queried: query,
  };
}

/** El proveedor de geocodificación no respondió (rate limit / caída). */
export class GeocodeUnavailableError extends Error {
  constructor() {
    super("El servicio de validación de direcciones no está disponible.");
    this.name = "GeocodeUnavailableError";
  }
}
