import { ISAPRE_GES_DEFAULTS } from "@/lib/isapre-ges-defaults";
import { getIsaprePageContent } from "@/lib/isapre-pages/content";
import { loadIsaprePageStats } from "@/lib/isapre-pages/stats";
import type { IsaprePageData } from "@/lib/isapre-pages/types";

export async function loadIsaprePageData(slug: string): Promise<IsaprePageData | null> {
  const content = getIsaprePageContent(slug);
  if (!content) return null;

  const stats = await loadIsaprePageStats(
    content.id,
    content.featuredPlanDescriptions,
  );

  return {
    content,
    stats,
    gesUf: ISAPRE_GES_DEFAULTS[content.id]?.gesPremiumUf ?? 0.731,
  };
}
