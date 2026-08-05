import path from "path";

export const CLIENT_DOC_STORAGE_FOLDER = "client-docs";

export const CLIENT_DOC_MAX_BYTES = 12 * 1024 * 1024;

export const CLIENT_DOC_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/x-pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function getClientDocStorageRoot(): string {
  const configured = process.env.CLIENT_DOC_STORAGE_DIR?.trim();
  if (configured) return path.resolve(configured);
  return path.join(process.cwd(), "storage", CLIENT_DOC_STORAGE_FOLDER);
}

export function resolveClientDocStorageBackend(): "local" | "blob" {
  const override = process.env.CLIENT_DOC_STORAGE?.trim().toLowerCase();
  if (override === "local") return "local";
  if (override === "blob") return "blob";
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) return "blob";
  return "local";
}
