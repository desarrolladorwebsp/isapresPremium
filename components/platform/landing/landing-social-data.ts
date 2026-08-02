import { buildWhatsAppUrl } from "@/lib/partner-entity/theme";

/** WhatsApp oficial — sin línea telefónica de voz. */
export const LANDING_WHATSAPP = {
  number: "56965822864",
  display: "+56 9 6582 2864",
  message: "Hola, quiero cotizar un plan de salud con Cotizador Premium",
} as const;

export function buildLandingWhatsAppHref(): string {
  return buildWhatsAppUrl(LANDING_WHATSAPP.number, LANDING_WHATSAPP.message);
}

export const LANDING_SOCIAL_NETWORKS = [
  {
    id: "facebook",
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61591687383169",
  },
  {
    id: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/cotizadorpremium",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/cotizadorpremium",
  },
] as const;

/** Datos de contacto del footer — configurables sin tocar el componente. */
export const LANDING_FOOTER_CONTACT = {
  email: "contacto@cotizadorpremium.cl",
  whatsapp: LANDING_WHATSAPP.display,
  whatsappHref: buildLandingWhatsAppHref(),
  location: "Chile",
} as const;

export const LANDING_FOOTER_SOCIAL = [
  ...LANDING_SOCIAL_NETWORKS,
  {
    id: "whatsapp",
    label: "WhatsApp",
    href: buildLandingWhatsAppHref(),
  },
] as const;

export const LANDING_FOOTER_NAV = [
  { label: "Inicio", href: "/inicio#inicio" },
  { label: "Isapres", href: "/inicio#isapres" },
  { label: "Cotizador", href: "/inicio#cotizar" },
  { label: "Nuestros Socios", href: "/inicio#socios" },
  { label: "Reseñas", href: "/inicio#reseñas" },
  { label: "Contacto", href: "/inicio#contacto" },
  { label: "Política de Privacidad", href: "/politica-privacidad" },
] as const;

export const LANDING_FOOTER_DESCRIPTION =
  "Cotizador Premium te ayuda a comparar planes de ISAPRE con el respaldo de asesores especializados, entregando una experiencia rápida, segura y personalizada.";

export const LANDING_FOOTER_SMARTPRO_URL = "https://smartpro.cl";

export const LANDING_FOOTER_SMARTPRO_LOGO =
  "/images/landing/sections/logo-smartpro.png";

export const LANDING_FOOTER_SMARTPRO_LABEL = "SmartPro — Agencia de Marketing";
