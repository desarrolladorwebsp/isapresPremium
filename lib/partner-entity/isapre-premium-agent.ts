import type { PartnerEntityPublic, PartnerEntityTheme } from "@/types/partner-entity";

/** Agent key / slug oficial (dominio isaprespremium.cl). */
export const ISAPRE_PREMIUM_AGENT_KEY = "isaprespremium";

/** Alias sin «s» usado en documentación y enlaces legacy. */
export const ISAPRE_PREMIUM_AGENT_ALIASES = [
  "isaprepremium",
] as const;

export const ISAPRE_PREMIUM_WEBSITE = "https://isaprespremium.cl";

export const ISAPRE_PREMIUM_LOGO_PATH = "/images/partners/logo-isapre-premium.png";

/** Isotipo compacto — headers y menús staff. */
export const ISAPRE_PREMIUM_ICON_PATH =
  "/images/logo-icono-isapres-premium.png";

/** Wordmark oficial (navbar / acceso staff). */
export const ISAPRE_PREMIUM_WORDMARK_PATH = "/logo-isapres-premium.png";

/**
 * Paleta oficial Isapres Premium (turquesa + verde manzana solo en CTAs).
 * - Brand / primary / criteria: #0F8D8E
 * - CTA (Buscar / Solicitar asesoría): #8CC63F · hover #7AB82F
 */
export const ISAPRE_PREMIUM_THEME: PartnerEntityTheme = {
  /** Color principal de marca — turquesa (badge, filtros, tipografía de acento) */
  primary: "#0F8D8E",
  /** Hover de marca */
  primaryHover: "#0C7576",
  /** Texto principal — azul petróleo */
  primaryDark: "#154B56",
  primaryForeground: "#ffffff",
  /** Secundario — acento de marca (soft / pills no-CTA) */
  secondary: "#0F8D8E",
  secondaryMuted: "#E8F5F2",
  /** Fondos suaves — gris azulado muy claro */
  bgLayout: "#F7FAFB",
  foreground: "#154B56",
  muted: "#7A8D93",
  border: "#E6EFF0",
  surfaceHover: "#EEF5F6",
  /** Barra de criterios */
  criteriaSurface: "#0F8D8E",
  criteriaRing: "#0C7576",
  /** Standalone convenio sobre blanco */
  convenioAccent: "#0F8D8E",
  /** Validar convenio: marca (no manzana) */
  convenioAccentStrong: "#0F8D8E",
  convenioAccentMuted: "#E8F5F2",
};

export function buildIsaprePremiumPartnerRecord(): PartnerEntityPublic {
  return {
    slug: ISAPRE_PREMIUM_AGENT_KEY,
    embedKey: ISAPRE_PREMIUM_AGENT_KEY,
    name: "Isapres Premium",
    logoUrl: ISAPRE_PREMIUM_LOGO_PATH,
    websiteUrl: "/",
    whatsappNumber: "56964133848",
    whatsappMessage:
      "Hola, quiero cotizar un plan de salud con Isapres Premium",
    exitLabel: "Volver a Isapres Premium",
    brandKey: "isapre-premium",
    theme: ISAPRE_PREMIUM_THEME,
  };
}

export function isIsaprePremiumAgentKey(key: string): boolean {
  const normalized = key.trim().toLowerCase();
  return (
    normalized === ISAPRE_PREMIUM_AGENT_KEY ||
    ISAPRE_PREMIUM_AGENT_ALIASES.some((alias) => alias === normalized)
  );
}
