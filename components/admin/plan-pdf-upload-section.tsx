"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminBadge } from "@/components/admin/admin-data-table";
import { uploadPlanPdfsAdmin } from "@/lib/api/admin-client";
import { PLAN_PDF_MAX_BYTES } from "@/lib/plan-pdf-storage/constants";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type {
  PlanPdfBatchUploadResponse,
  PlanPdfUploadItemResult,
} from "@/types/plan-pdf-upload";

export interface PlanPdfUploadTarget {
  uniqueCode: string;
  isapreId: string;
  planName?: string;
}

export interface PlanPdfUploadSectionProps {
  onComplete: (response: PlanPdfBatchUploadResponse) => void;
  onNotify: (message: string, tone?: "success" | "error") => void;
  defaultIsapreId?: string;
}

function formatMaxSize(): string {
  return `${Math.round(PLAN_PDF_MAX_BYTES / (1024 * 1024))} MB`;
}

function summarizeUpload(response: PlanPdfBatchUploadResponse): string {
  if (response.uploaded === 0) {
    return "No se pudo cargar ningún PDF. Revisa los errores.";
  }

  const parts = [
    `${response.uploaded} PDF${response.uploaded === 1 ? "" : "s"} cargado${response.uploaded === 1 ? "" : "s"}`,
  ];

  if (response.replaced > 0) {
    parts.push(
      `${response.replaced} reemplazado${response.replaced === 1 ? "" : "s"}`,
    );
  }

  if (response.failed > 0) {
    parts.push(`${response.failed} con error`);
  }

  return parts.join(" · ");
}

function resultTone(item: PlanPdfUploadItemResult): "success" | "warning" | "danger" {
  if (!item.ok) return "danger";
  return item.replaced ? "warning" : "success";
}

export function PlanPdfUploadSection({
  onComplete,
  onNotify,
  defaultIsapreId,
}: PlanPdfUploadSectionProps) {
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [replaceCode, setReplaceCode] = useState("");
  const [lastResults, setLastResults] = useState<PlanPdfUploadItemResult[]>(
    [],
  );

  async function handleUpload(
    files: FileList | File[] | null,
    options?: {
      uniqueCode?: string;
      isapreId?: string;
      allowReplace?: boolean;
    },
  ) {
    const selected = files ? [...files] : [];
    if (selected.length === 0) return;

    const invalid = selected.find(
      (file) => file.type && file.type !== "application/pdf",
    );
    if (invalid) {
      onNotify("Solo se permiten archivos PDF.", "error");
      return;
    }

    const tooLarge = selected.find((file) => file.size > PLAN_PDF_MAX_BYTES);
    if (tooLarge) {
      onNotify(`Cada PDF debe pesar menos de ${formatMaxSize()}.`, "error");
      return;
    }

    setUploading(true);
    setLastResults([]);

    try {
      const response = await uploadPlanPdfsAdmin({
        files: selected,
        uniqueCode: options?.uniqueCode,
        isapreId: options?.isapreId ?? defaultIsapreId,
        allowReplace: options?.allowReplace ?? true,
      });

      setLastResults(response.results);
      onComplete(response);
      onNotify(
        summarizeUpload(response),
        response.uploaded > 0 ? "success" : "error",
      );
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudieron subir los PDFs.",
        "error",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-primary/15 bg-primary/5 p-4">
      <div>
        <h3 className="text-base font-bold text-primary-dark">
          Cargar PDFs de planes
        </h3>
        <p className="mt-1 text-sm text-muted">
          El sistema detecta el plan por el nombre del archivo (ej.{" "}
          <code className="rounded bg-white px-1 py-0.5 text-xs">
            13-SF1001-26.pdf
          </code>
          ), lo guarda en storage y actualiza la base de datos. También puedes
          reemplazar un PDF existente si hubo un error.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div
          className={joinClasses(
            "rounded-xl border border-dashed bg-white p-4",
            ui.border,
          )}
        >
          <p className="text-sm font-semibold text-foreground">
            Carga masiva o pendientes
          </p>
          <p className="mt-1 text-xs text-muted">
            Selecciona uno o varios PDFs. Si el nombre coincide con un plan en
            BD, se asocia automáticamente.
          </p>
          <input
            ref={bulkInputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="hidden"
            onChange={(event) => {
              void handleUpload(event.target.files, {
                isapreId: defaultIsapreId,
                allowReplace: true,
              });
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            className="mt-3"
            disabled={uploading}
            onClick={() => bulkInputRef.current?.click()}
          >
            {uploading ? "Subiendo…" : "Seleccionar PDFs"}
          </Button>
        </div>

        <div
          className={joinClasses(
            "rounded-xl border border-dashed bg-white p-4",
            ui.border,
          )}
        >
          <p className="text-sm font-semibold text-foreground">
            Reemplazar PDF por código
          </p>
          <p className="mt-1 text-xs text-muted">
            Útil para corregir un PDF ya cargado. Indica el código del plan y
            sube el archivo correcto.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              value={replaceCode}
              onChange={(event) => setReplaceCode(event.target.value)}
              placeholder="Código del plan"
              aria-label="Código del plan a reemplazar"
              className={joinClasses("h-10", ui.input)}
            />
            <input
              ref={replaceInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(event) => {
                void handleUpload(event.target.files, {
                  uniqueCode: replaceCode.trim(),
                  allowReplace: true,
                });
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={uploading || !replaceCode.trim()}
              onClick={() => replaceInputRef.current?.click()}
            >
              Reemplazar
            </Button>
          </div>
        </div>
      </div>

      {lastResults.length > 0 ? (
        <div className="space-y-2 rounded-xl border bg-white p-3" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Resultado de la carga
          </p>
          <ul className="space-y-2">
            {lastResults.map((item, index) => (
              <li
                key={`${item.fileName}-${index}`}
                className="rounded-lg bg-bg-layout/70 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">
                    {item.fileName}
                  </span>
                  <AdminBadge tone={resultTone(item)}>
                    {item.ok
                      ? item.replaced
                        ? "Reemplazado"
                        : "Cargado"
                      : "Error"}
                  </AdminBadge>
                </div>
                {item.ok ? (
                  <p className="mt-1 text-xs text-muted">
                    {item.uniqueCode} · {item.planName} · {item.isapre}
                    {item.detectedFromFileName ? " · detectado por nombre" : ""}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-red-700">{item.error}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export interface PlanPdfRowUploadButtonProps {
  uniqueCode: string;
  isapreId: string;
  uploading: boolean;
  onUpload: (files: FileList | null) => void;
}

export function PlanPdfRowUploadButton({
  uniqueCode,
  uploading,
  onUpload,
}: PlanPdfRowUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => {
          onUpload(event.target.files);
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Subiendo…" : "Subir PDF"}
      </Button>
    </>
  );
}
