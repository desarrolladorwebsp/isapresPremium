"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyDashboardFilters,
  buildBeneficiaryGroupSummary,
  createDefaultDashboardFilters,
  createEmptyFamilyBeneficiaries,
  normalizeFamilyBeneficiaries,
} from "@/domain";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { useUfValue } from "@/hooks/use-uf-value";
import { sortHealthPlansByFinalPriceAsc } from "@/lib/plan-sort";
import type {
  BeneficiaryGroupSummary,
  FamilyBeneficiariesState,
} from "@/types/beneficiary";
import type { DashboardFiltersState } from "@/types/filters";
import type { HealthPlan } from "@/types/plan";

const INITIAL_BENEFICIARIES: FamilyBeneficiariesState =
  createEmptyFamilyBeneficiaries();

export interface CotizadorDashboardOptions {
  initialBeneficiaries?: FamilyBeneficiariesState;
  initialBeneficiarySummary?: BeneficiaryGroupSummary;
  initialDashboardFilters?: DashboardFiltersState;
  initialPriceMin?: number;
  initialPriceMax?: number;
}

export function useCotizadorDashboard(
  plansCatalog: HealthPlan[],
  options?: CotizadorDashboardOptions,
) {
  const seedBeneficiaries = normalizeFamilyBeneficiaries(
    options?.initialBeneficiaries ?? INITIAL_BENEFICIARIES,
  );
  const seedSummary =
    options?.initialBeneficiarySummary ??
    buildBeneficiaryGroupSummary(seedBeneficiaries);

  const { ufToClp, loading: ufLoading, lastUpdated: ufLastUpdated, isFallback: ufIsFallback } =
    useUfValue();
  const isLargeScreen = useIsLargeScreen();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarReady, setSidebarReady] = useState(false);
  const [search, setSearch] = useState("");
  const [priceMin, setPriceMin] = useState(options?.initialPriceMin ?? 3);
  const [priceMax, setPriceMax] = useState(options?.initialPriceMax ?? 5);
  const [beneficiaries, setBeneficiaries] =
    useState<FamilyBeneficiariesState>(seedBeneficiaries);
  const [beneficiarySummary, setBeneficiarySummary] =
    useState<BeneficiaryGroupSummary>(seedSummary);
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFiltersState>(
    () => options?.initialDashboardFilters ?? createDefaultDashboardFilters(),
  );

  useEffect(() => {
    setSidebarReady(true);
  }, []);

  /** Solo sincroniza al cruzar breakpoint; no pelea con “Ocultar” en desktop. */
  useEffect(() => {
    setSidebarOpen(isLargeScreen);
  }, [isLargeScreen]);

  const filteredPlans = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const plans = applyDashboardFilters(
      plansCatalog,
      dashboardFilters,
    ).filter((plan) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        plan.plan_name.toLowerCase().includes(normalizedSearch) ||
        plan.unique_code.toLowerCase().includes(normalizedSearch) ||
        plan.isapre.toLowerCase().includes(normalizedSearch);

      const matchesPrice =
        plan.base_price_uf >= priceMin && plan.base_price_uf <= priceMax;

      return matchesSearch && matchesPrice;
    });

    return sortHealthPlansByFinalPriceAsc(
      plans,
      beneficiarySummary,
      ufToClp,
    );
  }, [
    search,
    priceMin,
    priceMax,
    dashboardFilters,
    beneficiarySummary,
    plansCatalog,
    ufToClp,
  ]);

  const applyBeneficiaries = useCallback(
    (next: FamilyBeneficiariesState, summary: BeneficiaryGroupSummary) => {
      const normalized = normalizeFamilyBeneficiaries(next);
      setBeneficiaries(normalized);
      setBeneficiarySummary(summary ?? buildBeneficiaryGroupSummary(normalized));
    },
    [],
  );

  const handleDashboardFiltersChange = useCallback(
    (next: DashboardFiltersState) => {
      setDashboardFilters(next);
    },
    [],
  );

  const handlePriceMinChange = useCallback((value: number) => {
    setPriceMin((currentMin) => Math.min(value, priceMax));
  }, [priceMax]);

  const handlePriceMaxChange = useCallback((value: number) => {
    setPriceMax((currentMax) => Math.max(value, priceMin));
  }, [priceMin]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  return {
    isLargeScreen,
    sidebarOpen,
    setSidebarOpen,
    sidebarReady,
    search,
    setSearch,
    handleSearchChange,
    priceMin,
    setPriceMin,
    handlePriceMinChange,
    priceMax,
    setPriceMax,
    handlePriceMaxChange,
    beneficiaries,
    beneficiarySummary,
    dashboardFilters,
    setDashboardFilters,
    handleDashboardFiltersChange,
    filteredPlans,
    handleBeneficiariesChange: applyBeneficiaries,
    ufToClp,
    ufLoading,
    ufLastUpdated,
    ufIsFallback,
  };
}
