import { existsSync } from "fs";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { ApiError } from "@/lib/api/api-error";
import { getClientDocStorageRoot } from "@/lib/client-document-storage/constants";

function resolveAbsolutePath(storageKey: string): string {
  const normalized = storageKey.replace(/^\/+/, "").replace(/\.\./g, "");
  return path.join(getClientDocStorageRoot(), normalized);
}

export function localClientDocExists(storageKey: string): boolean {
  try {
    return existsSync(resolveAbsolutePath(storageKey));
  } catch {
    return false;
  }
}

export async function readLocalClientDoc(storageKey: string): Promise<Buffer> {
  const absolutePath = resolveAbsolutePath(storageKey);
  if (!existsSync(absolutePath)) {
    throw new ApiError("El documento no existe en el almacenamiento.", 404);
  }
  try {
    return await readFile(absolutePath);
  } catch (error) {
    console.error("Error al leer documento local:", error);
    throw new ApiError("No se pudo leer el documento.", 500);
  }
}

export async function saveLocalClientDoc(
  storageKey: string,
  fileBuffer: Buffer,
): Promise<{ bytes: number }> {
  const absolutePath = resolveAbsolutePath(storageKey);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, fileBuffer);
  return { bytes: fileBuffer.byteLength };
}

export async function deleteLocalClientDoc(storageKey: string): Promise<boolean> {
  try {
    const absolutePath = resolveAbsolutePath(storageKey);
    if (!existsSync(absolutePath)) return false;
    await unlink(absolutePath);
    return true;
  } catch {
    return false;
  }
}
