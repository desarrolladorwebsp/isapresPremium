"use client";

import { useEffect, useState } from "react";
import type { HealthPlan } from "@/types/plan";

/** Catálogo completo con coberturas para el panel de ejecutivos (requiere sesión staff). */
export function usePlansCatalog() {
  const [plans, setPlans] = useState<HealthPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/plans", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Error al cargar planes.");
        }
        return (await response.json()) as HealthPlan[];
      })
      .then((data) => {
        if (!cancelled) {
          setPlans(data);
          setError(null);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setPlans([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Error al cargar planes.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { plans, loading, error };
}
