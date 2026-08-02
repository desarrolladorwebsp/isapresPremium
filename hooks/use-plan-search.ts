"use client";

import { useCallback, useRef, useState } from "react";
import {
  buildPlanSearchRequestKey,
  buildPlanSearchUrl,
  type PlanSearchRequest,
} from "@/lib/plan-search-request";
import type { HealthPlanSummary, PlanSearchResult } from "@/types/plan";

export type { PlanSearchRequest };

export function usePlanSearch() {
  const [plans, setPlans] = useState<HealthPlanSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const requestIdRef = useRef(0);
  const lastSuccessKeyRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async (request: PlanSearchRequest, options?: { force?: boolean }) => {
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

      try {
        const response = await fetch(buildPlanSearchUrl(request), {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("No se pudieron buscar los planes.");
        }

        const data = (await response.json()) as PlanSearchResult;
        if (requestId !== requestIdRef.current) return;

        setPlans(data.plans);
        setTotal(data.total);
        setHasSearched(true);
        lastSuccessKeyRef.current = requestKey;
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
    [],
  );

  const resetSearchCache = useCallback(() => {
    lastSuccessKeyRef.current = null;
  }, []);

  const resetSearch = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    lastSuccessKeyRef.current = null;
    setPlans([]);
    setTotal(0);
    setLoading(false);
    setError(null);
    setHasSearched(false);
  }, []);

  return {
    plans,
    total,
    loading,
    error,
    hasSearched,
    search,
    resetSearchCache,
    resetSearch,
  };
}
