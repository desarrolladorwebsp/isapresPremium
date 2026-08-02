import path from "path";

/** Carpeta raíz en disco: storage/planes-pdf */
export const PLAN_PDF_STORAGE_FOLDER = "planes-pdf";

export const PLAN_PDF_MAX_BYTES = 15 * 1024 * 1024;

export const PLAN_PDF_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/x-pdf",
]);

export function getPlanPdfStorageRoot(): string {
  const configured = process.env.PLAN_PDF_STORAGE_DIR?.trim();
  if (configured) return path.resolve(configured);
  return path.join(process.cwd(), "storage", PLAN_PDF_STORAGE_FOLDER);
}
