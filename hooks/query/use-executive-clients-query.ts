"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchExecutiveClients } from "@/lib/api/admin-client";
import { executiveKeys } from "@/lib/query/executive-keys";

/** Lista de clientes del ejecutivo/admin. Compartida por Inicio y Clientes. */
export function useExecutiveClientsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: executiveKeys.clients(),
    queryFn: fetchExecutiveClients,
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
}
