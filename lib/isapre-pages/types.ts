export interface IsapreHighlight {
  title: string;
  description: string;
}

export interface IsapreFeaturedPlan {
  code: string;
  name: string;
  priceUf: number;
  description: string;
  badge?: "economico" | "premium";
}

export interface IsaprePageContent {
  id: string;
  name: string;
  badge: string;
  tagline: string;
  heroDescription: string;
  officialWebsite: string;
  logoSrc: string;
  benefits: string[];
  idealFor: string[];
  highlights: IsapreHighlight[];
  featuredPlanDescriptions: Record<string, string>;
}

export interface IsaprePageStats {
  planCount: number;
  minPriceUf: number | null;
  avgHospitalPct: number | null;
  avgAmbulatoryPct: number | null;
  providerCount: number;
  featuredPlans: IsapreFeaturedPlan[];
}

export interface IsaprePageData {
  content: IsaprePageContent;
  stats: IsaprePageStats;
  gesUf: number;
}
