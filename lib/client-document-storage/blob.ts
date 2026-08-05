import { del, head, put } from "@vercel/blob";
import { ApiError } from "@/lib/api/api-error";
import {
  assertBlobConfigured,
  getBlobClientConfig,
} from "@/lib/plan-pdf-storage/provider";

function blobCommandOptions() {
  return getBlobClientConfig() ?? undefined;
}

function normalizePathname(storageKey: string): string {
  return storageKey.replace(/^\/+/, "").replace(/\.\./g, "");
}

export async function saveBlobClientDoc(
  storageKey: string,
  fileBuffer: Buffer,
  mimeType: string,
): Promise<{ url: string; bytes: number }> {
  assertBlobConfigured();
  const pathname = normalizePathname(storageKey);
  const result = await put(pathname, fileBuffer, {
    ...blobCommandOptions(),
    access: "public",
    contentType: mimeType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return { url: result.url, bytes: fileBuffer.byteLength };
}

export async function readBlobClientDoc(storageKey: string): Promise<Buffer> {
  const pathname = normalizePathname(storageKey);
  let blobUrl: string;
  try {
    const metadata = await head(pathname, blobCommandOptions());
    blobUrl = metadata.url;
  } catch {
    throw new ApiError("El documento no existe en Vercel Blob.", 404);
  }

  const response = await fetch(blobUrl);
  if (!response.ok) {
    throw new ApiError("No se pudo leer el documento desde Vercel Blob.", 502);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function deleteBlobClientDoc(storageKey: string): Promise<boolean> {
  const pathname = normalizePathname(storageKey);
  try {
    await del(pathname, blobCommandOptions());
    return true;
  } catch {
    return false;
  }
}
