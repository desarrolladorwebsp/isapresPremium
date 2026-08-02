import { FALLBACK_PARTNER_ENTITIES } from "@/lib/partner-entity/fallback-entities";
import {
  DEV_APP_BASE_URL,
  LEGACY_APP_BASE_URL,
  PROD_APP_BASE_URL,
  resolveAppBaseUrl,
} from "@/lib/platform/routing";
import { DEFAULT_TRUSTED_PARTNER_ORIGINS } from "@/lib/security/trusted-partner-origins.constants";

export { DEFAULT_TRUSTED_PARTNER_ORIGINS };

export function normalizePublicOrigin(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return null;
  }
}

/** Registra el origen y su variante con/sin prefijo www. */
export function addOriginWithWwwVariant(
  origins: Set<string>,
  value: string,
): void {
  const normalized = normalizePublicOrigin(value);
  if (!normalized) return;

  origins.add(normalized);

  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase();
    if (host.startsWith("www.")) {
      origins.add(`${url.protocol}//${host.slice(4)}`);
    } else {
      origins.add(`${url.protocol}//www.${host}`);
    }
  } catch {
    // ignore malformed host
  }
}

/** Orígenes confiables para POST públicos y políticas de embed. */
export function collectTrustedPublicOrigins(): Set<string> {
  const origins = new Set<string>();

  for (const base of [
    resolveAppBaseUrl(),
    PROD_APP_BASE_URL,
    DEV_APP_BASE_URL,
    LEGACY_APP_BASE_URL,
    process.env.APP_BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ]) {
    if (!base?.trim()) continue;
    addOriginWithWwwVariant(origins, base.trim());
  }

  for (const origin of DEFAULT_TRUSTED_PARTNER_ORIGINS) {
    addOriginWithWwwVariant(origins, origin);
  }

  for (const partner of Object.values(FALLBACK_PARTNER_ENTITIES)) {
    if (partner.websiteUrl?.trim()) {
      addOriginWithWwwVariant(origins, partner.websiteUrl);
    }
  }

  if (process.env.NODE_ENV === "development") {
    for (const host of [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
    ]) {
      origins.add(host);
    }
  }

  const extra = process.env.ALLOWED_PUBLIC_ORIGINS?.trim();
  if (extra) {
    for (const item of extra.split(/[\s,]+/)) {
      addOriginWithWwwVariant(origins, item);
    }
  }

  return origins;
}
