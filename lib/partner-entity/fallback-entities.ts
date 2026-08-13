import type { PartnerEntityPublic, PartnerEntityTheme } from "@/types/partner-entity";
import {
  buildIsaprePremiumPartnerRecord,
  ISAPRE_PREMIUM_AGENT_ALIASES,
  ISAPRE_PREMIUM_AGENT_KEY,
} from "@/lib/partner-entity/isapre-premium-agent";
import {
  buildCotizadorPremiumPartnerRecord,
  COTIZADOR_PREMIUM_THEME,
  PLATFORM_AGENT_KEY,
} from "@/lib/partner-entity/platform-agent";
import { DEFAULT_PARTNER_ENTITY_SLUG } from "@/lib/partner-entity/constants";

export { DEFAULT_PARTNER_ENTITY_SLUG };

export { COTIZADOR_PREMIUM_THEME };

export const COTIZALO_ANTES_THEME: PartnerEntityTheme = {
  primary: "#ed7d11",
  primaryHover: "#f59324",
  primaryDark: "#92450a",
  primaryForeground: "#ffffff",
  secondary: "#0e7c9c",
  secondaryMuted: "#eef6f8",
  bgLayout: "#ffffff",
  foreground: "#1a1a1a",
  muted: "#6b7280",
  border: "#e5e7eb",
  surfaceHover: "#f4f4f5",
  criteriaSurface: "#ed7d11",
  criteriaRing: "#c4650c",
  convenioAccent: "#ed7d11",
  convenioAccentStrong: "#0e7c9c",
  convenioAccentMuted: "#eef6f8",
};

export const DESDETU7_THEME: PartnerEntityTheme = {
  primary: "#ff6600",
  primaryHover: "#ff8533",
  primaryDark: "#cc5200",
  primaryForeground: "#ffffff",
  secondary: "#111827",
  secondaryMuted: "#f5f7fa",
  bgLayout: "#ffffff",
  foreground: "#111827",
  muted: "#6b7280",
  border: "#e5e7eb",
  surfaceHover: "#f4f4f5",
  criteriaSurface: "#ff6600",
  criteriaRing: "#cc5200",
  convenioAccent: "#ff6600",
  convenioAccentStrong: "#111827",
  convenioAccentMuted: "#f5f7fa",
};

const ISAPRE_PREMIUM_RECORD = buildIsaprePremiumPartnerRecord();

export const FALLBACK_PARTNER_ENTITIES: Record<string, PartnerEntityPublic> = {
  cotizaloantes: {
    slug: "cotizaloantes",
    embedKey: "cotizaloantes",
    name: "Cotízalo Antes",
    logoUrl: "/images/logo-cotizalo-antes.png",
    websiteUrl: "https://cotizaloantes.cl",
    whatsappNumber: "56964133848",
    whatsappMessage: "Hola, quiero cotizar un plan de salud",
    exitLabel: "Volver a Cotízalo Antes",
    brandKey: "cotizalo-antes",
    theme: COTIZALO_ANTES_THEME,
  },
  desdetu7: {
    slug: "desdetu7",
    embedKey: "desdetu7",
    name: "Desde Tu 7",
    logoUrl: "https://desdetu7.cl/logo.png",
    websiteUrl: "https://desdetu7.cl",
    whatsappNumber: "56964133848",
    whatsappMessage: "Hola, quiero cotizar un plan de salud desde Desde Tu 7",
    exitLabel: "Volver a Desde Tu 7",
    brandKey: "desdetu7",
    theme: DESDETU7_THEME,
  },
  [ISAPRE_PREMIUM_AGENT_KEY]: ISAPRE_PREMIUM_RECORD,
  ...Object.fromEntries(
    ISAPRE_PREMIUM_AGENT_ALIASES.map((alias) => [alias, ISAPRE_PREMIUM_RECORD]),
  ),
  [PLATFORM_AGENT_KEY]: buildCotizadorPremiumPartnerRecord(),
};

export function getFallbackPartnerEntity(
  slug: string,
): PartnerEntityPublic | null {
  return FALLBACK_PARTNER_ENTITIES[slug.trim().toLowerCase()] ?? null;
}

export function getDefaultPartnerEntity(): PartnerEntityPublic {
  return (
    getFallbackPartnerEntity(DEFAULT_PARTNER_ENTITY_SLUG) ??
    buildIsaprePremiumPartnerRecord()
  );
}

/** Host principal de este deploy: Isapres Premium. */
export function getPlatformPartnerEntity(): PartnerEntityPublic {
  return buildIsaprePremiumPartnerRecord();
}
