import { QueryClient } from "@tanstack/react-query";

/**
 * Defaults del panel ejecutivo:
 * - staleTime 60s: al cambiar de tab no se refetch si el dato sigue “fresco”.
 * - gcTime 15 min: al volver a una vista visitada, el caché suele seguir en memoria.
 * - refetchOnWindowFocus: false — evitamos refetch agresivo al cambiar de ventana;
 *   el botón “Actualizar” y las invalidaciones post-mutación son la fuente de verdad fresca.
 */
export function createExecutiveQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 15 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/** Singleton en el browser para compartir caché y poder limpiarlo al logout. */
export function getExecutiveQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    return createExecutiveQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = createExecutiveQueryClient();
  }
  return browserQueryClient;
}

/** Evita filtrar datos entre usuarios en la misma pestaña tras logout. */
export function clearExecutiveQueryCache(): void {
  browserQueryClient?.clear();
}
