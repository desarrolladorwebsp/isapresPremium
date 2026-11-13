"use client";

import { useQuery } from "@tanstack/react-query";
import { executiveKeys } from "@/lib/query/executive-keys";
import type { ClientQuotationRecord } from "@/types/client-quotation";

export async function readQuotationResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error || "No se pudo completar la operación.");
  return payload as T;
}

export function useClientQuotationsQuery(clientId?: string | null) {
  return useQuery({
    queryKey: executiveKeys.clientQuotations(clientId ?? ""),
    queryFn: async () => readQuotationResponse<ClientQuotationRecord[]>(await fetch(
      `/api/executive/clients/${encodeURIComponent(clientId ?? "")}/quotations`,
      { cache: "no-store" },
    )),
    enabled: Boolean(clientId),
    staleTime: 30_000,
  });
}
