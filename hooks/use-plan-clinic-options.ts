"use client";

import { useEffect, useState } from "react";
import type { PlanCatalogClinicOption } from "@/lib/api/plan-clinics";

export function usePlanClinicOptions(enabled = true) {
  const [options, setOptions] = useState<PlanCatalogClinicOption[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetch("/api/plans/clinics")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("No se pudieron cargar las clínicas.");
        }
        return (await response.json()) as PlanCatalogClinicOption[];
      })
      .then((clinics) => {
        if (cancelled) return;
        setOptions(clinics);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setOptions([]);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Error al cargar clínicas.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { options, loading, error };
}
