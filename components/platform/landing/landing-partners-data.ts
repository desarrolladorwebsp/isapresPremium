export interface LandingPartner {
  slug: string;
  name: string;
  domain: string;
  websiteUrl: string;
  description: string;
  badge: string;
  accentColor: string;
  logoUrl?: string;
}

export const LANDING_PARTNERS: LandingPartner[] = [
  {
    slug: "cotizaloantes",
    name: "Cotízalo Antes",
    domain: "cotizaloantes.cl",
    websiteUrl: "https://cotizaloantes.cl",
    description:
      "Comparador líder en planes Isapre con asesoría personalizada para familias y profesionales.",
    badge: "Plataforma asociada",
    accentColor: "#ed7d11",
    logoUrl: "/images/logo-cotizalo-antes.png",
  },
  {
    slug: "desdetu7",
    name: "Desde Tu 7",
    domain: "desdetu7.cl",
    websiteUrl: "https://desdetu7.cl",
    description:
      "Especialistas en salud prepaga con un enfoque cercano y orientación experta en cada cotización.",
    badge: "Plataforma asociada",
    accentColor: "#ff6600",
    logoUrl: "https://desdetu7.cl/logo.png",
  },
  {
    slug: "isaprespremium",
    name: "Isapres Premium",
    domain: "isaprespremium.cl",
    websiteUrl: "https://isaprespremium.cl",
    description:
      "Portal premium de comparación y asesoría en planes de salud privados en Chile.",
    badge: "Socio autorizado",
    accentColor: "#6CC24A",
    logoUrl: "/images/partners/logo-isapre-premium.png",
  },
];

export function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}
