import type { PartnerEntityPublic, PartnerEntityTheme } from "@/types/partner-entity";
import {
  COTIZADOR_PREMIUM_ICON_PATH,
  COTIZADOR_PREMIUM_PALETTE,
} from "@/lib/partner-entity/cotizador-premium-palette";

/** Agent key / slug de la plataforma principal (cotizadorpremium.cl). */
export const PLATFORM_AGENT_KEY = "cotizadorpremium";

/** Landing marketing (antes en `/`). El cotizador vive en `/cotizador`.
 * No usar `/index`: en Vercel/Next el segmento `index` se normaliza a `/`
 * y el middleware redirige `/` → `/cotizador`.
 */
export const PLATFORM_LANDING_PATH = "/inicio";

export const PLATFORM_AGENT_WEBSITE = "https://cotizadorpremium.cl";

/** Isotipo Premium — logo de menús / headers de plataforma. */
export const PLATFORM_AGENT_LOGO_URL = COTIZADOR_PREMIUM_ICON_PATH;

/**
 * Tema de marca Cotizador Premium — ver `cotizador-premium-palette.ts`.
 * Fuente de verdad en código para seed/fallback; en producción se persiste en
 * `partner_entities.theme`. Si la DB queda desfasada: `npx prisma db seed`
 * (upsert del theme) o actualizar el agente en admin.
 */
export const COTIZADOR_PREMIUM_THEME: PartnerEntityTheme = {
  primary: COTIZADOR_PREMIUM_PALETTE.primary,
  primaryHover: COTIZADOR_PREMIUM_PALETTE.primaryHover,
  primaryDark: COTIZADOR_PREMIUM_PALETTE.primaryDark,
  primaryForeground: COTIZADOR_PREMIUM_PALETTE.primaryForeground,
  secondary: COTIZADOR_PREMIUM_PALETTE.secondary,
  secondaryMuted: COTIZADOR_PREMIUM_PALETTE.secondaryMuted,
  bgLayout: COTIZADOR_PREMIUM_PALETTE.bgLayout,
  foreground: COTIZADOR_PREMIUM_PALETTE.foreground,
  muted: COTIZADOR_PREMIUM_PALETTE.muted,
  border: COTIZADOR_PREMIUM_PALETTE.border,
  surfaceHover: COTIZADOR_PREMIUM_PALETTE.surfaceHover,
  criteriaSurface: COTIZADOR_PREMIUM_PALETTE.criteriaSurface,
  criteriaRing: COTIZADOR_PREMIUM_PALETTE.criteriaRing,
  convenioAccent: COTIZADOR_PREMIUM_PALETTE.convenioAccent,
  convenioAccentStrong: COTIZADOR_PREMIUM_PALETTE.convenioAccentStrong,
  convenioAccentMuted: COTIZADOR_PREMIUM_PALETTE.convenioAccentMuted,
};

export function buildCotizadorPremiumPartnerRecord(): Omit<
  PartnerEntityPublic,
  never
> {
  return {
    slug: PLATFORM_AGENT_KEY,
    embedKey: PLATFORM_AGENT_KEY,
    name: "Cotizador Premium",
    logoUrl: PLATFORM_AGENT_LOGO_URL,
    websiteUrl: PLATFORM_LANDING_PATH,
    whatsappNumber: "56965822864",
    whatsappMessage:
      "Hola, quiero cotizar un plan de salud con Cotizador Premium",
    exitLabel: "Ver la página inicial",
    brandKey: "premium",
    theme: COTIZADOR_PREMIUM_THEME,
  };
}

export function buildCotizadorPremiumCotizadorUrl(
  basePath = "/cotizador",
): string {
  return `${basePath}?agent=${PLATFORM_AGENT_KEY}`;
}
