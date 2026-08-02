"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchClinics } from "@/lib/api/admin-client";
import { executiveKeys } from "@/lib/query/executive-keys";

export function useExecutiveClinicsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: executiveKeys.clinics(),
    queryFn: fetchClinics,
    staleTime: 5 * 60_000,
    enabled: options?.enabled ?? true,
  });
}
