import { ApiError } from "@/lib/api/api-error";
import {
  buildPlanPdfApiUrl,
  buildPlanPdfStorageKey,
  collectPlanPdfCleanupKeys,
} from "@/lib/plan-pdf-storage/paths";
import { deletePlanPdfVariants } from "@/lib/plan-pdf-storage/delete";
import { saveBlobPlanPdf } from "@/lib/plan-pdf-storage/blob";
import { saveCpanelPlanPdf } from "@/lib/plan-pdf-storage/cpanel";
import { saveLocalPlanPdf } from "@/lib/plan-pdf-storage/local";
import {
  useCpanelStorage,
  useVercelBlobStorage,
} from "@/lib/plan-pdf-storage/provider";
import type {
  PlanPdfUploadResult,
  UploadPlanPdfInput,
} from "@/lib/plan-pdf-storage/types";
import { assertValidPdfUpload } from "@/lib/plan-pdf-storage/validate";

export async function savePlanPdf({
  fileBuffer,
  isapre,
  uniqueCode,
  mimeType,
  zona,
  previousStoragePath,
}: UploadPlanPdfInput): Promise<PlanPdfUploadResult> {
  const trimmedIsapre = isapre.trim();
  const trimmedCode = uniqueCode.trim();

  if (!trimmedIsapre) {
    throw new ApiError("La Isapre es obligatoria para almacenar el PDF.", 400);
  }

  if (!trimmedCode) {
    throw new ApiError(
      "El código único del plan es obligatorio para subir el PDF.",
      400,
    );
  }

  assertValidPdfUpload(fileBuffer, mimeType);

  const storageKey = buildPlanPdfStorageKey(trimmedIsapre, trimmedCode, zona);

  const cleanupKeys = collectPlanPdfCleanupKeys(
    trimmedIsapre,
    trimmedCode,
    previousStoragePath,
  ).filter((key) => key !== storageKey);

  await deletePlanPdfVariants(cleanupKeys);

  if (useCpanelStorage()) {
    const uploaded = await saveCpanelPlanPdf(storageKey, fileBuffer);

    return {
      url: uploaded.url,
      storagePath: storageKey,
      bytes: uploaded.bytes,
      uploadedAt: new Date().toISOString(),
      backend: "cpanel",
    };
  }

  if (useVercelBlobStorage()) {
    const uploaded = await saveBlobPlanPdf(storageKey, fileBuffer);

    return {
      url: uploaded.downloadUrl,
      blobUrl: uploaded.url,
      storagePath: storageKey,
      bytes: uploaded.bytes,
      uploadedAt: new Date().toISOString(),
      backend: "blob",
    };
  }

  const uploaded = await saveLocalPlanPdf(storageKey, fileBuffer);

  return {
    url: buildPlanPdfApiUrl(trimmedCode),
    storagePath: storageKey,
    bytes: uploaded.bytes,
    uploadedAt: new Date().toISOString(),
    backend: "local",
  };
}
