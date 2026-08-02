import type { Metadata } from "next";
import { siteConfig } from "@/constants/site";

/** Absolute site origin without trailing slash. */
export const SITE_URL = siteConfig.url;

/**
 * Open Graph / WhatsApp / Twitter share image.
 * Spec: 1200×630 (≈1.91:1), JPEG <300KB for reliable WhatsApp previews.
 */
export const OG_IMAGE_PATH = "/og/og-default.jpg";

export const OG_IMAGE = {
  url: OG_IMAGE_PATH,
  width: 1200,
  height: 630,
  alt: "Isapres Premium — Cotiza y compara tu plan de Isapre en Chile",
  type: "image/jpeg",
} as const;

export const SEO_KEYWORDS = {
  home: [
    "cotizar isapre",
    "comparar isapres",
    "cambiar isapre",
    "mejor plan isapre",
    "asesoría isapre Chile",
    "planes de salud isapre",
    "cotizador isapre",
    "isapre Santiago",
    "cobertura isapre",
  ],
  empresas: [
    "isapre empresas",
    "isapre para trabajadores",
    "planes isapre empresariales",
    "asesoría isapre empresas Chile",
    "beneficios isapre empresa",
    "cotizar isapre empresas",
  ],
  nosotros: [
    "Isapres Premium",
    "asesores isapre Chile",
    "quiénes somos Isapres Premium",
    "corredores isapre",
    "asesoría independiente isapre",
  ],
  politicas: [
    "política de privacidad",
    "protección de datos Isapres Premium",
    "tratamiento de datos personales",
    "Ley 19.628",
  ],
  respaldoLegal: [
    "respaldo legal isapre",
    "reclamo isapre",
    "defensa isapre chile",
    "isapre no responde reclamo",
    "abogado isapre",
    "superintendencia de salud reclamo",
    "rechazo de cobertura isapre",
  ],
} as const;

export type SeoPageKey = keyof typeof SEO_PAGES;

type SeoPageConfig = {
  /** Path starting with `/` (home is `/`). */
  path: string;
  /** Document title. Home uses absolute; others use layout template. */
  title: string;
  /** Use absolute title (skip `%s | Isapres Premium` template). */
  absoluteTitle?: boolean;
  description: string;
  keywords: readonly string[];
  /** Optional OG/Twitter title override. */
  ogTitle?: string;
};

export const SEO_PAGES = {
  home: {
    path: "/",
    title:
      "Cotizar Isapre en Chile | Compara Planes y Asesoría | Isapres Premium",
    absoluteTitle: true,
    description:
      "Cotiza y compara planes de Isapre en Chile. Asesoría independiente para elegir el mejor plan según tu presupuesto, clínicas y coberturas. Atención a personas y familias.",
    keywords: SEO_KEYWORDS.home,
    ogTitle: "Cotizar y comparar Isapres en Chile | Isapres Premium",
  },
  empresas: {
    path: "/empresas",
    title: "Isapre para Empresas: Beneficios y Asesoría Corporativa",
    description:
      "Asesoría Isapre para empresas en Chile: comparamos todas las Isapres y encontramos el mejor plan para tus trabajadores, con transparencia y sin pérdida de tiempo.",
    keywords: SEO_KEYWORDS.empresas,
    ogTitle: "Isapre para empresas | Asesoría corporativa | Isapres Premium",
  },
  nosotros: {
    path: "/nosotros",
    title: "Nosotros: Asesores Independientes de Isapre en Chile",
    description:
      "Conoce a Isapres Premium: misión, visión y por qué somos diferentes. Asesoría independiente, comparativo de Isapres y respaldo legal para personas y empresas.",
    keywords: SEO_KEYWORDS.nosotros,
    ogTitle: "Quiénes somos | Isapres Premium",
  },
  politicas: {
    path: "/politicas",
    title: "Política de Privacidad",
    description:
      "Política de privacidad y tratamiento de datos personales de Isapres Premium. Conoce cómo protegemos tu información conforme a la legislación chilena.",
    keywords: SEO_KEYWORDS.politicas,
  },
  respaldoLegal: {
    path: "/respaldo-legal",
    title: "Respaldo Legal Gratis frente a tu Isapre | Isapres Premium",
    description:
      "Respaldo legal sin costo para afiliados Premium: reclamo directo, intervención ante la Superintendencia de Salud y defensa judicial si tu Isapre no responde o incumple.",
    keywords: SEO_KEYWORDS.respaldoLegal,
    ogTitle: "Respaldo legal gratuito frente a tu Isapre | Isapres Premium",
  },
  cotizador: {
    path: "/cotizador",
    title: "Cotizador de planes Isapre",
    description:
      "Compara y cotiza planes de Isapre en línea con Isapres Premium. Precios según edad, ingreso y región, con asesoría experta.",
    keywords: SEO_KEYWORDS.home,
    ogTitle: "Cotizador Isapre | Isapres Premium",
  },
} as const satisfies Record<string, SeoPageConfig>;

export function absoluteUrl(path: string = "/"): string {
  if (path === "/" || path === "") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function createPageMetadata(page: SeoPageKey): Metadata {
  const config = SEO_PAGES[page];
  const url = absoluteUrl(config.path);
  const ogTitle =
    "ogTitle" in config && config.ogTitle ? config.ogTitle : config.title;
  const absoluteTitle =
    "absoluteTitle" in config && config.absoluteTitle === true;

  return {
    title: absoluteTitle ? { absolute: config.title } : config.title,
    description: config.description,
    keywords: [...config.keywords],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: ogTitle,
      description: config.description,
      url,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: "website",
      images: [
        {
          url: OG_IMAGE.url,
          width: OG_IMAGE.width,
          height: OG_IMAGE.height,
          alt: OG_IMAGE.alt,
          type: OG_IMAGE.type,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: config.description,
      images: [
        {
          url: OG_IMAGE.url,
          width: OG_IMAGE.width,
          height: OG_IMAGE.height,
          alt: OG_IMAGE.alt,
        },
      ],
    },
  };
}

/** Root layout defaults — shared across the site. */
export function createRootMetadata(): Metadata {
  const home = SEO_PAGES.home;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: home.title,
      template: `%s | ${siteConfig.name}`,
    },
    description: home.description,
    keywords: [...home.keywords],
    applicationName: siteConfig.name,
    authors: [{ name: siteConfig.name, url: SITE_URL }],
    creator: siteConfig.name,
    publisher: siteConfig.name,
    category: "health",
    manifest: "/site.webmanifest",
    other: {
      "msapplication-TileColor": "#0a6b5e",
    },
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    alternates: {
      canonical: SITE_URL,
      languages: {
        "es-CL": SITE_URL,
      },
    },
    openGraph: {
      title:
        "ogTitle" in home && home.ogTitle ? home.ogTitle : home.title,
      description: home.description,
      url: SITE_URL,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: "website",
      images: [
        {
          url: OG_IMAGE.url,
          width: OG_IMAGE.width,
          height: OG_IMAGE.height,
          alt: OG_IMAGE.alt,
          type: OG_IMAGE.type,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title:
        "ogTitle" in home && home.ogTitle ? home.ogTitle : home.title,
      description: home.description,
      images: [
        {
          url: OG_IMAGE.url,
          width: OG_IMAGE.width,
          height: OG_IMAGE.height,
          alt: OG_IMAGE.alt,
        },
      ],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        {
          url: "/icons/favicon-16x16.png",
          sizes: "16x16",
          type: "image/png",
        },
        {
          url: "/icons/favicon-32x32.png",
          sizes: "32x32",
          type: "image/png",
        },
        {
          url: "/icons/icon-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          url: "/icons/icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
      apple: [
        {
          url: "/icons/apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png",
        },
      ],
      shortcut: [{ url: "/favicon.ico" }],
    },
  };
}

/** JSON-LD: Organization + WebSite for the homepage / global shell. */
export function getOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "ProfessionalService"],
    "@id": `${SITE_URL}/#organization`,
    name: siteConfig.name,
    legalName: siteConfig.name,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/logo-isapres-premium.png"),
    },
    image: absoluteUrl(OG_IMAGE_PATH),
    description: SEO_PAGES.home.description,
    email: siteConfig.contact.email,
    telephone: siteConfig.contact.phone,
    areaServed: {
      "@type": "Country",
      name: "Chile",
    },
    serviceType: [
      "Asesoría en planes de salud Isapre",
      "Cotización y comparación de Isapres",
      "Asesoría Isapre para empresas",
    ],
    sameAs: [
      siteConfig.social.facebook,
      siteConfig.social.instagram,
      siteConfig.social.linkedin,
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: siteConfig.contact.phone,
        contactType: "customer service",
        availableLanguage: ["es"],
        areaServed: "CL",
      },
    ],
    knowsAbout: [
      "Planes de Isapre",
      "Cotizar Isapre",
      "Comparar Isapres",
      "Cambiar de Isapre",
      "Isapre empresas Chile",
    ],
  };
}

export function getWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: siteConfig.name,
    alternateName: "Isapres Premium Cotizador",
    url: SITE_URL,
    description: SEO_PAGES.home.description,
    inLanguage: "es-CL",
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
    about: {
      "@id": `${SITE_URL}/#organization`,
    },
  };
}

export function getHomeJsonLd() {
  return [getOrganizationJsonLd(), getWebSiteJsonLd()];
}

export const SITEMAP_ROUTES = [
  { key: "home" as const, changeFrequency: "weekly" as const, priority: 1 },
  {
    key: "cotizador" as const,
    changeFrequency: "weekly" as const,
    priority: 0.95,
  },
  {
    key: "empresas" as const,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  },
  {
    key: "nosotros" as const,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  },
  {
    key: "politicas" as const,
    changeFrequency: "yearly" as const,
    priority: 0.3,
  },
  {
    key: "respaldoLegal" as const,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  },
];
