"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { filterCatalogItems } from "@/lib/filter-catalog-items";
import {
  loadPlanCatalogClient,
  loadWidgetPreviewClient,
} from "@/lib/load-plan-catalog-client";
import {
  buildPlanSearchRequestKey,
  buildPlanSearchUrl,
  type PlanSearchRequest,
} from "@/lib/plan-search-request";
import type {
  HealthPlanCatalogItem,
  HealthPlanSummary,
  PlanSearchResult,
} from "@/types/plan";

export type { PlanSearchRequest };

export interface UseClientPlanSearchOptions {
  /** Widget embebido: carga preview ligera al montar. */
  embedPreviewOnMount?: boolean;
  /** Precarga catálogo completo en segundo plano. */
  preloadCatalog?: boolean;
}

export const FILTER_DEBOUNCE_MS = 120;

export function useClientPlanSearch(options?: UseClientPlanSearchOptions) {
  const embedPreviewOnMount = options?.embedPreviewOnMount ?? false;
  const preloadCatalog = options?.preloadCatalog ?? false;

  const [plans, setPlans] = useState<HealthPlanSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [catalogReady, setCatalogReady] = useState(false);

  const catalogRef = useRef<HealthPlanCatalogItem[] | null>(null);
  const requestIdRef = useRef(0);
  const lastSuccessKeyRef = useRef<string | null>(null);
  const lastRequestRef = useRef<PlanSearchRequest | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previewLoadedRef = useRef(false);

  const applySearchResult = useCallback(
    (
      result: PlanSearchResult,
      requestKey: string,
      options?: { append?: boolean },
    ) => {
      if (options?.append) {
        setPlans((current) => {
          const seen = new Set(current.map((plan) => plan.unique_code));
          const merged = [...current];
          for (const plan of result.plans) {
            if (seen.has(plan.unique_code)) continue;
            seen.add(plan.unique_code);
            merged.push(plan);
          }
          return merged;
        });
      } else {
        setPlans(result.plans);
      }
      setTotal(result.total);
      setHasSearched(true);
      setError(null);
      lastSuccessKeyRef.current = requestKey;
    },
    [],
  );

  const searchViaApi = useCallback(
    async (
      request: PlanSearchRequest,
      options?: { force?: boolean; append?: boolean },
    ) => {
      const requestKey = buildPlanSearchRequestKey(request);
      if (!options?.force && requestKey === lastSuccessKeyRef.current) {
        return;
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);
      lastRequestRef.current = request;

      try {
        const response = await fetch(buildPlanSearchUrl(request), {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("No se pudieron buscar los planes.");
        }

        const data = (await response.json()) as PlanSearchResult;
        if (requestId !== requestIdRef.current) return;

        applySearchResult(data, requestKey, { append: options?.append });
      } catch (searchError) {
        if (
          searchError instanceof DOMException &&
          searchError.name === "AbortError"
        ) {
          return;
        }
        if (requestId !== requestIdRef.current) return;
        setPlans([]);
        setTotal(0);
        setHasSearched(true);
        setError(
          searchError instanceof Error
            ? searchError.message
            : "Error al buscar planes.",
        );
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [applySearchResult],
  );

  const search = useCallback(
    async (
      request: PlanSearchRequest,
      options?: { force?: boolean; append?: boolean },
    ) => {
      const requestKey = buildPlanSearchRequestKey(request);
      if (!options?.force && requestKey === lastSuccessKeyRef.current) {
        return;
      }

      lastRequestRef.current = request;

      const catalog = catalogRef.current;
      if (catalog && !options?.append) {
        const result = filterCatalogItems(catalog, request);
        applySearchResult(result, requestKey, options);
        return;
      }

      await searchViaApi(request, options);
    },
    [applySearchResult, searchViaApi],
  );

  const resetSearchCache = useCallback(() => {
    lastSuccessKeyRef.current = null;
  }, []);

  const resetSearch = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    lastSuccessKeyRef.current = null;
    lastRequestRef.current = null;
    setPlans([]);
    setTotal(0);
    setLoading(false);
    setError(null);
    setHasSearched(false);
    previewLoadedRef.current = false;
  }, []);

  useEffect(() => {
    if (!preloadCatalog) return;

    let cancelled = false;

    void loadPlanCatalogClient()
      .then((catalog) => {
        if (cancelled) return;
        catalogRef.current = catalog;
        setCatalogReady(true);

        if (lastRequestRef.current) {
          const result = filterCatalogItems(catalog, lastRequestRef.current);
          applySearchResult(
            result,
            buildPlanSearchRequestKey(lastRequestRef.current),
          );
        }
      })
      .catch((loadError) => {
        if (cancelled) return;
        console.error("No se pudo precargar el catálogo de planes:", loadError);
      });

    return () => {
      cancelled = true;
    };
  }, [preloadCatalog, applySearchResult]);

  useEffect(() => {
    if (!embedPreviewOnMount || previewLoadedRef.current) return;

    let cancelled = false;
    previewLoadedRef.current = true;

    void (async () => {
      setLoading(true);
      try {
        const result = await loadWidgetPreviewClient();
        if (cancelled) return;
        lastRequestRef.current = { limit: result.limit };
        applySearchResult(
          result,
          buildPlanSearchRequestKey({ limit: result.limit }),
        );
      } catch (previewError) {
        if (cancelled) return;
        console.error("Vista previa del widget:", previewError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [embedPreviewOnMount, applySearchResult]);

  return {
    plans,
    total,
    loading,
    error,
    hasSearched,
    catalogReady,
    search,
    resetSearchCache,
    resetSearch,
  };
}
