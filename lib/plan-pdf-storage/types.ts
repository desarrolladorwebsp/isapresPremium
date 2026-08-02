export interface PlanPdfUploadResult {
  /** URL que usa el cotizador para descargar (downloadUrl en Blob, API en local). */
  url: string;
  /** URL pública del blob (solo backend Blob). */
  blobUrl?: string;
  storagePath: string;
  bytes: number;
  uploadedAt: string;
  backend: "local" | "blob" | "cpanel";
}

export interface UploadPlanPdfInput {
  fileBuffer: Buffer;
  isapre: string;
  uniqueCode: string;
  mimeType: string;
  /** Zona/región opcional para organizar el blob: {isapre}/{zona}/{codigo}.pdf */
  zona?: string | null;
  previousStoragePath?: string | null;
}

/** Parámetros del cliente admin (FormData → POST /api/plans/pdf). */
export interface UploadPlanPdfRequest {
  uniqueCode: string;
  isapre: string;
  previousStoragePath?: string | null;
}
