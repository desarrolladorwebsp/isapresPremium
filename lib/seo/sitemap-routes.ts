import { ISAPRE_PAGE_SLUGS } from "@/lib/isapre-pages/content";
import { readActivePartnerSlugs } from "@/lib/partner-entity/store";
import { PROD_APP_BASE_URL } from "@/lib/platform/routing";
import type { MetadataRoute } from "next";

export async function buildSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  // Sitemap siempre en el dominio canónico SEO.
  const baseUrl = PROD_APP_BASE_URL.replace(/\/$/, "");
  const now = new Date();
  const slugs = await readActivePartnerSlugs();

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/inicio`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/cotizador`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.95,
    },
  ];

  for (const isapreSlug of ISAPRE_PAGE_SLUGS) {
    entries.push({
      url: `${baseUrl}/isapres/${isapreSlug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    });
  }

  for (const slug of slugs) {
    if (slug === "cotizadorpremium") continue;

    entries.push({
      url: `${baseUrl}/cotizador?agent=${encodeURIComponent(slug)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    });

    entries.push({
      url: `${baseUrl}/${encodeURIComponent(slug)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return entries;
}
