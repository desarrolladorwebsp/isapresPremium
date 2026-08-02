import type { QueryClient } from "@tanstack/react-query";
import type { QuoteRecord } from "@/types/quote";
import type { UserRecord } from "@/types/user";
import { executiveKeys } from "@/lib/query/executive-keys";

/** Actualiza o inserta un cliente en el caché de la lista. */
export function upsertExecutiveClientCache(
  queryClient: QueryClient,
  client: UserRecord,
): void {
  queryClient.setQueryData<UserRecord[]>(executiveKeys.clients(), (current) => {
    if (!current) return [client];
    const index = current.findIndex((row) => row.id === client.id);
    if (index === -1) return [client, ...current];
    const next = [...current];
    next[index] = client;
    return next;
  });
}

/** Quita un cliente del caché (p. ej. tras redirección fuera de la cartera). */
export function removeExecutiveClientCache(
  queryClient: QueryClient,
  clientId: string,
): void {
  queryClient.setQueryData<UserRecord[]>(executiveKeys.clients(), (current) =>
    current ? current.filter((row) => row.id !== clientId) : current,
  );
}

export function invalidateExecutiveClients(
  queryClient: QueryClient,
): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: executiveKeys.clients() });
}

/** Invalida todos los rangos de calendario en caché. */
export function invalidateExecutiveCalendar(
  queryClient: QueryClient,
): Promise<void> {
  return queryClient.invalidateQueries({
    queryKey: executiveKeys.calendarRoot(),
  });
}

export function invalidateExecutiveQuotes(
  queryClient: QueryClient,
): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: executiveKeys.quotes() });
}

export function upsertExecutiveQuoteCache(
  queryClient: QueryClient,
  quote: QuoteRecord,
): void {
  queryClient.setQueryData<QuoteRecord[]>(executiveKeys.quotes(), (current) => {
    if (!current) return [quote];
    const index = current.findIndex((row) => row.id === quote.id);
    if (index === -1) return [quote, ...current];
    const next = [...current];
    next[index] = quote;
    return next;
  });
}

/**
 * Tras mutaciones de pipeline / reagendar: actualiza cliente en memoria e invalida
 * calendario (y clientes en background para reconciliar con el servidor).
 */
export function syncClientMutationCache(
  queryClient: QueryClient,
  client: UserRecord,
  options?: { removeFromList?: boolean },
): void {
  if (options?.removeFromList) {
    removeExecutiveClientCache(queryClient, client.id);
  } else {
    upsertExecutiveClientCache(queryClient, client);
  }
  void invalidateExecutiveCalendar(queryClient);
  // Marca stale + refetch en background; la UI ya tiene el dato actualizado.
  void queryClient.invalidateQueries({
    queryKey: executiveKeys.clients(),
    refetchType: "active",
  });
}
