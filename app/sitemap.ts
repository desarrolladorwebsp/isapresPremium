import type { MetadataRoute } from "next";
import { SEO_PAGES, SITEMAP_ROUTES, absoluteUrl } from "@/constants/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return SITEMAP_ROUTES.map(({ key, changeFrequency, priority }) => ({
    url: absoluteUrl(SEO_PAGES[key].path),
    lastModified,
    changeFrequency,
    priority,
  }));
}
