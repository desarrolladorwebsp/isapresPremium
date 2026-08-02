import type { HealthPlanCatalogItem } from "@/types/plan";

const CATALOG_CACHE_KEY = "cotizador:plan-catalog:v4";
const CATALOG_CACHE_TTL_MS = 30 * 60 * 1000;

interface CachedPlanCatalog {
  plans: HealthPlanCatalogItem[];
  cachedAt: number;
}

let memoryCatalog: HealthPlanCatalogItem[] | null = null;
let memoryCatalogInflight: Promise<HealthPlanCatalogItem[]> | null = null;

export function readSessionPlanCatalog(): HealthPlanCatalogItem[] | null {
  if (typeof sessionStorage === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedPlanCatalog;
    if (Date.now() - parsed.cachedAt > CATALOG_CACHE_TTL_MS) {
      sessionStorage.removeItem(CATALOG_CACHE_KEY);
      return null;
    }

    return parsed.plans;
  } catch {
    return null;
  }
}

export function writeSessionPlanCatalog(plans: HealthPlanCatalogItem[]): void {
  if (typeof sessionStorage === "undefined") return;

  try {
    const payload: CachedPlanCatalog = {
      plans,
      cachedAt: Date.now(),
    };
    sessionStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignora cuota llena o modo privado estricto.
  }
}

export function getMemoryPlanCatalog(): HealthPlanCatalogItem[] | null {
  return memoryCatalog;
}

export function setMemoryPlanCatalog(plans: HealthPlanCatalogItem[]): void {
  memoryCatalog = plans;
}

export function getMemoryPlanCatalogInflight(): Promise<
  HealthPlanCatalogItem[]
> | null {
  return memoryCatalogInflight;
}

export function setMemoryPlanCatalogInflight(
  promise: Promise<HealthPlanCatalogItem[]> | null,
): void {
  memoryCatalogInflight = promise;
}

export function clearMemoryPlanCatalog(): void {
  memoryCatalog = null;
  memoryCatalogInflight = null;
}
