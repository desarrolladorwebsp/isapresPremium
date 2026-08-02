import type { CurrencyDisplay } from "@/components/cotizador/public/public-results-toolbar";
import { getActiveCheckboxIds } from "@/lib/filter-options";
import { getPrimaryContributorAge } from "@/lib/beneficiary-state";
import {
  buildCotizadorUrlFromParsed,
  buildSolicitarUrl,
} from "@/lib/deep-link/build-cotizador-url";
import type { ParsedCotizadorDeepLink } from "@/lib/deep-link/parse-cotizador-url";
import { resolveAppBaseUrl } from "@/lib/platform/routing";
import type {
  BeneficiaryGroupSummary,
  DashboardFiltersState,
  FamilyBeneficiariesState,
} from "@/domain";
import {
  formatMissingQuoteCriteriaMessage,
  getMissingQuoteCriteriaFields,
} from "@/lib/quote-criteria-validation";
import type { QuoteCriteria, QuoteSortKey } from "@/lib/quote-criteria-options";

export const EMBED_SOLICITAR_VALIDATION_MESSAGE =
  "Para solicitar el plan y recibir un precio adecuado, completa edad, tipo de cotizante y renta imponible en la barra superior.";

export const EMBED_SEARCH_VALIDATION_MESSAGE =
  "Para continuar al cotizador completo, completa edad, tipo de cotizante y renta imponible en la barra superior.";

export interface EmbedExitUrlInput {
  baseUrl?: string;
  entidad?: string;
  criteria: QuoteCriteria;
  beneficiarySummary: BeneficiaryGroupSummary;
  beneficiaries: FamilyBeneficiariesState;
  dashboardFilters: DashboardFiltersState;
  priceMin?: number;
  priceMax?: number;
  searchText?: string;
  sortKey: QuoteSortKey;
  currency: CurrencyDisplay;
  email?: string;
}

function resolveCotizadorBaseUrl(baseUrl?: string): string {
  return resolveAppBaseUrl(baseUrl);
}

/** Estado del widget → deep link parseado (misma forma que la API pública). */
export function buildParsedDeepLinkFromEmbedState(
  input: EmbedExitUrlInput,
): ParsedCotizadorDeepLink {
  return {
    entidad: input.entidad ?? "cotizaloantes",
    criteria: input.criteria,
    beneficiaries: input.beneficiaries,
    beneficiarySummary: input.beneficiarySummary,
    filters: input.dashboardFilters,
    priceMin: input.priceMin,
    priceMax: input.priceMax,
    q: input.searchText?.trim() || undefined,
    sortKey: input.sortKey,
    currency: input.currency,
    shouldAutoSearch: true,
    hasDeepLinkParams: true,
    email: input.email?.trim() || undefined,
    hasSolicitarDeepLink: false,
    hasExplicitZoneParams:
      getActiveCheckboxIds(input.dashboardFilters.zones).length > 0,
  };
}

/** URL de salida del widget → /cotizador con params de la API (`auto=1`, agent, filtros, etc.). */
export function buildEmbedSearchExitUrl(input: EmbedExitUrlInput): string {
  const url = buildCotizadorUrlFromParsed(
    buildParsedDeepLinkFromEmbedState(input),
    resolveCotizadorBaseUrl(input.baseUrl),
    { forcePremiumPath: true },
  );

  const parsed = new URL(url);
  parsed.searchParams.delete("embed");
  return parsed.toString();
}

/** URL de salida del widget → modal solicitar en el cotizador completo */
export function buildEmbedSolicitarExitUrl(
  input: EmbedExitUrlInput & { planCode: string },
): string {
  const parsed = buildParsedDeepLinkFromEmbedState(input);
  return buildSolicitarUrl({
    baseUrl: resolveCotizadorBaseUrl(input.baseUrl),
    agent: parsed.entidad,
    entidad: parsed.entidad,
    region: parsed.criteria.region || undefined,
    edad:
      parsed.beneficiarySummary.contributor.age ??
      getPrimaryContributorAge(parsed.beneficiaries) ??
      undefined,
    sexo: parsed.criteria.sex || undefined,
    ingreso: parsed.criteria.monthlyIncome || undefined,
    cargas: parsed.beneficiaries.dependents
      .map((dependent) => dependent.age)
      .filter((age): age is number => age !== null && age >= 0),
    q: parsed.q,
    precioMin: parsed.priceMin,
    precioMax: parsed.priceMax,
    isapres: getActiveCheckboxIds(parsed.filters.isapres),
    zonas: getActiveCheckboxIds(parsed.filters.zones),
    tipoPlan: getActiveCheckboxIds(parsed.filters.planTypes),
    coberturaH: parsed.filters.hospitalCoveragePercent ?? undefined,
    coberturaA: parsed.filters.ambulatoryCoveragePercent ?? undefined,
    orden: parsed.sortKey,
    moneda: parsed.currency,
    auto: true,
    email: parsed.email,
    plan: input.planCode,
    vista: "solicitar",
  }, { forcePremiumPath: true });
}

export function validateEmbedQuoteCriteria(
  input: Pick<
    EmbedExitUrlInput,
    "criteria" | "beneficiarySummary" | "beneficiaries"
  >,
): string | null {
  const missing = getMissingEmbedCriteriaFields(input);
  if (missing.length === 0) return null;
  return formatMissingQuoteCriteriaMessage(
    missing,
    EMBED_SEARCH_VALIDATION_MESSAGE,
  );
}

export function validateEmbedSolicitarCriteria(
  input: Pick<
    EmbedExitUrlInput,
    "criteria" | "beneficiarySummary" | "beneficiaries"
  >,
): string | null {
  const missing = getMissingEmbedCriteriaFields(input);
  if (missing.length === 0) return null;
  return formatMissingQuoteCriteriaMessage(
    missing,
    EMBED_SOLICITAR_VALIDATION_MESSAGE,
  );
}

function getMissingEmbedCriteriaFields(
  input: Pick<
    EmbedExitUrlInput,
    "criteria" | "beneficiarySummary" | "beneficiaries"
  >,
): string[] {
  return getMissingQuoteCriteriaFields(input);
}

/** Navega al cotizador completo desde un iframe embebido (recarga completa). */
export function navigateTopLevel(url: string, delayMs = 0): void {
  const navigate = () => {
    try {
      if (window.top && window.top !== window.self) {
        window.top.location.href = url;
        return;
      }
    } catch {
      // Si el navegador bloquea top, abrimos en la misma ventana del iframe.
    }
    window.location.href = url;
  };

  if (delayMs > 0) {
    window.setTimeout(navigate, delayMs);
    return;
  }

  navigate();
}
