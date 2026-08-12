import { existsSync } from "fs";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { del, put } from "@vercel/blob";
import { ApiError } from "@/lib/api/api-error";
import {
  assertBlobConfigured,
  getBlobClientConfig,
} from "@/lib/plan-pdf-storage/provider";

export const STAFF_AVATAR_FOLDER = "staff-avatars";
export const STAFF_AVATAR_MAX_BYTES = 4 * 1024 * 1024;

const ALLOWED_MIME = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function blobOptions() {
  return getBlobClientConfig() ?? undefined;
}

function resolveBackend(): "local" | "blob" {
  const override = process.env.STAFF_AVATAR_STORAGE?.trim().toLowerCase();
  if (override === "local") return "local";
  if (override === "blob") return "blob";
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) return "blob";
  return "local";
}

function getLocalRoot(): string {
  const configured = process.env.STAFF_AVATAR_STORAGE_DIR?.trim();
  if (configured) return path.resolve(configured);
  return path.join(process.cwd(), "storage", STAFF_AVATAR_FOLDER);
}

function normalizeKey(storageKey: string): string {
  return storageKey.replace(/^\/+/, "").replace(/\.\./g, "");
}

function localPath(storageKey: string): string {
  return path.join(getLocalRoot(), path.basename(normalizeKey(storageKey)));
}

function extensionForMime(mimeType: string): string {
  return ALLOWED_MIME.get(mimeType.trim().toLowerCase()) ?? "jpg";
}

export function validateStaffAvatarFile(input: {
  mimeType: string;
  byteSize: number;
}): { mimeType: string } {
  const mimeType = input.mimeType.trim().toLowerCase();
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new ApiError(
      "La foto debe ser JPG, PNG o WEBP.",
      400,
      "INVALID_FILE_TYPE",
    );
  }
  if (input.byteSize <= 0) {
    throw new ApiError("El archivo está vacío.", 400, "EMPTY_FILE");
  }
  if (input.byteSize > STAFF_AVATAR_MAX_BYTES) {
    throw new ApiError(
      "La foto supera el máximo de 4 MB.",
      400,
      "FILE_TOO_LARGE",
    );
  }
  return { mimeType };
}

export function getStaffAvatarMimeType(
  storageKey: string,
  avatarUrl: string | null,
): string {
  const source = `${storageKey} ${avatarUrl ?? ""}`.toLowerCase();
  if (source.includes(".png")) return "image/png";
  if (source.includes(".webp")) return "image/webp";
  return "image/jpeg";
}

export async function saveStaffAvatarFile(input: {
  staffId: string;
  fileBuffer: Buffer;
  mimeType: string;
  previousStorageKey: string | null;
}): Promise<{ url: string; storageKey: string }> {
  const { mimeType } = validateStaffAvatarFile({
    mimeType: input.mimeType,
    byteSize: input.fileBuffer.byteLength,
  });
  const ext = extensionForMime(mimeType);
  const storageKey = `${STAFF_AVATAR_FOLDER}/${input.staffId}.${ext}`;
  const backend = resolveBackend();

  if (
    input.previousStorageKey &&
    input.previousStorageKey !== storageKey
  ) {
    await deleteStaffAvatarFile(input.previousStorageKey);
  }

  if (backend === "blob") {
    assertBlobConfigured();
    const result = await put(normalizeKey(storageKey), input.fileBuffer, {
      ...blobOptions(),
      access: "public",
      contentType: mimeType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return { url: result.url, storageKey };
  }

  const absolutePath = localPath(storageKey);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, input.fileBuffer);
  return {
    url: `/api/staff/avatars/${encodeURIComponent(input.staffId)}`,
    storageKey,
  };
}

export async function readStaffAvatarFile(storageKey: string): Promise<Buffer> {
  const backend = resolveBackend();
  const key = normalizeKey(storageKey);

  if (backend === "blob") {
    assertBlobConfigured();
    const { head } = await import("@vercel/blob");
    let blobUrl: string;
    try {
      const metadata = await head(key, blobOptions());
      blobUrl = metadata.url;
    } catch {
      throw new ApiError("La foto no existe.", 404);
    }
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new ApiError("No se pudo leer la foto.", 502);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  const absolutePath = localPath(key);
  if (!existsSync(absolutePath)) {
    throw new ApiError("La foto no existe.", 404);
  }
  return readFile(absolutePath);
}

export async function deleteStaffAvatarFile(
  storageKey: string,
): Promise<void> {
  const key = normalizeKey(storageKey);
  const backend = resolveBackend();

  if (backend === "blob") {
    try {
      await del(key, blobOptions());
    } catch {
      // La foto puede no existir en Blob.
    }
    return;
  }

  try {
    const absolutePath = localPath(key);
    if (existsSync(absolutePath)) await unlink(absolutePath);
  } catch {
    // Ignorar si el archivo local ya no está.
  }
}
