import type { QuoteCriteria } from "@/lib/quote-criteria-options";
import { createDefaultQuoteCriteria } from "@/lib/quote-criteria-options";
import type { CurrencyDisplay } from "@/components/cotizador/public/public-results-toolbar";
import { buildBeneficiaryGroupSummary } from "@/domain";
import {
  COVERAGE_PERCENTAGE_OPTIONS,
  createDefaultDashboardFilters,
  ISAPRE_FILTER_OPTIONS,
  PLAN_TYPE_FILTER_OPTIONS,
  ZONE_FILTER_OPTIONS,
} from "@/lib/filter-options";
import { buildZoneFilterStateFromRegion } from "@/lib/region-zones";
import { formatMonthlyIncomeForDisplay } from "@/lib/deep-link/income";
import {
  DEEP_LINK_PARAMS,
  VALID_CURRENCY,
  VALID_MODAL_VIEWS,
  VALID_REGIONS,
  VALID_CONTRIBUTOR_TYPES,
  VALID_SEX_VALUES,
  VALID_SORT_KEYS,
} from "@/lib/deep-link/params";
import type { QuoteSortKey } from "@/lib/quote-criteria-options";
import type {
  BeneficiaryGroupSummary,
  DependentBeneficiary,
  FamilyBeneficiariesState,
} from "@/types/beneficiary";
import type {
  CoveragePercentageOption,
  DashboardFiltersState,
} from "@/types/filters";

export type SolicitarModalTab = "overview" | "price" | "request";

export interface SolicitarRequestPrefill {
  name?: string;
  rut?: string;
  email?: string;
  phone?: string;
}

export interface ParsedCotizadorDeepLink {
  entidad?: string;
  criteria: QuoteCriteria;
  beneficiaries: FamilyBeneficiariesState;
  beneficiarySummary: BeneficiaryGroupSummary;
  filters: DashboardFiltersState;
  priceMin?: number;
  priceMax?: number;
  q?: string;
  sortKey?: QuoteSortKey;
  currency?: CurrencyDisplay;
  /** Si false, solo prellena el formulario sin buscar al cargar. */
  shouldAutoSearch: boolean;
  /** true cuando la URL trae al menos un param de cotización/filtro. */
  hasDeepLinkParams: boolean;
  /** Correo del cotizante (desde cotizaloantes.cl u otro origen). */
  email?: string;
  /** Código único del plan a abrir en el modal de solicitud. */
  planCode?: string;
  /** Pestaña inicial del modal cuando planCode está presente. */
  modalTab?: SolicitarModalTab;
  /** Datos parciales del formulario de solicitud. */
  requestPrefill?: SolicitarRequestPrefill;
  /** true cuando la URL incluye plan= (flujo solicitar desde sitio externo). */
  hasSolicitarDeepLink: boolean;
  /** true cuando la URL trae el parámetro zonas (no derivar desde región). */
  hasExplicitZoneParams: boolean;
}

function parseCommaList(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function applyCheckboxSelection(
  options: { id: string }[],
  defaults: Record<string, boolean>,
  selectedIds: string[],
): Record<string, boolean> {
  if (selectedIds.length === 0) return defaults;

  const allowed = new Set(options.map((option) => option.id));
  const selected = new Set(selectedIds.filter((id) => allowed.has(id)));

  return Object.fromEntries(
    options.map((option) => [option.id, selected.has(option.id)]),
  );
}

function parseCoveragePercent(
  raw: string | null,
): CoveragePercentageOption | null {
  if (!raw?.trim()) return null;
  const value = Number(raw);
  return COVERAGE_PERCENTAGE_OPTIONS.includes(value as CoveragePercentageOption)
    ? (value as CoveragePercentageOption)
    : null;
}

function parseDependents(raw: string | null): DependentBeneficiary[] {
  if (!raw?.trim()) return [];

  const dependents: DependentBeneficiary[] = [];

  raw.split(",").forEach((item, index) => {
    const age = Number(item.trim());
    if (!Number.isFinite(age) || age < 0 || age > 120) return;
    dependents.push({ id: `dep-${index}`, age: Math.round(age) });
  });

  return dependents;
}

function parseContributorAge(raw: string | null): number | null {
  if (!raw?.trim()) return null;
  const age = Number(raw);
  if (!Number.isFinite(age) || age < 0 || age > 120) return null;
  return Math.round(age);
}

function parsePrice(raw: string | null): number | undefined {
  if (!raw?.trim()) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

function parseEmail(raw: string | null): string | undefined {
  const value = raw?.trim().toLowerCase();
  if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return undefined;
  return value;
}

function parseModalTab(raw: string | null): SolicitarModalTab | undefined {
  const value = raw?.trim().toLowerCase();
  if (!value || !VALID_MODAL_VIEWS.has(value)) return undefined;

  if (value === "price" || value === "precio") return "price";
  if (value === "request" || value === "solicitar") return "request";
  return "overview";
}

function parseOptionalText(raw: string | null): string | undefined {
  const value = raw?.trim();
  return value || undefined;
}

function hasDeepLinkFilterParams(params: URLSearchParams): boolean {
  const keys = [
    DEEP_LINK_PARAMS.region,
    DEEP_LINK_PARAMS.edad,
    DEEP_LINK_PARAMS.sexo,
    DEEP_LINK_PARAMS.ingreso,
    DEEP_LINK_PARAMS.cargas,
    DEEP_LINK_PARAMS.q,
    DEEP_LINK_PARAMS.precioMin,
    DEEP_LINK_PARAMS.precioMax,
    DEEP_LINK_PARAMS.isapres,
    DEEP_LINK_PARAMS.zonas,
    DEEP_LINK_PARAMS.clinica,
    DEEP_LINK_PARAMS.clinicaH,
    DEEP_LINK_PARAMS.clinicaA,
    DEEP_LINK_PARAMS.tipoPlan,
    DEEP_LINK_PARAMS.coberturaH,
    DEEP_LINK_PARAMS.coberturaA,
    DEEP_LINK_PARAMS.orden,
    DEEP_LINK_PARAMS.moneda,
    DEEP_LINK_PARAMS.email,
    DEEP_LINK_PARAMS.nombre,
    DEEP_LINK_PARAMS.rut,
    DEEP_LINK_PARAMS.telefono,
    DEEP_LINK_PARAMS.plan,
    DEEP_LINK_PARAMS.vista,
  ];

  return keys.some((key) => params.has(key));
}

function resolveShouldAutoSearch(params: URLSearchParams): boolean {
  const auto = params.get(DEEP_LINK_PARAMS.auto)?.trim();
  if (auto === "0") return false;
  if (auto === "1") return true;
  return true;
}

export function parseCotizadorUrl(
  params: URLSearchParams,
): ParsedCotizadorDeepLink {
  const defaults = createDefaultDashboardFilters();
  const isapreIds = parseCommaList(params.get(DEEP_LINK_PARAMS.isapres));
  const zoneIds = parseCommaList(params.get(DEEP_LINK_PARAMS.zonas));
  const hasExplicitZoneParams = params.has(DEEP_LINK_PARAMS.zonas);
  const planTypeIds = parseCommaList(params.get(DEEP_LINK_PARAMS.tipoPlan));

  const regionRaw = params.get(DEEP_LINK_PARAMS.region)?.trim().toLowerCase();
  const sexRaw = params.get(DEEP_LINK_PARAMS.sexo)?.trim().toLowerCase();
  const contributorTypeRaw = params
    .get(DEEP_LINK_PARAMS.tipoCotizante)
    ?.trim()
    .toLowerCase();
  const sortRaw = params.get(DEEP_LINK_PARAMS.orden)?.trim().toLowerCase();
  const currencyRaw = params.get(DEEP_LINK_PARAMS.moneda)?.trim().toLowerCase();

  const primaryAge = parseContributorAge(params.get(DEEP_LINK_PARAMS.edad));
  const beneficiaries: FamilyBeneficiariesState = {
    contributors:
      primaryAge !== null
        ? [{ id: "contributor", age: primaryAge }]
        : [],
    dependents: parseDependents(params.get(DEEP_LINK_PARAMS.cargas)),
  };

  const criteria: QuoteCriteria = {
    region: regionRaw && VALID_REGIONS.has(regionRaw) ? regionRaw : "rm",
    monthlyIncome: formatMonthlyIncomeForDisplay(
      params.get(DEEP_LINK_PARAMS.ingreso),
    ),
    contributorType:
      contributorTypeRaw && VALID_CONTRIBUTOR_TYPES.has(contributorTypeRaw)
        ? (contributorTypeRaw as QuoteCriteria["contributorType"])
        : "",
    ...(sexRaw && VALID_SEX_VALUES.has(sexRaw) ? { sex: sexRaw } : {}),
  };

  const resolvedRegion = criteria.region;
  const zoneDefaults = hasExplicitZoneParams
    ? defaults.zones
    : buildZoneFilterStateFromRegion(resolvedRegion);

  const legacyClinicIds = parseCommaList(params.get(DEEP_LINK_PARAMS.clinica));
  const hasTypedClinicParams =
    params.has(DEEP_LINK_PARAMS.clinicaH) ||
    params.has(DEEP_LINK_PARAMS.clinicaA);
  const hospitalClinicIds = params.has(DEEP_LINK_PARAMS.clinicaH)
    ? parseCommaList(params.get(DEEP_LINK_PARAMS.clinicaH))
    : hasTypedClinicParams
      ? []
      : legacyClinicIds;
  const ambulatoryClinicIds = params.has(DEEP_LINK_PARAMS.clinicaA)
    ? parseCommaList(params.get(DEEP_LINK_PARAMS.clinicaA))
    : hasTypedClinicParams
      ? []
      : legacyClinicIds;

  const filters: DashboardFiltersState = {
    isapres: applyCheckboxSelection(
      ISAPRE_FILTER_OPTIONS,
      defaults.isapres,
      isapreIds,
    ),
    zones: hasExplicitZoneParams
      ? applyCheckboxSelection(ZONE_FILTER_OPTIONS, zoneDefaults, zoneIds)
      : zoneDefaults,
    planTypes: applyCheckboxSelection(
      PLAN_TYPE_FILTER_OPTIONS,
      defaults.planTypes,
      planTypeIds,
    ),
    hospitalClinicIds,
    ambulatoryClinicIds,
    hospitalCoveragePercent: parseCoveragePercent(
      params.get(DEEP_LINK_PARAMS.coberturaH),
    ),
    ambulatoryCoveragePercent: parseCoveragePercent(
      params.get(DEEP_LINK_PARAMS.coberturaA),
    ),
  };

  const agent = params.get(DEEP_LINK_PARAMS.agent)?.trim().toLowerCase();
  const entidadLegacy = params.get(DEEP_LINK_PARAMS.entidad)?.trim().toLowerCase();
  const entidad = agent || entidadLegacy || undefined;
  const planCode = parseOptionalText(params.get(DEEP_LINK_PARAMS.plan));
  const email = parseEmail(params.get(DEEP_LINK_PARAMS.email));
  const requestPrefill: SolicitarRequestPrefill = {
    name: parseOptionalText(params.get(DEEP_LINK_PARAMS.nombre)),
    rut: parseOptionalText(params.get(DEEP_LINK_PARAMS.rut)),
    email,
    phone: parseOptionalText(params.get(DEEP_LINK_PARAMS.telefono)),
  };
  const hasRequestPrefill = Object.values(requestPrefill).some(Boolean);
  const modalTab =
    parseModalTab(params.get(DEEP_LINK_PARAMS.vista)) ??
    (planCode ? "request" : undefined);

  return {
    entidad,
    criteria,
    beneficiaries,
    beneficiarySummary: buildBeneficiaryGroupSummary(beneficiaries),
    filters,
    priceMin: parsePrice(params.get(DEEP_LINK_PARAMS.precioMin)),
    priceMax: parsePrice(params.get(DEEP_LINK_PARAMS.precioMax)),
    q: params.get(DEEP_LINK_PARAMS.q)?.trim() || undefined,
    sortKey:
      sortRaw && VALID_SORT_KEYS.has(sortRaw)
        ? (sortRaw as QuoteSortKey)
        : undefined,
    currency:
      currencyRaw && VALID_CURRENCY.has(currencyRaw)
        ? (currencyRaw as CurrencyDisplay)
        : undefined,
    shouldAutoSearch: resolveShouldAutoSearch(params),
    hasDeepLinkParams: hasDeepLinkFilterParams(params),
    email,
    planCode,
    modalTab,
    requestPrefill: hasRequestPrefill ? requestPrefill : undefined,
    hasSolicitarDeepLink: Boolean(planCode),
    hasExplicitZoneParams,
  };
}
