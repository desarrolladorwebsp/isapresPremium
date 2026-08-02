import { buildCotizadorUrl } from "@/lib/deep-link/build-cotizador-url";
import { PREMIUM_COTIZADOR_PATH } from "@/lib/platform/routing";
import { PLATFORM_AGENT_KEY } from "@/lib/partner-entity/platform-agent";

function toAppPath(fullUrl: string): string {
  try {
    const url = new URL(fullUrl);
    return `${url.pathname}${url.search}`;
  } catch {
    return fullUrl;
  }
}

export function buildIsapreCotizadorUrl(isapreId: string): string {
  return toAppPath(
    buildCotizadorUrl({
      agent: PLATFORM_AGENT_KEY,
      isapres: [isapreId],
    }),
  );
}

export function buildIsaprePlanCotizadorUrl(
  isapreId: string,
  planCode: string,
): string {
  return toAppPath(
    buildCotizadorUrl({
      agent: PLATFORM_AGENT_KEY,
      isapres: [isapreId],
      plan: planCode,
      auto: true,
    }),
  );
}

export function buildIsapresIndexUrl(): string {
  return "/#isapres";
}

export function buildIsaprePagePath(isapreId: string): string {
  return `/isapres/${isapreId}`;
}

/** Atajo relativo al cotizador premium sin filtros. */
export function buildPremiumCotizadorPath(): string {
  return `${PREMIUM_COTIZADOR_PATH}?agent=${PLATFORM_AGENT_KEY}`;
}
