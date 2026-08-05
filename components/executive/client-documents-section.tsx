"use client";

import { useEffect, useRef, useState } from "react";
import { AdminFormModal } from "@/components/admin/admin-data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  deleteClientDocumentApi,
  fetchClientDocuments,
  getClientDocumentDownloadUrl,
  getClientDocumentInlineUrl,
  uploadClientDocument,
} from "@/lib/api/admin-client";
import { CLIENT_DOC_MAX_BYTES } from "@/lib/client-document-storage/constants";
import { formatPersonDisplayName } from "@/lib/format-person-name";
import { touchTarget, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import {
  CLIENT_DOCUMENT_KIND_OPTIONS,
  type ClientDocumentKind,
  type ClientDocumentRecord,
} from "@/types/client-document";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadedAt(value: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ClientDocumentsSection({
  clientId,
  canEdit,
  onNotify,
}: {
  clientId: string;
  canEdit: boolean;
  onNotify: (message: string, tone?: "success" | "error") => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<ClientDocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [kind, setKind] = useState<ClientDocumentKind>("RUT");
  const [customLabel, setCustomLabel] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ClientDocumentRecord | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const rows = await fetchClientDocuments(clientId);
        if (!cancelled) setDocuments(rows);
      } catch (error) {
        if (!cancelled) {
          onNotify(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los documentos.",
            "error",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, onNotify]);

  async function handleUpload() {
    if (!selectedFile) {
      onNotify("Selecciona un archivo para adjuntar.", "error");
      return;
    }
    if (kind === "OTROS" && !customLabel.trim()) {
      onNotify("Indica el nombre del documento.", "error");
      return;
    }
    if (selectedFile.size > CLIENT_DOC_MAX_BYTES) {
      onNotify("El archivo supera el máximo de 12 MB.", "error");
      return;
    }

    setUploading(true);
    try {
      const created = await uploadClientDocument({
        clientId,
        kind,
        customLabel: kind === "OTROS" ? customLabel.trim() : null,
        file: selectedFile,
      });
      setDocuments((current) => [created, ...current]);
      setSelectedFile(null);
      setCustomLabel("");
      setKind("RUT");
      if (fileInputRef.current) fileInputRef.current.value = "";
      onNotify("Documento adjuntado.");
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo subir el documento.",
        "error",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(documentId: string) {
    setDeletingId(documentId);
    try {
      await deleteClientDocumentApi(clientId, documentId);
      setDocuments((current) => current.filter((row) => row.id !== documentId));
      if (previewDoc?.id === documentId) setPreviewDoc(null);
      onNotify("Documento eliminado.");
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el documento.",
        "error",
      );
    } finally {
      setDeletingId(null);
    }
  }

  const previewUrl = previewDoc
    ? getClientDocumentInlineUrl(clientId, previewDoc.id)
    : null;
  const downloadUrl = previewDoc
    ? getClientDocumentDownloadUrl(clientId, previewDoc.id)
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">
          Documentos adjuntos
        </h3>
        <span className="text-xs text-muted">PDF o imagen · máx. 12 MB</span>
      </div>

      {canEdit ? (
        <div className="space-y-3 rounded-xl border border-border bg-bg-layout/40 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Tipo de documento</span>
              <Select
                value={kind}
                options={CLIENT_DOCUMENT_KIND_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                onChange={(event) =>
                  setKind(event.target.value as ClientDocumentKind)
                }
              />
            </label>
            {kind === "OTROS" ? (
              <label className="block space-y-1.5">
                <span className="text-xs font-medium">Nombre del documento</span>
                <Input
                  value={customLabel}
                  onChange={(event) => setCustomLabel(event.target.value)}
                  placeholder="Ej. Certificado de afiliación"
                  maxLength={120}
                />
              </label>
            ) : (
              <div className="hidden sm:block" />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.jpg,.jpeg,.png,.webp,.gif"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setSelectedFile(file);
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={joinClasses(touchTarget, "border border-border")}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              Elegir archivo
            </Button>
            <span className="min-w-0 flex-1 truncate text-xs text-muted">
              {selectedFile
                ? `${selectedFile.name} · ${formatBytes(selectedFile.size)}`
                : "Ningún archivo seleccionado"}
            </span>
            <Button
              type="button"
              size="sm"
              variant="primary"
              disabled={uploading || !selectedFile}
              onClick={() => void handleUpload()}
            >
              {uploading ? "Subiendo…" : "Adjuntar"}
            </Button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">Cargando documentos…</p>
      ) : documents.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-bg-layout/30 px-3 py-4 text-xs text-muted">
          Aún no hay documentos adjuntos en esta ficha.
        </p>
      ) : (
        <ul className="space-y-2 rounded-xl border border-border bg-bg-layout/40 p-3">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-2 hover:bg-surface-hover"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {doc.displayLabel}
                </p>
                <p className="truncate text-[11px] text-muted">
                  {doc.fileName} · {formatBytes(doc.byteSize)} ·{" "}
                  {formatUploadedAt(doc.createdAt)}
                  {doc.uploadedByName
                    ? ` · ${formatPersonDisplayName(doc.uploadedByName)}`
                    : ""}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setPreviewDoc(doc)}
              >
                Ver
              </Button>
              {canEdit ? (
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={deletingId === doc.id}
                  onClick={() => void handleDelete(doc.id)}
                >
                  {deletingId === doc.id ? "…" : "Eliminar"}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <AdminFormModal
        open={Boolean(previewDoc)}
        title={previewDoc?.displayLabel ?? "Vista previa"}
        description={
          previewDoc
            ? `${previewDoc.fileName} · ${formatBytes(previewDoc.byteSize)}`
            : undefined
        }
        onClose={() => setPreviewDoc(null)}
        size="xl"
      >
        {previewDoc && previewUrl && downloadUrl ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-border bg-bg-layout/40">
              {previewDoc.isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={previewDoc.displayLabel}
                  className="mx-auto max-h-[70vh] w-auto max-w-full object-contain"
                />
              ) : previewDoc.isPdf ? (
                <iframe
                  title={previewDoc.displayLabel}
                  src={previewUrl}
                  className="h-[70vh] w-full bg-white"
                />
              ) : (
                <p className="px-4 py-10 text-center text-sm text-muted">
                  No hay vista previa para este tipo de archivo. Puedes
                  descargarlo.
                </p>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPreviewDoc(null)}
              >
                Cerrar
              </Button>
              <a href={downloadUrl} download={previewDoc.fileName}>
                <Button type="button" variant="primary">
                  Descargar
                </Button>
              </a>
            </div>
          </div>
        ) : null}
      </AdminFormModal>
    </div>
  );
}
