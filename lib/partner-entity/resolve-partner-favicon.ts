import { PLATFORM_AGENT_KEY } from "@/lib/partner-entity/platform-agent";
import type { PartnerEntityPublic } from "@/types/partner-entity";

/** Favicon por defecto de Cotizador Premium (fallback). */
export const DEFAULT_FAVICON_PATH = "/favicon.ico";

/**
 * Favicons dedicados por marca (opcional).
 * Si no hay entrada, se usa `logoUrl` de la entidad o el fallback.
 */
const PARTNER_FAVICON_BY_BRAND_KEY: Readonly<Record<string, string>> = {
  premium: DEFAULT_FAVICON_PATH,
};

export function resolvePartnerFaviconUrl(
  entity: PartnerEntityPublic | null | undefined,
): string {
  if (!entity) return DEFAULT_FAVICON_PATH;

  const mapped = PARTNER_FAVICON_BY_BRAND_KEY[entity.brandKey];
  if (mapped) return mapped;

  if (entity.slug === PLATFORM_AGENT_KEY) return DEFAULT_FAVICON_PATH;

  const logoUrl = entity.logoUrl?.trim();
  if (logoUrl) return logoUrl;

  return DEFAULT_FAVICON_PATH;
}
