"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSentQuotations } from "@/lib/api/admin-client";
import { executiveKeys } from "@/lib/query/executive-keys";

/** Cotizaciones comerciales ya enviadas. La comparten Inicio y Reportes. */
export function useSentQuotationsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: executiveKeys.sentQuotations(),
    queryFn: fetchSentQuotations,
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
}
