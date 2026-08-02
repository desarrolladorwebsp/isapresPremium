import { getFallbackPartnerEntity } from "@/lib/partner-entity/fallback-entities";
import { ISAPRE_PREMIUM_AGENT_KEY } from "@/lib/partner-entity/isapre-premium-agent";
import { PLATFORM_AGENT_KEY } from "@/lib/partner-entity/platform-agent";

const SLUG_ALIASES: Record<string, string> = {
  cotizaloantes: "Cotízalo Antes",
  desdetu7: "Desde Tu 7",
  [PLATFORM_AGENT_KEY]: "Cotizador Premium",
  [ISAPRE_PREMIUM_AGENT_KEY]: "Isapres Premium",
  isaprepremium: "Isapres Premium",
};

export interface CotizadorSourceInfo {
  slug: string | null;
  name: string | null;
  label: string;
  description: string;
}

export type CotizadorSourceKey =
  | "cotizaloantes"
  | "desdetu7"
  | "cotizadorpremium"
  | "isaprespremium"
  | "unknown";

export const COTIZADOR_SOURCE_BADGE_CLASS: Record<CotizadorSourceKey, string> = {
  cotizaloantes:
    "bg-orange-100 text-orange-950 ring-1 ring-inset ring-orange-200",
  desdetu7:
    "bg-violet-100 text-violet-950 ring-1 ring-inset ring-violet-200",
  cotizadorpremium:
    "bg-sky-100 text-sky-950 ring-1 ring-inset ring-sky-200",
  isaprespremium:
    "bg-emerald-100 text-emerald-950 ring-1 ring-inset ring-emerald-200",
  unknown: "bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200",
};

export function resolveCotizadorSourceKey(
  slug?: string | null,
): CotizadorSourceKey {
  const normalized = slug?.trim().toLowerCase() || null;
  if (!normalized) return "unknown";
  if (normalized === "cotizaloantes") return "cotizaloantes";
  if (normalized === "desdetu7") return "desdetu7";
  if (normalized === PLATFORM_AGENT_KEY || normalized === "cotizadorpremium") {
    return "cotizadorpremium";
  }
  if (normalized === ISAPRE_PREMIUM_AGENT_KEY || normalized === "isaprepremium") {
    return "isaprespremium";
  }
  return "unknown";
}

export function getCotizadorSourceBadgeClass(
  slug?: string | null,
): string {
  return COTIZADOR_SOURCE_BADGE_CLASS[resolveCotizadorSourceKey(slug)];
}

export function resolveCotizadorSourceLabel(
  slug?: string | null,
  name?: string | null,
): string | null {
  const normalized = slug?.trim().toLowerCase() || null;

  if (normalized) {
    const fallback = getFallbackPartnerEntity(normalized);
    if (fallback?.name) return fallback.name;
    if (SLUG_ALIASES[normalized]) return SLUG_ALIASES[normalized];
  }

  const trimmedName = name?.trim();
  if (trimmedName) return trimmedName;

  if (normalized) {
    return normalized
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  return null;
}

function formatCotizadorSourceDescription(label: string): string {
  if (label.toLowerCase().startsWith("desde ")) return label;
  return `Desde ${label}`;
}

export function resolveCotizadorSource(
  slug?: string | null,
  name?: string | null,
): CotizadorSourceInfo | null {
  const label = resolveCotizadorSourceLabel(slug, name);
  if (!label) return null;

  return {
    slug: slug?.trim().toLowerCase() || null,
    name: name?.trim() || null,
    label,
    description: formatCotizadorSourceDescription(label),
  };
}

export function resolveCotizadorSourceFromQuote(input: {
  partnerEntitySlug?: string | null;
  partnerEntityName?: string | null;
}): CotizadorSourceInfo | null {
  return resolveCotizadorSource(
    input.partnerEntitySlug,
    input.partnerEntityName,
  );
}
