export const siteConfig = {
  name: "Isapres Premium",
  url: "https://isaprespremium.cl",
  cotizadorUrl: "https://cotizadorpremium.cl/cotizador?agent=isaprespremium",
  locale: "es_CL",
  contact: {
    email: "contacto@isaprespremium.cl",
    phone: "+56 9 6413 38 48",
    whatsapp: "+56964133848",
  },
  social: {
    facebook: "https://web.facebook.com/profile.php?id=61575835365966",
    instagram: "https://www.instagram.com/isapres_premium",
    linkedin: "https://www.linkedin.com/company/seguros-premium-chile/",
    googleReviews: "https://g.page/r/isapres-premium/review",
  },
  calendly: {
    meetingUrl:
      "https://calendly.com/info-isaprepremium/30min?text_color=039272&primary_color=33b83d",
  },
} as const;

export const WHATSAPP_FLOAT_MESSAGE = "Quiero mejorar mi plan de Isapre.";

/** Redes sociales oficiales — reutilizar en Navbar, Footer, etc. */
export const SOCIAL_LINKS = [
  { label: "Facebook", href: siteConfig.social.facebook },
  { label: "Instagram", href: siteConfig.social.instagram },
  { label: "LinkedIn", href: siteConfig.social.linkedin },
] as const;

export function getWhatsAppUrl(message: string = WHATSAPP_FLOAT_MESSAGE) {
  const phone = siteConfig.contact.whatsapp.replace(/\D/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
