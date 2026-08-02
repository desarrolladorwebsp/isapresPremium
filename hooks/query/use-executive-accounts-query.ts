"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchExecutiveAccounts } from "@/lib/api/admin-client";
import { executiveKeys } from "@/lib/query/executive-keys";

/** Cuentas de ejecutivos activos (asignación admin). */
export function useExecutiveAccountsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: executiveKeys.executiveAccounts(),
    queryFn: fetchExecutiveAccounts,
    staleTime: 5 * 60_000,
    enabled: options?.enabled ?? true,
  });
}
