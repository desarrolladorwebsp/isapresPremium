import type { Metadata } from "next";
import { PROD_APP_BASE_URL } from "@/lib/platform/routing";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_PATH,
  DEFAULT_OG_IMAGE_WIDTH,
  SITE_LOCALE,
  SITE_NAME,
} from "@/lib/seo/site-config";

export interface PageMetadataInput {
  /** Título corto; el layout aplica la plantilla «%s | Cotizador Premium». */
  title: string;
  description?: string;
  /** Ruta canónica relativa, p. ej. `/cotizador`. */
  path?: string;
  keywords?: readonly string[];
  noIndex?: boolean;
  ogImagePath?: string;
  ogImageAlt?: string;
  ogType?: "website" | "article";
  /** Evita la plantilla del layout (p. ej. home). */
  absoluteTitle?: boolean;
  /**
   * Forzar noindex (p. ej. dominio legacy cotizador.cotizaloantes.cl).
   * Los canónicos siguen apuntando a cotizadorpremium.cl.
   */
  forceNoIndex?: boolean;
}

/** Canónicos siempre al dominio premium, aunque el request sea legacy. */
function resolveCanonicalUrl(path?: string): string | undefined {
  if (!path) return undefined;
  const base = PROD_APP_BASE_URL.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export function buildPageMetadata(input: PageMetadataInput): Metadata {
  const description = input.description ?? DEFAULT_DESCRIPTION;
  const keywords = input.keywords ?? DEFAULT_KEYWORDS;
  const ogImagePath = input.ogImagePath ?? DEFAULT_OG_IMAGE_PATH;
  const ogImageAlt = input.ogImageAlt ?? SITE_NAME;
  const canonical = resolveCanonicalUrl(input.path);
  const fullTitle = input.absoluteTitle
    ? input.title
    : `${input.title} | ${SITE_NAME}`;
  const shouldNoIndex = Boolean(input.noIndex || input.forceNoIndex);

  const robots = shouldNoIndex
    ? { index: false as const, follow: true as const }
    : {
        index: true as const,
        follow: true as const,
        googleBot: {
          index: true as const,
          follow: true as const,
          "max-image-preview": "large" as const,
          "max-snippet": -1 as const,
        },
      };

  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description,
    keywords: [...keywords],
    alternates: canonical ? { canonical } : undefined,
    robots,
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      type: input.ogType ?? "website",
      images: [
        {
          url: ogImagePath,
          width: DEFAULT_OG_IMAGE_WIDTH,
          height: DEFAULT_OG_IMAGE_HEIGHT,
          alt: ogImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImagePath],
    },
  };
}

/** Metadatos base compartidos por el layout raíz. */
export function buildRootMetadata(options?: {
  forceNoIndex?: boolean;
}): Metadata {
  const canonicalBase = PROD_APP_BASE_URL.replace(/\/$/, "");
  const forceNoIndex = Boolean(options?.forceNoIndex);

  return {
    metadataBase: new URL(canonicalBase),
    title: {
      default: `${SITE_NAME} — Cotiza y compara planes Isapre en Chile`,
      template: `%s | ${SITE_NAME}`,
    },
    description: DEFAULT_DESCRIPTION,
    keywords: [...DEFAULT_KEYWORDS],
    applicationName: SITE_NAME,
    manifest: "/site.webmanifest",
    category: "health",
    creator: SITE_NAME,
    publisher: SITE_NAME,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    openGraph: {
      title: `${SITE_NAME} — Cotiza y compara planes Isapre en Chile`,
      description: DEFAULT_DESCRIPTION,
      url: canonicalBase,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      type: "website",
      images: [
        {
          url: DEFAULT_OG_IMAGE_PATH,
          width: DEFAULT_OG_IMAGE_WIDTH,
          height: DEFAULT_OG_IMAGE_HEIGHT,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} — Cotiza y compara planes Isapre en Chile`,
      description: DEFAULT_DESCRIPTION,
      images: [DEFAULT_OG_IMAGE_PATH],
    },
    robots: forceNoIndex
      ? { index: false, follow: true }
      : {
          index: true,
          follow: true,
        },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "48x48" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
  };
}
