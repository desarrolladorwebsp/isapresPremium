import { existsSync } from "fs";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { ApiError } from "@/lib/api/api-error";
import { resolveAbsolutePdfPath } from "@/lib/plan-pdf-storage/paths";

export function localPlanPdfExists(storageKey: string): boolean {
  try {
    const absolutePath = resolveAbsolutePdfPath(storageKey);
    return existsSync(absolutePath);
  } catch {
    return false;
  }
}

export async function readLocalPlanPdf(storageKey: string): Promise<Buffer> {
  const absolutePath = resolveAbsolutePdfPath(storageKey);

  if (!existsSync(absolutePath)) {
    throw new ApiError("El PDF del plan no existe en el almacenamiento.", 404);
  }

  try {
    return await readFile(absolutePath);
  } catch (error) {
    console.error("Error al leer PDF local:", error);
    throw new ApiError("No se pudo leer el PDF del plan.", 500);
  }
}

export async function saveLocalPlanPdf(
  storageKey: string,
  fileBuffer: Buffer,
): Promise<{ bytes: number }> {
  const absolutePath = resolveAbsolutePdfPath(storageKey);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, fileBuffer);
  return { bytes: fileBuffer.byteLength };
}

export async function deleteLocalPlanPdf(storageKey: string): Promise<boolean> {
  try {
    const absolutePath = resolveAbsolutePdfPath(storageKey);
    if (!existsSync(absolutePath)) return false;
    await unlink(absolutePath);
    return true;
  } catch {
    return false;
  }
}
