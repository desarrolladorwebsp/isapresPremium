import { resolveClientDocStorageBackend } from "@/lib/client-document-storage/constants";
import {
  deleteBlobClientDoc,
  readBlobClientDoc,
  saveBlobClientDoc,
} from "@/lib/client-document-storage/blob";
import {
  deleteLocalClientDoc,
  readLocalClientDoc,
  saveLocalClientDoc,
} from "@/lib/client-document-storage/local";

export async function saveClientDocumentFile(input: {
  storageKey: string;
  fileBuffer: Buffer;
  mimeType: string;
}): Promise<{ backend: "local" | "blob"; bytes: number }> {
  const backend = resolveClientDocStorageBackend();
  if (backend === "blob") {
    const result = await saveBlobClientDoc(
      input.storageKey,
      input.fileBuffer,
      input.mimeType,
    );
    return { backend, bytes: result.bytes };
  }
  const result = await saveLocalClientDoc(input.storageKey, input.fileBuffer);
  return { backend, bytes: result.bytes };
}

export async function readClientDocumentFile(
  storageKey: string,
  storageBackend: string,
): Promise<Buffer> {
  if (storageBackend === "blob" || resolveClientDocStorageBackend() === "blob") {
    try {
      return await readBlobClientDoc(storageKey);
    } catch {
      if (storageBackend === "local") {
        return readLocalClientDoc(storageKey);
      }
      throw new Error("Documento no encontrado en Blob.");
    }
  }
  return readLocalClientDoc(storageKey);
}

export async function deleteClientDocumentFile(
  storageKey: string,
  storageBackend: string,
): Promise<void> {
  if (storageBackend === "blob") {
    await deleteBlobClientDoc(storageKey);
    return;
  }
  await deleteLocalClientDoc(storageKey);
}
