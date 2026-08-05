import type { ClientDocument, ClientDocumentKind as DbKind } from "@prisma/client";
import { ApiError } from "@/lib/api/api-error";
import { prisma } from "@/lib/prisma";
import { readClientOrThrow } from "@/lib/api/user-store";
import {
  canEditClientDataAsExecutive,
  canViewClientAsExecutive,
} from "@/lib/client-pipeline/tracking";
import {
  deleteClientDocumentFile,
  readClientDocumentFile,
  saveClientDocumentFile,
} from "@/lib/client-document-storage";
import {
  buildClientDocumentStorageKey,
  validateClientDocumentFile,
} from "@/lib/client-document-storage/validate";
import {
  CLIENT_DOCUMENT_KIND_LABELS,
  type ClientDocumentKind,
  type ClientDocumentRecord,
} from "@/types/client-document";
import type { ExecutiveKind } from "@prisma/client";

function createDocumentId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `doc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function isPdfMime(mimeType: string): boolean {
  return mimeType === "application/pdf" || mimeType === "application/x-pdf";
}

function resolveDisplayLabel(
  kind: ClientDocumentKind,
  customLabel: string | null,
): string {
  if (kind === "OTROS") {
    return customLabel?.trim() || CLIENT_DOCUMENT_KIND_LABELS.OTROS;
  }
  return CLIENT_DOCUMENT_KIND_LABELS[kind];
}

export function mapClientDocument(row: ClientDocument): ClientDocumentRecord {
  const kind = row.kind as ClientDocumentKind;
  return {
    id: row.id,
    userId: row.userId,
    kind,
    customLabel: row.customLabel,
    displayLabel: resolveDisplayLabel(kind, row.customLabel),
    fileName: row.fileName,
    mimeType: row.mimeType,
    byteSize: row.byteSize,
    uploadedById: row.uploadedById,
    uploadedByName: row.uploadedByName,
    createdAt: row.createdAt.toISOString(),
    isImage: isImageMime(row.mimeType),
    isPdf: isPdfMime(row.mimeType),
  };
}

function assertCanView(
  client: { assignedExecutiveId?: string | null; trackingExecutiveId?: string | null },
  actor: { executiveAccountId: string; isAdmin: boolean },
): void {
  if (!canViewClientAsExecutive(client, actor.executiveAccountId, actor.isAdmin)) {
    throw new ApiError("No tienes permiso para ver este cliente.", 403, "FORBIDDEN");
  }
}

function assertCanEdit(
  client: { assignedExecutiveId?: string | null; trackingExecutiveId?: string | null },
  actor: {
    executiveAccountId: string;
    isAdmin: boolean;
    executiveKind?: ExecutiveKind | null;
  },
): void {
  if (
    !canEditClientDataAsExecutive(
      client,
      actor.executiveAccountId,
      actor.isAdmin,
      actor.executiveKind,
    )
  ) {
    throw new ApiError(
      "No tienes permiso para editar documentos de este cliente.",
      403,
      "FORBIDDEN",
    );
  }
}

export async function listClientDocuments(
  userId: string,
  actor: { executiveAccountId: string; isAdmin: boolean },
): Promise<ClientDocumentRecord[]> {
  const client = await readClientOrThrow(userId);
  assertCanView(client, actor);

  const rows = await prisma.clientDocument.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapClientDocument);
}

export async function createClientDocument(
  userId: string,
  input: {
    kind: ClientDocumentKind;
    customLabel?: string | null;
    fileName: string;
    mimeType: string;
    fileBuffer: Buffer;
  },
  actor: {
    executiveAccountId: string;
    isAdmin: boolean;
    executiveKind?: ExecutiveKind | null;
    actorName?: string | null;
  },
): Promise<ClientDocumentRecord> {
  const client = await readClientOrThrow(userId);
  assertCanEdit(client, actor);

  if (input.kind === "OTROS" && !input.customLabel?.trim()) {
    throw new ApiError(
      "Indica el nombre del documento para la opción Otros.",
      400,
      "INVALID_LABEL",
    );
  }

  const validated = validateClientDocumentFile({
    mimeType: input.mimeType,
    byteSize: input.fileBuffer.byteLength,
    fileName: input.fileName,
  });

  const documentId = createDocumentId();
  const storageKey = buildClientDocumentStorageKey({
    userId,
    documentId,
    fileName: validated.fileName,
  });

  const saved = await saveClientDocumentFile({
    storageKey,
    fileBuffer: input.fileBuffer,
    mimeType: validated.mimeType,
  });

  try {
    const row = await prisma.clientDocument.create({
      data: {
        id: documentId,
        userId,
        kind: input.kind as DbKind,
        customLabel:
          input.kind === "OTROS" ? input.customLabel?.trim() || null : null,
        fileName: validated.fileName,
        mimeType: validated.mimeType,
        byteSize: saved.bytes,
        storageKey,
        storageBackend: saved.backend,
        uploadedById: actor.executiveAccountId,
        uploadedByName: actor.actorName?.trim() || null,
      },
    });
    return mapClientDocument(row);
  } catch (error) {
    await deleteClientDocumentFile(storageKey, saved.backend);
    throw error;
  }
}

export async function getClientDocumentFile(
  userId: string,
  documentId: string,
  actor: { executiveAccountId: string; isAdmin: boolean },
): Promise<{
  record: ClientDocumentRecord;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}> {
  const client = await readClientOrThrow(userId);
  assertCanView(client, actor);

  const row = await prisma.clientDocument.findFirst({
    where: { id: documentId, userId },
  });
  if (!row) {
    throw new ApiError("Documento no encontrado.", 404, "NOT_FOUND");
  }

  const buffer = await readClientDocumentFile(row.storageKey, row.storageBackend);
  return {
    record: mapClientDocument(row),
    buffer,
    mimeType: row.mimeType,
    fileName: row.fileName,
  };
}

export async function deleteClientDocument(
  userId: string,
  documentId: string,
  actor: {
    executiveAccountId: string;
    isAdmin: boolean;
    executiveKind?: ExecutiveKind | null;
  },
): Promise<void> {
  const client = await readClientOrThrow(userId);
  assertCanEdit(client, actor);

  const row = await prisma.clientDocument.findFirst({
    where: { id: documentId, userId },
  });
  if (!row) {
    throw new ApiError("Documento no encontrado.", 404, "NOT_FOUND");
  }

  await prisma.clientDocument.delete({ where: { id: row.id } });
  await deleteClientDocumentFile(row.storageKey, row.storageBackend);
}
