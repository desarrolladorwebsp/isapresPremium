export interface ClinicLocationRecord {
  address: string;
  lat: number;
  lng: number;
  source?: "curated" | "geocoded" | string;
}

export interface ClinicMapMarker {
  id: string;
  name: string;
  zones: string[];
  location: ClinicLocationRecord;
}

export interface UniqueClinicMapLocation {
  locationKey: string;
  location: ClinicLocationRecord;
  clinics: ClinicMapMarker[];
}

export function locationKeyFromRecord(location: ClinicLocationRecord): string {
  return `${location.lat.toFixed(4)},${location.lng.toFixed(4)}`;
}
