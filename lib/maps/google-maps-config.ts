import { setOptions } from "@googlemaps/js-api-loader";

let optionsConfigured = false;

export function getGoogleMapsApiKey(): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  return key || null;
}

export function ensureGoogleMapsOptions(): string | null {
  const key = getGoogleMapsApiKey();
  if (!key) return null;

  if (!optionsConfigured) {
    setOptions({ key, v: "weekly" });
    optionsConfigured = true;
  }

  return key;
}
