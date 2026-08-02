import { del, getDownloadUrl, head, put } from "@vercel/blob";
import { ApiError } from "@/lib/api/api-error";
import { normalizePlanPdfStorageKey } from "@/lib/plan-pdf-storage/paths";
import {
  assertBlobConfigured,
  getBlobClientConfig,
} from "@/lib/plan-pdf-storage/provider";

function normalizeBlobPathname(storageKey: string): string {
  return normalizePlanPdfStorageKey(storageKey);
}

function blobCommandOptions() {
  return getBlobClientConfig() ?? undefined;
}

export function isVercelBlobUrl(url: string): boolean {
  const trimmed = url.trim();
  return (
    trimmed.includes(".blob.vercel-storage.com/") ||
    trimmed.includes("vercel-storage.com/")
  );
}

export async function blobPlanPdfExists(storageKey: string): Promise<boolean> {
  try {
    await head(normalizeBlobPathname(storageKey), blobCommandOptions());
    return true;
  } catch {
    return false;
  }
}

export async function resolveBlobPlanPdfDownloadUrl(
  storageKey: string,
): Promise<string | null> {
  try {
    const metadata = await head(
      normalizeBlobPathname(storageKey),
      blobCommandOptions(),
    );
    return getDownloadUrl(metadata.url);
  } catch {
    return null;
  }
}

/** URL de visualización (sin forzar descarga) para embeber en iframe. */
export async function resolveBlobPlanPdfViewUrl(
  storageKey: string,
): Promise<string | null> {
  try {
    const metadata = await head(
      normalizeBlobPathname(storageKey),
      blobCommandOptions(),
    );
    return metadata.url;
  } catch {
    return null;
  }
}

export async function readBlobPlanPdf(storageKey: string): Promise<Buffer> {
  const pathname = normalizeBlobPathname(storageKey);

  let blobUrl: string;
  try {
    const metadata = await head(pathname, blobCommandOptions());
    blobUrl = metadata.url;
  } catch {
    throw new ApiError("El PDF del plan no existe en Vercel Blob.", 404);
  }

  const response = await fetch(blobUrl);
  if (!response.ok) {
    throw new ApiError("No se pudo descargar el PDF desde Vercel Blob.", 502);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function saveBlobPlanPdf(
  storageKey: string,
  fileBuffer: Buffer,
): Promise<{ url: string; downloadUrl: string; bytes: number }> {
  assertBlobConfigured();

  const pathname = normalizeBlobPathname(storageKey);

  const result = await put(pathname, fileBuffer, {
    ...blobCommandOptions(),
    access: "public",
    contentType: "application/pdf",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  return {
    url: result.url,
    downloadUrl: result.downloadUrl ?? getDownloadUrl(result.url),
    bytes: fileBuffer.byteLength,
  };
}

export async function deleteBlobPlanPdf(storageKey: string): Promise<boolean> {
  const pathname = normalizeBlobPathname(storageKey);

  try {
    await del(pathname, blobCommandOptions());
    return true;
  } catch {
    return false;
  }
}
