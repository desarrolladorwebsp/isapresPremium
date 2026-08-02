/** Ruta canónica del cotizador completo (multitenant por ?agent=). */
export const PREMIUM_COTIZADOR_PATH = "/cotizador";

/** URL local de desarrollo. */
export const DEV_APP_BASE_URL = "http://localhost:3000";

/** URL canónica de producción (motor del cotizador). */
export const PROD_APP_BASE_URL = "https://isaprespremium.cl";

/** @deprecated Usar resolveAppBaseUrl() */
export const DEFAULT_APP_BASE_URL = PROD_APP_BASE_URL;

/** Dominio legacy white-label (compatibilidad). */
export const LEGACY_APP_BASE_URL = "https://cotizador.cotizaloantes.cl";

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/$/, "");
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

function readConfiguredAppBaseUrl(): string | null {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_COTIZADOR_URL?.trim();

  if (fromEnv) return normalizeBaseUrl(fromEnv);

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProduction && process.env.VERCEL_ENV === "production") {
    return normalizeBaseUrl(vercelProduction);
  }

  return null;
}

export function resolveAppBaseUrl(override?: string): string {
  if (override?.trim()) {
    return normalizeBaseUrl(override);
  }

  const configured = readConfiguredAppBaseUrl();
  if (configured) return configured;

  if (process.env.NODE_ENV === "development") {
    return DEV_APP_BASE_URL;
  }

  return PROD_APP_BASE_URL;
}

/**
 * Base URL para enlaces generados en el servidor (correos, invitaciones).
 * Prioriza el host real del request en producción para no depender solo de env.
 */
export function resolveServerAppBaseUrl(request?: Request): string {
  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwardedHost || request.headers.get("host")?.trim();

    if (host && !/localhost|127\.0\.0\.1/i.test(host)) {
      const proto =
        request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
        (host.includes("localhost") ? "http" : "https");
      return normalizeBaseUrl(`${proto}://${host}`);
    }
  }

  return resolveAppBaseUrl();
}

/** true → URLs en /cotizador?agent= ; false → /{slug}?entidad= (legacy) */
export function usesPremiumRouting(baseUrl?: string): boolean {
  const mode = process.env.NEXT_PUBLIC_COTIZADOR_ROUTING?.trim().toLowerCase();
  if (mode === "legacy") return false;
  if (mode === "premium") return true;

  const base = resolveAppBaseUrl(baseUrl).toLowerCase();
  if (base.includes("cotizador.cotizaloantes")) return false;

  return true;
}

/** Valida slug o embed key (minúsculas, guiones). */
export function isValidAgentKeySegment(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized);
}
