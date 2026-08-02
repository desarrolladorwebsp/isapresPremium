export type PlanPdfStorageBackend = "local" | "blob" | "cpanel";

export interface BlobClientConfig {
  token: string;
  storeId?: string;
}

/** Usa Vercel Blob, cPanel/FTP o disco local según env. */
export function resolvePlanPdfStorageBackend(): PlanPdfStorageBackend {
  const override = process.env.PLAN_PDF_STORAGE?.trim().toLowerCase();

  if (override === "local") return "local";
  if (override === "blob") return "blob";
  if (override === "cpanel") return "cpanel";

  if (process.env.CPANEL_FTP_HOST?.trim()) {
    return "cpanel";
  }

  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return "blob";
  }

  return "local";
}

export function useVercelBlobStorage(): boolean {
  return resolvePlanPdfStorageBackend() === "blob";
}

export function useCpanelStorage(): boolean {
  return resolvePlanPdfStorageBackend() === "cpanel";
}

export function getBlobClientConfig(): BlobClientConfig | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return null;

  const storeId = process.env.BLOB_STORE_ID?.trim();
  return storeId ? { token, storeId } : { token };
}

export function assertBlobConfigured(): BlobClientConfig {
  const config = getBlobClientConfig();
  if (!config) {
    throw new Error(
      "Vercel Blob no está configurado. Agrega BLOB_READ_WRITE_TOKEN (y opcionalmente BLOB_STORE_ID) en .env.local o en Vercel.",
    );
  }
  return config;
}
