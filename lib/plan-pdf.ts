import {
  buildPlanPdfStorageKey,
  normalizePlanPdfStorageKey,
} from "@/lib/plan-pdf-storage/paths";

export { buildPlanPdfFileName, ensurePdfExtension } from "@/lib/pdf-filename";

/** Acepta camelCase (admin) o snake_case (HealthPlan / API). */
export interface PlanPdfLinkInput {
  pdfUrl?: string | null;
  pdfPublicId?: string | null;
  pdf_url?: string | null;
  pdf_public_id?: string | null;
  isapre?: string;
  uniqueCode?: string;
  unique_code?: string;
}

function normalizePlanPdfInput(input: PlanPdfLinkInput) {
  return {
    pdfUrl: (input.pdfUrl ?? input.pdf_url ?? null)?.trim() || null,
    pdfPublicId: (input.pdfPublicId ?? input.pdf_public_id ?? null)?.trim() || null,
    uniqueCode: (input.uniqueCode ?? input.unique_code ?? null)?.trim() || null,
    isapre: input.isapre?.trim() || null,
  };
}

export function resolvePlanPdfStoragePath(input: PlanPdfLinkInput): string | null {
  const { pdfPublicId, isapre, uniqueCode } = normalizePlanPdfInput(input);

  if (pdfPublicId) return normalizePlanPdfStorageKey(pdfPublicId);

  if (isapre && uniqueCode) {
    return buildPlanPdfStorageKey(isapre, uniqueCode);
  }

  return null;
}

/** Solo planes con referencia explícita en BD (no infiere por isapre/código). */
export function planHasPdf(input: PlanPdfLinkInput): boolean {
  const { pdfUrl, pdfPublicId } = normalizePlanPdfInput(input);
  return Boolean(pdfPublicId || pdfUrl);
}

/**
 * Enlace de descarga del PDF (siempre vía API, sin `inline`).
 * La API responde con attachment / redirect a getDownloadUrl de Blob.
 */
export function getPlanPdfDownloadUrl(input: PlanPdfLinkInput): string | null {
  const { pdfUrl, pdfPublicId, uniqueCode } = normalizePlanPdfInput(input);

  if (!pdfPublicId && !pdfUrl) return null;
  if (!uniqueCode) return null;

  return `/api/plans/${encodeURIComponent(uniqueCode)}/pdf`;
}

/**
 * URL same-origin para embeber el PDF en iframe (`?inline=1`).
 * La API streamea bytes con Content-Disposition: inline (sin redirect a Blob).
 */
export function getPlanPdfInlineUrl(input: PlanPdfLinkInput): string | null {
  const { pdfUrl, pdfPublicId, uniqueCode } = normalizePlanPdfInput(input);

  if (!pdfPublicId && !pdfUrl) return null;
  if (!uniqueCode) return null;

  return `/api/plans/${encodeURIComponent(uniqueCode)}/pdf?inline=1`;
}
