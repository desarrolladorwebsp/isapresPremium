import path from "path";
import { getPlanPdfStorageRoot } from "@/lib/plan-pdf-storage/constants";
import { ApiError } from "@/lib/api/api-error";

export function sanitizeIsapreFolderName(isapre: string): string {
  const normalized = isapre
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized.length > 0 ? normalized : "sin-isapre";
}

/** Normaliza el nombre de una zona/carpeta. Ej: "PLANES REGION METROPOLITANA" → "region-metropolitana". */
export function sanitizeZonaFolderName(zona: string): string {
  const normalized = zona
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/^planes-/, "");

  return normalized;
}

export function sanitizePlanCodeFileName(uniqueCode: string): string {
  const normalized = uniqueCode
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const base = normalized.length > 0 ? normalized : "plan-sin-codigo";
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

/**
 * Clave relativa en storage, organizada por isapre y opcionalmente por zona.
 * Ej: consalud/13-sf1001-26.pdf  ·  consalud/region-metropolitana/13-sf1001-26.pdf
 */
export function buildPlanPdfStorageKey(
  isapre: string,
  uniqueCode: string,
  zona?: string | null,
): string {
  const parts = [sanitizeIsapreFolderName(isapre)];

  const zonaSlug = zona ? sanitizeZonaFolderName(zona) : "";
  if (zonaSlug) parts.push(zonaSlug);

  parts.push(sanitizePlanCodeFileName(uniqueCode));
  return parts.join("/");
}

/** Ruta relativa legacy sin extensión (migración desde Cloudinary). */
export function buildLegacyPlanPdfStorageKey(
  isapre: string,
  uniqueCode: string,
): string {
  const folder = sanitizeIsapreFolderName(isapre);
  const code = sanitizePlanCodeFileName(uniqueCode).replace(/\.pdf$/i, "");
  return `${folder}/${code}`;
}

export function normalizePlanPdfStorageKey(stored: string): string {
  const trimmed = stored.trim().replace(/\\/g, "/").replace(/^\/+/, "");

  if (trimmed.startsWith("cotizador/planes-pdf/")) {
    return trimmed.slice("cotizador/planes-pdf/".length);
  }

  if (trimmed.startsWith("planes-pdf/")) {
    return trimmed.slice("planes-pdf/".length);
  }

  return trimmed;
}

export function collectPlanPdfCleanupKeys(
  isapre: string,
  uniqueCode: string,
  previousStoragePath?: string | null,
): string[] {
  const keys = new Set<string>([
    buildPlanPdfStorageKey(isapre, uniqueCode),
    buildLegacyPlanPdfStorageKey(isapre, uniqueCode),
  ]);

  const previous = previousStoragePath?.trim();
  if (previous) {
    const normalized = normalizePlanPdfStorageKey(previous);
    keys.add(normalized);

    if (normalized.toLowerCase().endsWith(".pdf")) {
      keys.add(normalized.slice(0, -4));
    } else {
      keys.add(`${normalized}.pdf`);
    }
  }

  return Array.from(keys);
}

export function resolveStoredPlanPdfStorageKey(
  storagePath: string | null | undefined,
  isapre: string,
  uniqueCode: string,
): string | null {
  const stored = storagePath?.trim();
  if (stored) return normalizePlanPdfStorageKey(stored);

  if (isapre.trim() && uniqueCode.trim()) {
    return buildPlanPdfStorageKey(isapre, uniqueCode);
  }

  return null;
}

export function resolveAbsolutePdfPath(storageKey: string): string {
  const normalized = normalizePlanPdfStorageKey(storageKey);

  if (!normalized || normalized.includes("..")) {
    throw new ApiError("Ruta de PDF inválida.", 400);
  }

  const root = getPlanPdfStorageRoot();
  const absolute = path.resolve(root, normalized);

  if (!absolute.startsWith(root + path.sep) && absolute !== root) {
    throw new ApiError("Ruta de PDF inválida.", 400);
  }

  return absolute;
}

export function buildPlanPdfApiUrl(uniqueCode: string): string {
  return `/api/plans/${encodeURIComponent(uniqueCode.trim())}/pdf`;
}
