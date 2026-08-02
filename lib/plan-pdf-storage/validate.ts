import { ApiError } from "@/lib/api/api-error";
import {
  PLAN_PDF_ALLOWED_MIME_TYPES,
  PLAN_PDF_MAX_BYTES,
} from "@/lib/plan-pdf-storage/constants";

export function assertValidPdfUpload(
  fileBuffer: Buffer,
  mimeType: string | undefined,
): void {
  if (fileBuffer.byteLength === 0) {
    throw new ApiError("El archivo PDF está vacío.", 400);
  }

  if (fileBuffer.byteLength > PLAN_PDF_MAX_BYTES) {
    throw new ApiError("El PDF supera el tamaño máximo permitido (15 MB).", 400);
  }

  if (mimeType && !PLAN_PDF_ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new ApiError("Solo se permiten archivos PDF.", 400);
  }

  const header = fileBuffer.subarray(0, 4).toString("utf8");
  if (!header.startsWith("%PDF")) {
    throw new ApiError("El archivo no parece ser un PDF válido.", 400);
  }
}
