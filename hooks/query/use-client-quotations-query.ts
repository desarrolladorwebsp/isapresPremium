"use client";

import { useQuery } from "@tanstack/react-query";
import { executiveKeys } from "@/lib/query/executive-keys";
import type { ClientBoardQuotation } from "@/lib/executive/client-board";
import type { ClientQuotationRecord } from "@/types/client-quotation";

export async function readQuotationResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error || "No se pudo completar la operación.");
  return payload as T;
}

export function useClientBoardQuotationsQuery(viewerId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: executiveKeys.clientBoardQuotations(viewerId),
    queryFn: async () => readQuotationResponse<ClientBoardQuotation[]>(await fetch(
      "/api/executive/clients/board-quotations",
      { cache: "no-store" },
    )),
    enabled: Boolean(viewerId) && enabled,
    staleTime: 30_000,
  });
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
