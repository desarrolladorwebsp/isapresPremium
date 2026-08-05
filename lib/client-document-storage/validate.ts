import { ApiError } from "@/lib/api/api-error";
import {
  CLIENT_DOC_ALLOWED_MIME_TYPES,
  CLIENT_DOC_MAX_BYTES,
} from "@/lib/client-document-storage/constants";

export function validateClientDocumentFile(input: {
  mimeType: string;
  byteSize: number;
  fileName: string;
}): { mimeType: string; fileName: string } {
  const mimeType = input.mimeType.trim().toLowerCase() || "application/octet-stream";
  if (!CLIENT_DOC_ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new ApiError(
      "Solo se permiten PDF o imágenes (JPG, PNG, WEBP, GIF).",
      400,
      "INVALID_FILE_TYPE",
    );
  }

  if (input.byteSize <= 0) {
    throw new ApiError("El archivo está vacío.", 400, "EMPTY_FILE");
  }

  if (input.byteSize > CLIENT_DOC_MAX_BYTES) {
    throw new ApiError(
      "El archivo supera el máximo de 12 MB.",
      400,
      "FILE_TOO_LARGE",
    );
  }

  const fileName = input.fileName.trim().slice(0, 180) || "documento";
  return { mimeType, fileName };
}

export function sanitizeStorageFileName(fileName: string): string {
  const base = fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return base || "documento";
}

export function buildClientDocumentStorageKey(input: {
  userId: string;
  documentId: string;
  fileName: string;
}): string {
  const safeName = sanitizeStorageFileName(input.fileName);
  return `client-docs/${input.userId}/${input.documentId}-${safeName}`;
}
