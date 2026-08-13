import {
  LEGACY_APP_BASE_URL,
  PROD_APP_BASE_URL,
} from "@/lib/platform/routing";

/** Host canónico para SEO (Cotizador Premium). */
export const CANONICAL_SEO_HOST = new URL(PROD_APP_BASE_URL).hostname.replace(
  /^www\./,
  "",
);

/** Host legacy white-label (no debe rankear como Cotizador Premium). */
export const LEGACY_SEO_HOST = new URL(LEGACY_APP_BASE_URL).hostname.replace(
  /^www\./,
  "",
);

export function normalizeHostname(host: string | null | undefined): string {
  return (host ?? "")
    .split(",")[0]
    ?.trim()
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/^www\./, "") ?? "";
}

export function isLegacySeoHostname(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  return host === LEGACY_SEO_HOST || host.endsWith(`.${LEGACY_SEO_HOST}`);
}

export function isCanonicalSeoHostname(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  return host === CANONICAL_SEO_HOST || host.endsWith(`.${CANONICAL_SEO_HOST}`);
}
