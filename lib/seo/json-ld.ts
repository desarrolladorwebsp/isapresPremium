import { LANDING_FOOTER_CONTACT } from "@/components/platform/landing/landing-social-data";
import { resolveAppBaseUrl } from "@/lib/platform/routing";
import {
  DEFAULT_DESCRIPTION,
  SITE_CONTACT_EMAIL,
  SITE_LANGUAGE,
  SITE_NAME,
  SITE_SOCIAL_PROFILES,
} from "@/lib/seo/site-config";

function absoluteUrl(path: string): string {
  const base = resolveAppBaseUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** JSON-LD de la landing marketing (`/inicio`): Organization + WebSite + WebApplication. */
export function buildLandingPageJsonLd() {
  const siteUrl = resolveAppBaseUrl();
  const landingUrl = absoluteUrl("/inicio");
  const logoUrl = absoluteUrl("/icon-512.png");
  const cotizadorUrl = absoluteUrl("/cotizador");

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: SITE_NAME,
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: logoUrl,
          width: 512,
          height: 512,
        },
        description: DEFAULT_DESCRIPTION,
        email: SITE_CONTACT_EMAIL,
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer service",
          availableLanguage: ["Spanish", "es"],
          url: LANDING_FOOTER_CONTACT.whatsappHref,
        },
        areaServed: {
          "@type": "Country",
          name: "Chile",
        },
        sameAs: [...SITE_SOCIAL_PROFILES],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: SITE_NAME,
        url: siteUrl,
        inLanguage: SITE_LANGUAGE,
        publisher: { "@id": `${siteUrl}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${cotizadorUrl}?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "WebPage",
        "@id": `${landingUrl}#webpage`,
        url: landingUrl,
        name: SITE_NAME,
        description: DEFAULT_DESCRIPTION,
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "WebApplication",
        "@id": `${cotizadorUrl}#app`,
        name: "Cotizador de planes Isapre",
        url: cotizadorUrl,
        applicationCategory: "HealthApplication",
        operatingSystem: "Web",
        inLanguage: SITE_LANGUAGE,
        description: DEFAULT_DESCRIPTION,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "CLP",
        },
        provider: { "@id": `${siteUrl}/#organization` },
      },
    ],
  };
}

/** JSON-LD para la página del cotizador completo. */
export function buildCotizadorPageJsonLd(options?: {
  partnerName?: string;
}) {
  const siteUrl = resolveAppBaseUrl();
  const cotizadorUrl = absoluteUrl("/cotizador");
  const name = options?.partnerName
    ? `Cotizador de planes Isapre — ${options.partnerName}`
    : "Cotizador de planes Isapre";

  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    url: cotizadorUrl,
    applicationCategory: "HealthApplication",
    operatingSystem: "Web",
    inLanguage: SITE_LANGUAGE,
    description: DEFAULT_DESCRIPTION,
    isPartOf: { "@id": `${siteUrl}/#website` },
    provider: { "@id": `${siteUrl}/#organization` },
  };
}
