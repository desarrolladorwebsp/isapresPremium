"use client";

import { useEffect, useState } from "react";
import type { HealthPlan } from "@/types/plan";

const planDetailCache = new Map<string, HealthPlan>();
const planDetailInflight = new Map<string, Promise<HealthPlan>>();

async function fetchPlanDetail(uniqueCode: string): Promise<HealthPlan> {
  const cached = planDetailCache.get(uniqueCode);
  if (cached) return cached;

  const inflight = planDetailInflight.get(uniqueCode);
  if (inflight) return inflight;

  const promise = (async () => {
    const response = await fetch(
      `/api/plans/${encodeURIComponent(uniqueCode)}`,
    );
    if (!response.ok) {
      throw new Error("No se pudo cargar el detalle del plan.");
    }
    const data = (await response.json()) as HealthPlan;
    planDetailCache.set(uniqueCode, data);
    return data;
  })();

  planDetailInflight.set(uniqueCode, promise);

  try {
    return await promise;
  } finally {
    planDetailInflight.delete(uniqueCode);
  }
}

export function usePlanDetail(uniqueCode: string | null, enabled: boolean) {
  const [plan, setPlan] = useState<HealthPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !uniqueCode) {
      setPlan(null);
      setLoading(false);
      setError(null);
      return;
    }

    const cached = planDetailCache.get(uniqueCode);
    if (cached) {
      setPlan(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchPlanDetail(uniqueCode)
      .then((data) => {
        if (cancelled) return;
        setPlan(data);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setPlan(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Error al cargar el plan.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [uniqueCode, enabled]);

  return { plan, loading, error };
}

export function primePlanDetailCache(plan: HealthPlan) {
  planDetailCache.set(plan.unique_code, plan);
}

export function prefetchPlanDetail(uniqueCode: string) {
  if (planDetailCache.has(uniqueCode) || planDetailInflight.has(uniqueCode)) {
    return;
  }
  void fetchPlanDetail(uniqueCode).catch(() => undefined);
}
