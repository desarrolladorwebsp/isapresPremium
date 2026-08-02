"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { FiltersFab } from "@/components/filters";
import {
  PartnerEntityProvider,
  usePartnerEntity,
} from "@/components/partner/partner-entity-provider";
import { useCotizadorDashboard } from "@/hooks/use-cotizador-dashboard";
import { usePlanCatalogBounds } from "@/hooks/use-plan-catalog-bounds";
import { useEmbedResize, postEmbedExitNavigate } from "@/hooks/use-embed-resize";
import { useClientPlanSearch, FILTER_DEBOUNCE_MS } from "@/hooks/use-client-plan-search";
import {
  applyRegionToDashboardFilters,
  buildBeneficiaryGroupSummary,
  createDefaultDashboardFilters,
  getActiveAmbulatoryClinicIds,
  getActiveHospitalClinicIds,
  withoutEmbedWidgetFilters,
} from "@/domain";
import {
  buildEmbedSearchExitUrl,
  navigateTopLevel,
  validateEmbedQuoteCriteria,
  validateEmbedSolicitarCriteria,
} from "@/lib/deep-link/build-embed-exit-url";
import { EMBED_EXIT_LOADING_TITLE } from "@/lib/embed/constants";
import {
  clearEmbedExitSearchPending,
  markEmbedExitSearchPending,
  readEmbedExitSearchPending,
} from "@/lib/embed/exit-search-session";
import { resolveAppBaseUrl } from "@/lib/platform/routing";
import { parseCotizadorUrl } from "@/lib/deep-link/parse-cotizador-url";
import {
  SOLICITAR_DEEP_LINK_RECOVERY_MS,
  SOLICITAR_RECOVERY_NOTICE,
  stripSolicitarParamsFromBrowserUrl,
} from "@/lib/deep-link/solicitar-recovery";
import { mapHealthPlanToSummary } from "@/lib/api/plan-summary";
import { primePlanDetailCache } from "@/hooks/use-plan-detail";
import { notifyCotizacionByEmail } from "@/lib/cotizacion-notify/client";
import {
  EMBED_WIDGET_PLANS_LIMIT,
  INITIAL_PLANS_PAGE_SIZE,
} from "@/lib/plan-search-config";
import { sortHealthPlanSummariesByFinalPriceAsc } from "@/lib/plan-sort";
import type { QuoteSortKey } from "@/lib/quote-criteria-options";
import { createDefaultQuoteCriteria } from "@/lib/quote-criteria-options";
import {
  appShellRoot,
  appShellScroll,
  publicCotizadorShell,
  safeWidth,
  touchTarget,
  ui,
} from "@/lib/ui-tokens";
import {
  scrollAppShellToTop,
  scrollElementIntoAppShell,
} from "@/lib/scroll/scroll-into-view";
import { joinClasses } from "@/lib/utils";
import type { DashboardFiltersState, HealthPlanSummary } from "@/domain";
import type { HealthPlan } from "@/types/plan";
import type { PartnerEntityPublic } from "@/types/partner-entity";
import { ContractPlanModal } from "./contract-plan-modal";
import {
  CompanyAgreementProvider,
  useCompanyAgreementContext,
} from "@/components/cotizador/company-agreement";
import { toCotizacionNotifyConvenio } from "@/lib/company-agreements/cotizacion-notify-convenio";
import { EmbedExitLoadingOverlay } from "./embed-exit-loading-overlay";
import { PublicCotizadorNotice } from "./public-cotizador-notice";
import { PublicCotizadorHeader } from "./public-cotizador-header";
import { PublicFiltersSidebar } from "./public-filters-sidebar";
import { PublicPlanResultsList } from "./public-plan-results-list";
import {
  PublicPlanResultsLoading,
  PublicPlanResultsLoadingInline,
} from "./public-plan-results-loading";
import {
  PublicQuoteCriteriaBar,
  type QuoteCriteria,
} from "./public-quote-criteria-bar";
import {
  PublicResultsToolbar,
  type CurrencyDisplay,
} from "./public-results-toolbar";

export interface PublicCotizadorViewProps {
  entity?: PartnerEntityPublic | null;
  /** Vista optimizada para iframe embebido (sin chrome de salida ni FAB). */
  embedMode?: boolean;
}

export function PublicCotizadorView({
  entity = null,
  embedMode = false,
}: PublicCotizadorViewProps) {
  return (
    <PartnerEntityProvider entity={entity}>
      <CompanyAgreementProvider>
        <Suspense
          fallback={
            <div
              className={
                embedMode
                  ? "flex flex-col items-center justify-center gap-3 bg-bg-layout px-4 py-12 text-center"
                  : "flex min-h-[320px] flex-col items-center justify-center gap-3 bg-bg-layout px-4 text-center"
              }
            >
              <div className="size-10 motion-safe:animate-spin rounded-full border-2 border-primary/15 border-t-primary" />
              <p className="text-sm font-semibold text-primary-dark">
                Buscando el mejor plan para ti…
              </p>
              <p className="text-xs text-muted">Cargando cotizador</p>
            </div>
          }
        >
          <PublicCotizadorViewInner embedMode={embedMode} />
        </Suspense>
      </CompanyAgreementProvider>
    </PartnerEntityProvider>
  );
}

function PublicCotizadorViewInner({ embedMode }: { embedMode: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { validatedAgreement } = useCompanyAgreementContext();
  const searchParams = useSearchParams();
  const isEmbedded =
    embedMode ||
    searchParams.get("embed") === "1" ||
    searchParams.get("embed") === "true";
  const pageSize = isEmbedded
    ? EMBED_WIDGET_PLANS_LIMIT
    : INITIAL_PLANS_PAGE_SIZE;

  const deepLinkParamKey = searchParams.toString();
  const deepLink = useMemo(
    () => parseCotizadorUrl(searchParams),
    [searchParams],
  );

  const { entity, isBranded, themeStyle } = usePartnerEntity();
  const [bootstrappedExitSearch, setBootstrappedExitSearch] = useState(
    () => readEmbedExitSearchPending(),
  );
  const dashboard = useCotizadorDashboard([], {
    initialBeneficiaries: deepLink.beneficiaries,
    initialBeneficiarySummary: deepLink.beneficiarySummary,
    initialDashboardFilters: isEmbedded
      ? withoutEmbedWidgetFilters(deepLink.filters)
      : deepLink.filters,
    initialPriceMin: deepLink.priceMin,
    initialPriceMax: deepLink.priceMax,
  });
  const { bounds, loading: boundsLoading } = usePlanCatalogBounds();
  const loadEmbedPreview =
    isEmbedded && !deepLink.shouldAutoSearch && !bootstrappedExitSearch;

  const {
    plans,
    total,
    loading,
    error,
    hasSearched,
    search,
    resetSearchCache,
    resetSearch,
  } = useClientPlanSearch({
    embedPreviewOnMount: loadEmbedPreview,
    preloadCatalog: false,
  });
  const resultsRef = useRef<HTMLElement>(null);
  const criteriaBarRef = useRef<HTMLDivElement>(null);
  const initialSearchDoneRef = useRef(false);
  const skipDebouncedSearchRef = useRef(false);
  const solicitarFetchStartedRef = useRef<string | null>(null);
  const solicitarRecoveryDoneRef = useRef(false);
  const [formReady, setFormReady] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [recoveryNoticeKey, setRecoveryNoticeKey] = useState(0);
  const [solicitarFlowActive, setSolicitarFlowActive] = useState(
    () => deepLink.hasSolicitarDeepLink,
  );

  const [criteria, setCriteria] = useState<QuoteCriteria>(deepLink.criteria);
  const [sortKey] = useState<QuoteSortKey>("price_asc");
  const [currency, setCurrency] = useState<CurrencyDisplay>(
    deepLink.currency ?? "clp",
  );
  const [contractPlan, setContractPlan] = useState<HealthPlanSummary | null>(
    null,
  );
  const [contractModalTab, setContractModalTab] = useState<
    "overview" | "price" | "request" | undefined
  >(deepLink.modalTab);
  const [searchText, setSearchText] = useState(deepLink.q ?? "");
  const [resultsPage, setResultsPage] = useState(1);
  const [notifyEmail, setNotifyEmail] = useState(deepLink.email ?? "");
  const searchNotifySentRef = useRef(false);
  const [embedExitLoading, setEmbedExitLoading] = useState(false);

  useEffect(() => {
    setBootstrappedExitSearch(readEmbedExitSearchPending());
  }, []);

  const embedMeasureKey = [
    hasSearched,
    loading,
    plans.length,
    recoveryNotice,
    embedExitLoading,
    contractPlan?.unique_code ?? "",
    dashboard.sidebarOpen,
  ].join("|");

  useEmbedResize(isEmbedded, rootRef, embedMeasureKey);

  const showEmbedValidationNotice = useCallback((message: string) => {
    setRecoveryNotice(message);
    setRecoveryNoticeKey((key) => key + 1);
    if (isEmbedded) {
      scrollAppShellToTop("smooth");
      return;
    }
    window.requestAnimationFrame(() => {
      scrollElementIntoAppShell(criteriaBarRef.current, {
        behavior: "smooth",
        block: "start",
      });
    });
  }, [isEmbedded]);

  useEffect(() => {
    if (deepLink.hasDeepLinkParams || deepLink.hasSolicitarDeepLink) {
      setCriteria(deepLink.criteria);
      setSearchText(deepLink.q ?? deepLink.planCode ?? "");
      if (deepLink.currency) setCurrency(deepLink.currency);
      if (deepLink.email) setNotifyEmail(deepLink.email);
      if (deepLink.modalTab) setContractModalTab(deepLink.modalTab);
      searchNotifySentRef.current = false;

      dashboard.handleBeneficiariesChange(
        deepLink.beneficiaries,
        deepLink.beneficiarySummary,
      );
      dashboard.setDashboardFilters(
        isEmbedded
          ? withoutEmbedWidgetFilters(
              deepLink.hasExplicitZoneParams
                ? deepLink.filters
                : applyRegionToDashboardFilters(
                    deepLink.filters,
                    deepLink.criteria.region,
                  ),
            )
          : deepLink.hasExplicitZoneParams
            ? deepLink.filters
            : applyRegionToDashboardFilters(
                deepLink.filters,
                deepLink.criteria.region,
              ),
      );

      if (deepLink.priceMin !== undefined) {
        dashboard.setPriceMin(deepLink.priceMin);
      }
      if (deepLink.priceMax !== undefined) {
        dashboard.setPriceMax(deepLink.priceMax);
      }

      initialSearchDoneRef.current = false;
      solicitarFetchStartedRef.current = null;
      solicitarRecoveryDoneRef.current = false;
      setRecoveryNotice(null);
      setSolicitarFlowActive(deepLink.hasSolicitarDeepLink);
      resetSearchCache();
      setResultsPage(1);
    }

    setFormReady(true);
  }, [
    deepLinkParamKey,
    deepLink,
    dashboard.handleBeneficiariesChange,
    resetSearchCache,
  ]);

  useEffect(() => {
    if (hasSearched && bootstrappedExitSearch) {
      clearEmbedExitSearchPending();
      setBootstrappedExitSearch(false);
    }
  }, [hasSearched, bootstrappedExitSearch]);

  useEffect(() => {
    if (!formReady || deepLink.hasExplicitZoneParams) return;

    dashboard.setDashboardFilters((currentFilters) => {
      const baseFilters = isEmbedded
        ? withoutEmbedWidgetFilters(currentFilters)
        : currentFilters;
      return applyRegionToDashboardFilters(baseFilters, criteria.region);
    });
  }, [
    formReady,
    deepLink.hasExplicitZoneParams,
    criteria.region,
    isEmbedded,
    dashboard.setDashboardFilters,
  ]);

  const runSearch = useCallback(
    (
      page = 1,
      options?: { force?: boolean; filters?: DashboardFiltersState },
    ) => {
      const safePage = Math.max(1, page);
      setResultsPage(safePage);
      return search(
        {
          q: searchText,
          priceMin: dashboard.priceMin,
          priceMax: dashboard.priceMax,
          filters: options?.filters ?? dashboard.dashboardFilters,
          limit: pageSize,
          offset: (safePage - 1) * pageSize,
        },
        options,
      );
    },
    [
      search,
      searchText,
      dashboard.priceMin,
      dashboard.priceMax,
      dashboard.dashboardFilters,
      pageSize,
    ],
  );

  const handleFiltersChange = useCallback(
    (next: DashboardFiltersState) => {
      dashboard.handleDashboardFiltersChange(
        isEmbedded ? withoutEmbedWidgetFilters(next) : next,
      );
    },
    [isEmbedded, dashboard.handleDashboardFiltersChange],
  );

  const handlePriceMinChange = useCallback(
    (value: number) => {
      dashboard.handlePriceMinChange(value);
    },
    [dashboard.handlePriceMinChange],
  );

  const handlePriceMaxChange = useCallback(
    (value: number) => {
      dashboard.handlePriceMaxChange(value);
    },
    [dashboard.handlePriceMaxChange],
  );

  const handleSearchTextChange = useCallback((value: string) => {
    setSearchText(value);
  }, []);

  const sendSearchCotizacionNotify = useCallback(async () => {
    if (!notifyEmail.trim() || searchNotifySentRef.current) return;
    if (dashboard.beneficiarySummary.contributor.age === null) return;

    searchNotifySentRef.current = true;

    try {
      await notifyCotizacionByEmail({
        email: notifyEmail,
        criteria,
        beneficiarySummary: dashboard.beneficiarySummary,
        filters: dashboard.dashboardFilters,
        searchText,
        sortKey,
        currency,
        deepLink,
        partnerEntitySlug: entity?.slug ?? deepLink.entidad ?? null,
        partnerEntityName: entity?.name ?? null,
        partnerEntityTheme: entity?.theme ?? null,
        partnerEntityLogoUrl: entity?.logoUrl ?? null,
        convenioEmpresa: toCotizacionNotifyConvenio(validatedAgreement),
      });
    } catch (error) {
      searchNotifySentRef.current = false;
      console.error("No se pudo enviar la notificación de cotización:", error);
    }
  }, [
    notifyEmail,
    criteria,
    dashboard.beneficiarySummary,
    dashboard.dashboardFilters,
    searchText,
    sortKey,
    currency,
    deepLink,
    entity?.slug,
    entity?.name,
    entity?.theme,
    entity?.logoUrl,
    validatedAgreement,
  ]);

  useEffect(() => {
    if (!formReady || boundsLoading || initialSearchDoneRef.current) {
      return;
    }

    const priceMin =
      deepLink.priceMin ??
      (bounds.totalPlans > 0 ? Math.floor(bounds.priceMin * 10) / 10 : 0);
    const priceMax =
      deepLink.priceMax ??
      (bounds.totalPlans > 0 ? Math.ceil(bounds.priceMax * 10) / 10 : 20);

    dashboard.setPriceMin(priceMin);
    dashboard.setPriceMax(priceMax);
    initialSearchDoneRef.current = true;
    skipDebouncedSearchRef.current = true;
    setResultsPage(1);

    if (!deepLink.shouldAutoSearch) return;

    const filters = deepLink.hasDeepLinkParams
      ? deepLink.hasExplicitZoneParams
        ? deepLink.filters
        : applyRegionToDashboardFilters(
            deepLink.filters,
            deepLink.criteria.region,
          )
      : applyRegionToDashboardFilters(
          dashboard.dashboardFilters,
          criteria.region,
        );

    void search(
      {
        q: deepLink.q ?? deepLink.planCode,
        priceMin,
        priceMax,
        filters,
        limit: pageSize,
        offset: 0,
      },
      { force: true },
    ).then(() => {
      void sendSearchCotizacionNotify();
      if (deepLink.hasDeepLinkParams) {
        scrollElementIntoAppShell(resultsRef.current, {
          behavior: "smooth",
          block: "start",
        });
      }
    });
  }, [
    formReady,
    boundsLoading,
    bounds.totalPlans,
    bounds.priceMin,
    bounds.priceMax,
    dashboard.dashboardFilters,
    dashboard.setPriceMin,
    dashboard.setPriceMax,
    deepLink.filters,
    deepLink.hasDeepLinkParams,
    deepLink.planCode,
    deepLink.priceMax,
    deepLink.priceMin,
    deepLink.q,
    deepLink.shouldAutoSearch,
    pageSize,
    search,
    sendSearchCotizacionNotify,
  ]);

  useEffect(() => {
    if (!hasSearched || skipDebouncedSearchRef.current) {
      skipDebouncedSearchRef.current = false;
      return;
    }

    setResultsPage(1);
    const timer = window.setTimeout(() => {
      resetSearchCache();
      void search(
        {
          q: searchText,
          priceMin: dashboard.priceMin,
          priceMax: dashboard.priceMax,
          filters: dashboard.dashboardFilters,
          limit: pageSize,
          offset: 0,
        },
        { force: true },
      );
    }, FILTER_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [
    hasSearched,
    search,
    resetSearchCache,
    dashboard.dashboardFilters,
    dashboard.priceMin,
    dashboard.priceMax,
    searchText,
    pageSize,
  ]);

  const sortedPlans = useMemo(() => {
    return sortHealthPlanSummariesByFinalPriceAsc(
      plans,
      dashboard.beneficiarySummary,
      dashboard.ufToClp,
      validatedAgreement,
    );
  }, [plans, dashboard.beneficiarySummary, dashboard.ufToClp, validatedAgreement]);

  const defaultPriceBounds = useMemo(
    () => ({
      min:
        bounds.totalPlans > 0 ? Math.floor(bounds.priceMin * 10) / 10 : 2,
      max:
        bounds.totalPlans > 0 ? Math.ceil(bounds.priceMax * 10) / 10 : 8,
    }),
    [bounds.priceMin, bounds.priceMax, bounds.totalPlans],
  );

  useEffect(() => {
    if (!solicitarFlowActive || !deepLink.planCode) return;

    const planInResults = plans.find(
      (plan) => plan.unique_code === deepLink.planCode,
    );

    if (!planInResults) return;

    setContractModalTab(deepLink.modalTab ?? "request");
    setContractPlan(planInResults);
    setRecoveryNotice(null);
  }, [solicitarFlowActive, deepLink.planCode, deepLink.modalTab, plans]);

  useEffect(() => {
    if (!formReady || !solicitarFlowActive || !deepLink.planCode) {
      return;
    }

    const planCode = deepLink.planCode;
    const modalTab = deepLink.modalTab ?? "request";

    if (contractPlan?.unique_code === planCode) {
      return;
    }

    if (solicitarFetchStartedRef.current === planCode) {
      return;
    }

    solicitarFetchStartedRef.current = planCode;
    setContractModalTab(modalTab);

    const controller = new AbortController();
    const fetchTimeout = window.setTimeout(() => controller.abort(), 10_000);

    async function loadPlanForSolicitar() {
      try {
        const response = await fetch(
          `/api/plans/${encodeURIComponent(planCode)}`,
          { signal: controller.signal },
        );
        if (!response.ok) return;

        const plan = (await response.json()) as HealthPlan;
        primePlanDetailCache(plan);
        setContractPlan(mapHealthPlanToSummary(plan));
        setRecoveryNotice(null);
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        ) {
          return;
        }
        console.error("No se pudo abrir el plan desde deep link:", loadError);
      } finally {
        window.clearTimeout(fetchTimeout);
      }
    }

    void loadPlanForSolicitar();

    return () => {
      controller.abort();
      window.clearTimeout(fetchTimeout);
    };
  }, [
    formReady,
    solicitarFlowActive,
    deepLink.planCode,
    deepLink.modalTab,
    contractPlan?.unique_code,
  ]);

  useEffect(() => {
    if (
      !formReady ||
      !solicitarFlowActive ||
      !deepLink.hasSolicitarDeepLink ||
      solicitarRecoveryDoneRef.current
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (contractPlan !== null) return;

      solicitarRecoveryDoneRef.current = true;
      setSolicitarFlowActive(false);
      stripSolicitarParamsFromBrowserUrl(deepLink.planCode);
      setSearchText("");
      setRecoveryNotice(SOLICITAR_RECOVERY_NOTICE);

      if (!hasSearched || loading) {
        skipDebouncedSearchRef.current = true;
        void search(
          {
            priceMin: dashboard.priceMin,
            priceMax: dashboard.priceMax,
            filters: dashboard.dashboardFilters,
            limit: pageSize,
            offset: 0,
          },
          { force: true },
        );
      }

      scrollElementIntoAppShell(resultsRef.current, {
        behavior: "smooth",
        block: "start",
      });
    }, SOLICITAR_DEEP_LINK_RECOVERY_MS);

    return () => window.clearTimeout(timer);
  }, [
    formReady,
    solicitarFlowActive,
    deepLink.hasSolicitarDeepLink,
    deepLink.planCode,
    contractPlan,
    hasSearched,
    loading,
    search,
    dashboard.priceMin,
    dashboard.priceMax,
    dashboard.dashboardFilters,
    pageSize,
  ]);

  const willAutoSearch =
    deepLink.shouldAutoSearch || bootstrappedExitSearch;

  const showResultsLoading =
    !error &&
    sortedPlans.length === 0 &&
    (loading ||
      (!hasSearched &&
        willAutoSearch &&
        (boundsLoading || loading || !isEmbedded)));

  const hasMoreEmbedResults = isEmbedded && total > plans.length;
  const showInlineLoading = loading && hasSearched && plans.length > 0;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageSafe = Math.min(resultsPage, totalPages);
  const rangeStart = total === 0 ? 0 : (pageSafe - 1) * pageSize + 1;
  const rangeEnd =
    total === 0 ? 0 : Math.min((pageSafe - 1) * pageSize + plans.length, total);
  const resultsRangeLabel =
    total === 0
      ? "0 resultados"
      : `Mostrando ${rangeStart.toLocaleString("es-CL")}–${rangeEnd.toLocaleString("es-CL")} de ${total.toLocaleString("es-CL")}`;

  function goToResultsPage(nextPage: number) {
    const clamped = Math.min(Math.max(1, nextPage), totalPages);
    if (clamped === pageSafe && !loading) return;
    skipDebouncedSearchRef.current = true;
    setResultsPage(clamped);
    void search(
      {
        q: searchText,
        priceMin: dashboard.priceMin,
        priceMax: dashboard.priceMax,
        filters: dashboard.dashboardFilters,
        limit: pageSize,
        offset: (clamped - 1) * pageSize,
      },
      { force: true },
    ).then(() => {
      scrollElementIntoAppShell(resultsRef.current, {
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function handleResetAll() {
    const defaultCriteria = createDefaultQuoteCriteria();
    setCriteria(defaultCriteria);
    const emptyBeneficiaries = {
      contributors: [] as { id: string; age: number | null }[],
      dependents: [] as { id: string; age: number | null }[],
    };
    dashboard.handleBeneficiariesChange(
      emptyBeneficiaries,
      buildBeneficiaryGroupSummary(emptyBeneficiaries),
    );
    dashboard.setDashboardFilters(
      applyRegionToDashboardFilters(
        createDefaultDashboardFilters(),
        defaultCriteria.region,
      ),
    );
    const defaultPriceMin =
      bounds.totalPlans > 0 ? Math.floor(bounds.priceMin * 10) / 10 : 2;
    const defaultPriceMax =
      bounds.totalPlans > 0 ? Math.ceil(bounds.priceMax * 10) / 10 : 8;
    dashboard.setPriceMin(defaultPriceMin);
    dashboard.setPriceMax(defaultPriceMax);
    setSearchText("");
    setCurrency("clp");
    setResultsPage(1);
    setContractPlan(null);
    setContractModalTab(undefined);
    setSolicitarFlowActive(false);
    setRecoveryNotice(null);
    initialSearchDoneRef.current = false;
    searchNotifySentRef.current = false;
    skipDebouncedSearchRef.current = true;
    resetSearch();
  }

  const buildEmbedExitInput = useCallback(
    () => ({
      baseUrl: resolveAppBaseUrl(),
      entidad: entity?.embedKey ?? entity?.slug ?? deepLink.entidad ?? "cotizaloantes",
      criteria,
      beneficiarySummary: dashboard.beneficiarySummary,
      beneficiaries: dashboard.beneficiaries,
      dashboardFilters: dashboard.dashboardFilters,
      priceMin: dashboard.priceMin,
      priceMax: dashboard.priceMax,
      searchText,
      sortKey,
      currency,
      email: notifyEmail.trim() || deepLink.email,
    }),
    [
      entity?.embedKey,
      entity?.slug,
      deepLink.entidad,
      deepLink.email,
      criteria,
      dashboard.beneficiarySummary,
      dashboard.beneficiaries,
      dashboard.dashboardFilters,
      dashboard.priceMin,
      dashboard.priceMax,
      searchText,
      sortKey,
      currency,
      notifyEmail,
    ],
  );

  function redirectEmbedToFullCotizador() {
    const validationError = validateEmbedQuoteCriteria({
      criteria,
      beneficiarySummary: dashboard.beneficiarySummary,
      beneficiaries: dashboard.beneficiaries,
    });

    if (validationError) {
      showEmbedValidationNotice(validationError);
      return;
    }

    const exitUrl = buildEmbedSearchExitUrl(buildEmbedExitInput());
    setEmbedExitLoading(true);
    markEmbedExitSearchPending();
    postEmbedExitNavigate();
    navigateTopLevel(exitUrl, 420);
  }

  const handleCriteriaChange = useCallback(
    (patch: Partial<QuoteCriteria>) => {
      setCriteria((current) => {
        const next = { ...current, ...patch };

        if (patch.region !== undefined) {
          dashboard.setDashboardFilters((currentFilters) => {
            const baseFilters = isEmbedded
              ? withoutEmbedWidgetFilters(currentFilters)
              : currentFilters;
            return applyRegionToDashboardFilters(baseFilters, patch.region);
          });
        }

        return next;
      });
    },
    [dashboard.setDashboardFilters, isEmbedded],
  );

  function handleCalculate() {
    if (isEmbedded) {
      redirectEmbedToFullCotizador();
      return;
    }

    setResultsPage(1);
    skipDebouncedSearchRef.current = true;
    void search(
      {
        q: searchText,
        priceMin: dashboard.priceMin,
        priceMax: dashboard.priceMax,
        filters: dashboard.dashboardFilters,
        limit: pageSize,
        offset: 0,
      },
      { force: true },
    ).then(() => {
      void sendSearchCotizacionNotify();
    });
    scrollElementIntoAppShell(resultsRef.current, {
      behavior: "smooth",
      block: "start",
    });
  }

  function handleEmbedSolicitar(plan: HealthPlanSummary) {
    const validationError = validateEmbedSolicitarCriteria({
      criteria,
      beneficiarySummary: dashboard.beneficiarySummary,
      beneficiaries: dashboard.beneficiaries,
    });

    if (validationError) {
      showEmbedValidationNotice(validationError);
      return;
    }

    setContractModalTab("request");
    setContractPlan(plan);
  }

  function handleEmbedViewAllPlans() {
    redirectEmbedToFullCotizador();
  }

  const brandKey = isBranded ? entity!.brandKey : undefined;

  const shellRoot = isEmbedded
    ? "relative flex h-auto max-h-fit w-full max-w-none flex-col overflow-visible"
    : appShellRoot;
  const shellScroll = isEmbedded
    ? "w-full max-w-none overflow-visible"
    : appShellScroll;
  const contentShell = isEmbedded
    ? "w-full max-w-none space-y-3 max-md:space-y-2"
    : joinClasses(publicCotizadorShell, safeWidth, "space-y-5");

  return (
    <div
      ref={rootRef}
      data-brand={brandKey}
      data-partner={isBranded ? entity!.slug : undefined}
      data-embed={isEmbedded ? "true" : undefined}
      style={isBranded ? themeStyle : undefined}
      className={joinClasses(shellRoot, ui.canvas)}
    >
      {isEmbedded ? null : <PublicCotizadorHeader />}

      <main
        aria-label={isEmbedded ? "Cotizador embebido" : "Cotizador de planes Isapre"}
        className={joinClasses(
          shellScroll,
          isEmbedded ? "w-full max-w-none" : safeWidth,
          isEmbedded
            ? "px-2 py-2 sm:px-3 sm:py-2 max-md:px-1.5 max-md:py-1"
            : "px-3 py-5 pb-24 sm:px-4 sm:py-6 sm:pb-24 lg:px-6 lg:pb-6",
        )}
      >
        <div className={contentShell}>
          {isEmbedded ? null : (
            <header
              className={joinClasses(
                safeWidth,
                "motion-safe-fade-in flex flex-col gap-5 sm:gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8",
              )}
            >
              <div className="min-w-0 max-w-2xl space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                  Cotizador en línea
                </p>
                <h1 className="text-2xl font-bold tracking-tight text-primary-dark sm:text-3xl lg:text-[2.05rem] lg:leading-tight">
                  Encuentra tu plan de salud{" "}
                  <span className="text-primary">ideal</span>
                </h1>
                <p className="max-w-xl text-sm leading-relaxed text-muted sm:text-[15px]">
                  Compara coberturas, precios y beneficios en un solo lugar.
                </p>
              </div>

              <ul
                className="flex w-full shrink-0 flex-col gap-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:divide-x sm:divide-border sm:gap-0 lg:w-auto lg:max-w-none lg:flex-nowrap lg:justify-end"
                aria-label="Beneficios del cotizador"
              >
                {(
                  [
                    {
                      title: "Sin costo",
                      subtitle: "100% gratuito",
                      icon: (
                        <>
                          <circle
                            cx="12"
                            cy="12"
                            r="8.25"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M12 7.25v9.5M14.35 9.1c-.55-.7-1.35-1.1-2.25-1.1-1.55 0-2.6.95-2.6 2.2 0 1.2.9 1.85 2.55 2.25 1.7.4 2.65 1.1 2.65 2.45 0 1.4-1.2 2.4-2.75 2.4-1.05 0-1.95-.45-2.5-1.25"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </>
                      ),
                    },
                    {
                      title: "En 2 minutos",
                      subtitle: "Cotiza y compara",
                      icon: (
                        <>
                          <circle
                            cx="12"
                            cy="12"
                            r="8.25"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M12 8v4.25l3 1.85"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </>
                      ),
                    },
                    {
                      title: "Hasta 10%",
                      subtitle: "Descuento por convenio",
                      icon: (
                        <>
                          <path
                            d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="m15 9-6 6"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle cx="9" cy="9" r="1.15" fill="currentColor" />
                          <circle cx="15" cy="15" r="1.15" fill="currentColor" />
                        </>
                      ),
                    },
                  ] as const
                ).map((item) => (
                  <li
                    key={item.title}
                    className="flex min-w-0 items-center gap-3 sm:px-5 lg:px-6 first:sm:pl-0 last:sm:pr-0"
                  >
                    <span className="inline-flex size-10 shrink-0 items-center justify-center text-primary">
                      <svg
                        viewBox="0 0 24 24"
                        className="size-9"
                        fill="none"
                        aria-hidden
                      >
                        {item.icon}
                      </svg>
                    </span>
                    <span className="min-w-0 leading-tight">
                      <span className="block text-[15px] font-bold text-primary-dark">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted sm:text-[13px]">
                        {item.subtitle}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </header>
          )}

          <div ref={criteriaBarRef}>
            <PublicQuoteCriteriaBar
              criteria={criteria}
              onCriteriaChange={handleCriteriaChange}
              beneficiaries={dashboard.beneficiaries}
              onBeneficiariesChange={dashboard.handleBeneficiariesChange}
              onCalculate={handleCalculate}
              onResetAll={handleResetAll}
              compactEmbed={isEmbedded}
              showPreloadedDependents={
                deepLink.hasDeepLinkParams &&
                dashboard.beneficiaries.dependents.length > 0
              }
              partnerEntitySlug={entity?.slug}
            />
          </div>

          <section
            id="resultados"
            ref={resultsRef}
            className={joinClasses(
              isEmbedded ? "scroll-mt-4" : "scroll-mt-24",
              isEmbedded ? "space-y-4 max-md:space-y-2" : "space-y-4",
            )}
          >
            {hasSearched ? (
              <div
                className={joinClasses(
                  safeWidth,
                  isEmbedded &&
                    "max-md:rounded-xl max-md:bg-white max-md:p-2.5 max-md:shadow-sm max-md:ring-1 max-md:ring-border/70",
                )}
              >
                <PublicResultsToolbar
                  displayedCount={sortedPlans.length}
                  totalCount={total}
                  rangeLabel={resultsRangeLabel}
                  currency={currency}
                  onCurrencyChange={setCurrency}
                  searchText={searchText}
                  onSearchTextChange={handleSearchTextChange}
                  compactEmbed={isEmbedded}
                  pagination={
                    isEmbedded
                      ? null
                      : {
                          page: pageSafe,
                          totalPages,
                          onPageChange: goToResultsPage,
                        }
                  }
                />
              </div>
            ) : null}

            <div
              data-embed-results-row={isEmbedded ? "true" : undefined}
              className={joinClasses(
                isEmbedded ? "w-full min-w-0" : safeWidth,
                isEmbedded
                  ? "flex min-w-0 gap-2 lg:gap-3 max-md:gap-0"
                  : "flex min-h-0 items-start gap-0 lg:gap-5",
              )}
            >
              {hasSearched ? (
                <PublicFiltersSidebar
                  open={dashboard.sidebarOpen}
                  onClose={() => dashboard.setSidebarOpen(false)}
                  priceMin={dashboard.priceMin}
                  priceMax={dashboard.priceMax}
                  ufToClp={dashboard.ufToClp}
                  onPriceMinChange={handlePriceMinChange}
                  onPriceMaxChange={handlePriceMaxChange}
                  filters={dashboard.dashboardFilters}
                  onFiltersChange={handleFiltersChange}
                  hideCoverageFilter={isEmbedded}
                  hidePlanTypeFilter={isEmbedded}
                  showClinicFilter={!isEmbedded}
                  compactEmbed={isEmbedded}
                  defaultPriceMin={defaultPriceBounds.min}
                  defaultPriceMax={defaultPriceBounds.max}
                />
              ) : null}

              <div className="min-w-0 flex-1">
                {showResultsLoading ? (
                  <PublicPlanResultsLoading
                    message={
                      isEmbedded
                        ? "Cargando planes para tu perfil…"
                        : EMBED_EXIT_LOADING_TITLE
                    }
                    compact={isEmbedded}
                    count={
                      isEmbedded ? EMBED_WIDGET_PLANS_LIMIT : undefined
                    }
                  />
                ) : !hasSearched && !willAutoSearch ? (
                  <div
                    className={joinClasses(
                      "rounded-2xl border border-dashed bg-white px-6 py-16 text-center",
                      ui.border,
                    )}
                  >
                    <p className="font-medium text-foreground">
                      Completa tus datos y pulsa «Buscar mejor plan»
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Te mostraremos opciones según tu perfil.
                    </p>
                  </div>
                ) : error ? (
                  <div
                    className={joinClasses(
                      "rounded-2xl border border-dashed bg-white px-6 py-16 text-center",
                      ui.border,
                    )}
                  >
                    <p className="font-medium">{error}</p>
                    <button
                      type="button"
                      onClick={() => void runSearch(1, { force: true })}
                      className={joinClasses(
                        "mt-4 text-sm font-semibold",
                        ui.link,
                      )}
                    >
                      Reintentar búsqueda
                    </button>
                  </div>
                ) : sortedPlans.length > 0 ? (
                  <>
                    <PublicPlanResultsList
                      plans={sortedPlans}
                      beneficiarySummary={dashboard.beneficiarySummary}
                      ufToClp={dashboard.ufToClp}
                      currency={currency}
                      highlightHospitalClinicIds={getActiveHospitalClinicIds(
                        dashboard.dashboardFilters,
                      )}
                      highlightAmbulatoryClinicIds={getActiveAmbulatoryClinicIds(
                        dashboard.dashboardFilters,
                      )}
                      onRequestPlan={(plan) => {
                        if (isEmbedded) {
                          handleEmbedSolicitar(plan);
                          return;
                        }
                        setContractModalTab(undefined);
                        setContractPlan(plan);
                      }}
                    />
                    {showInlineLoading ? (
                      <div className="mt-4">
                        <PublicPlanResultsLoadingInline />
                      </div>
                    ) : null}
                    {hasMoreEmbedResults && !showInlineLoading ? (
                      <div className="mt-6 flex justify-center">
                        <button
                          type="button"
                          onClick={handleEmbedViewAllPlans}
                          className={joinClasses(
                            touchTarget,
                            "rounded-md border px-8 text-sm font-semibold text-primary-dark transition hover:border-primary/40 hover:bg-primary/5",
                            ui.border,
                          )}
                        >
                          {`Ver todos los planes (${total})`}
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : hasSearched ? (
                  <div
                    className={joinClasses(
                      "rounded-2xl border border-dashed bg-white px-6 py-16 text-center",
                      ui.border,
                    )}
                  >
                    <p className="font-medium text-foreground">
                      Sin resultados para los filtros actuales
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Ajusta el rango de precio o los filtros laterales.
                    </p>
                    <button
                      type="button"
                      onClick={() => dashboard.setSidebarOpen(true)}
                      className={joinClasses(
                        "mt-4 text-sm font-semibold",
                        ui.link,
                      )}
                    >
                      Abrir filtros
                    </button>
                  </div>
                ) : null}

                {hasSearched &&
                !dashboard.sidebarOpen &&
                dashboard.isLargeScreen ? (
                  <button
                    type="button"
                    onClick={() => dashboard.setSidebarOpen(true)}
                    className={joinClasses(
                      touchTarget,
                      "mt-4 text-sm font-semibold",
                      ui.link,
                    )}
                  >
                    Mostrar filtros
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </main>

      <FiltersFab
        visible={
          hasSearched && !dashboard.sidebarOpen && !dashboard.isLargeScreen
        }
        onClick={() => dashboard.setSidebarOpen(true)}
        compactEmbed={isEmbedded}
      />

      <PublicCotizadorNotice
        message={recoveryNotice}
        noticeKey={recoveryNoticeKey}
        onDismiss={() => setRecoveryNotice(null)}
        prominent={isEmbedded}
        embedded={isEmbedded}
        title="Completa los datos del cotizador"
      />

      {embedExitLoading ? (
        <EmbedExitLoadingOverlay embedded={isEmbedded} />
      ) : null}

      <ContractPlanModal
        open={contractPlan !== null}
        embedded={isEmbedded}
        planSummary={contractPlan}
        beneficiarySummary={dashboard.beneficiarySummary}
        dependents={dashboard.beneficiaries.dependents}
        ufToClp={dashboard.ufToClp}
        criteria={criteria}
        filters={dashboard.dashboardFilters}
        searchText={searchText}
        sortKey={sortKey}
        currency={currency}
        deepLink={deepLink}
        initialTab={contractModalTab}
        onClose={() => {
          setContractPlan(null);
          setContractModalTab(undefined);
        }}
      />

      {isEmbedded ? (
        <div
          data-embed-height-sentinel
          aria-hidden
          className="pointer-events-none block h-px w-full shrink-0"
        />
      ) : null}
    </div>
  );
}
