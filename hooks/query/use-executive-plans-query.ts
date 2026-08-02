"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPlans } from "@/lib/api/admin-client";
import { executiveKeys } from "@/lib/query/executive-keys";

export function useExecutivePlansQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: executiveKeys.plans(),
    queryFn: fetchPlans,
    staleTime: 5 * 60_000,
    enabled: options?.enabled ?? true,
  });
}
