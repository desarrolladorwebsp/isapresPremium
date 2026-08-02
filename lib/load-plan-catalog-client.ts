import {
  getMemoryPlanCatalog,
  getMemoryPlanCatalogInflight,
  readSessionPlanCatalog,
  setMemoryPlanCatalog,
  setMemoryPlanCatalogInflight,
  writeSessionPlanCatalog,
} from "@/lib/plan-catalog-client-cache";
import { EMBED_WIDGET_PLANS_LIMIT } from "@/lib/plan-search-config";
import type { HealthPlanCatalogItem, PlanSearchResult } from "@/types/plan";

export interface LoadPlanCatalogOptions {
  /** Ruta del catálogo completo. */
  endpoint?: string;
  credentials?: RequestCredentials;
}

const DEFAULT_PUBLIC_CATALOG_ENDPOINT = "/api/plans/catalog";

export async function loadPlanCatalogClient(
  options?: LoadPlanCatalogOptions,
): Promise<HealthPlanCatalogItem[]> {
  const cachedMemory = getMemoryPlanCatalog();
  if (cachedMemory) return cachedMemory;

  const cachedSession = readSessionPlanCatalog();
  if (cachedSession) {
    setMemoryPlanCatalog(cachedSession);
    return cachedSession;
  }

  const inflight = getMemoryPlanCatalogInflight();
  if (inflight) return inflight;

  const endpoint = options?.endpoint ?? DEFAULT_PUBLIC_CATALOG_ENDPOINT;
  const credentials = options?.credentials ?? "same-origin";

  const promise = fetch(endpoint, { credentials })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("No se pudo cargar el catálogo de planes.");
      }
      return (await response.json()) as HealthPlanCatalogItem[];
    })
    .then((plans) => {
      setMemoryPlanCatalog(plans);
      writeSessionPlanCatalog(plans);
      return plans;
    })
    .finally(() => {
      setMemoryPlanCatalogInflight(null);
    });

  setMemoryPlanCatalogInflight(promise);
  return promise;
}

export async function loadWidgetPreviewClient(): Promise<PlanSearchResult> {
  const response = await fetch(
    `/api/plans/widget-preview?limit=${EMBED_WIDGET_PLANS_LIMIT}`,
  );

  if (!response.ok) {
    throw new Error("No se pudo cargar la vista previa del widget.");
  }

  return (await response.json()) as PlanSearchResult;
}
