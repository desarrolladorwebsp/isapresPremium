"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchQuotes } from "@/lib/api/admin-client";
import { executiveKeys } from "@/lib/query/executive-keys";

export function useExecutiveQuotesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: executiveKeys.quotes(),
    queryFn: fetchQuotes,
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
    retry: false,
  });
}
