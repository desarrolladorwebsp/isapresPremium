"use client";

import { useRef, useState } from "react";
import { FieldGroup, FieldHint, FieldLabel } from "@/components/ui/form-field";
import { buildPlanPdfStorageKey } from "@/lib/plan-pdf-storage/paths";
import { PLAN_PDF_MAX_BYTES } from "@/lib/plan-pdf-storage/constants";
import { getPlanPdfDownloadUrl } from "@/lib/plan-pdf";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

export interface PlanPdfFieldProps {
  isapre: string;
  uniqueCode: string;
  pdfUrl: string | null;
  pdfPublicId?: string | null;
  pdfFileName: string | null;
  disabled?: boolean;
  uploading?: boolean;
  onFileSelect: (file: File | null) => void;
}

function formatMaxSize(): string {
  return `${Math.round(PLAN_PDF_MAX_BYTES / (1024 * 1024))} MB`;
}

export function PlanPdfField({
  isapre,
  uniqueCode,
  pdfUrl,
  pdfPublicId = null,
  pdfFileName,
  disabled = false,
  uploading = false,
  onFileSelect,
}: PlanPdfFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const canUpload =
    isapre.trim().length > 0 && uniqueCode.trim().length > 0;
  const storagePath =
    canUpload ? buildPlanPdfStorageKey(isapre, uniqueCode) : null;

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setError(null);

    if (!file) {
      onFileSelect(null);
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Solo se permiten archivos PDF.");
      onFileSelect(null);
      event.target.value = "";
      return;
    }

    if (file.size > PLAN_PDF_MAX_BYTES) {
      setError(`El PDF no puede superar ${formatMaxSize()}.`);
      onFileSelect(null);
      event.target.value = "";
      return;
    }

    onFileSelect(file);
  }

  return (
    <FieldGroup className="sm:col-span-2">
      <FieldLabel htmlFor="plan-pdf">PDF del plan (Isapre)</FieldLabel>

      <div
        className={joinClasses(
          "rounded-xl border border-dashed p-4",
          ui.border,
          disabled ? "opacity-60" : "",
        )}
      >
        <input
          ref={inputRef}
          id="plan-pdf"
          type="file"
          accept="application/pdf,.pdf"
          disabled={disabled || uploading || !canUpload}
          onChange={handleChange}
          className="block w-full text-sm text-muted file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-dark hover:file:bg-primary/15"
        />

        {!canUpload ? (
          <FieldHint className="mt-2">
            Selecciona la Isapre e ingresa el código único antes de subir el PDF.
          </FieldHint>
        ) : (
          <FieldHint className="mt-2">
            Clave{" "}
            <span className="font-mono text-foreground">{storagePath}</span>
            {" · "}
            En producción (Vercel Blob) o local en{" "}
            <span className="font-mono">storage/planes-pdf/</span>. Máximo{" "}
            {formatMaxSize()}.
          </FieldHint>
        )}

        {pdfFileName ? (
          <p className="mt-3 text-sm font-medium text-foreground">
            Archivo seleccionado:{" "}
            <span className="text-primary-dark">{pdfFileName}</span>
            {uploading ? " · Subiendo…" : ""}
          </p>
        ) : null}

        {pdfUrl || pdfPublicId ? (
          <a
            href={
              getPlanPdfDownloadUrl({
                pdfUrl,
                pdfPublicId,
                isapre,
                uniqueCode,
              }) ?? "#"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline"
          >
            Ver PDF actual
          </a>
        ) : null}

        {error ? (
          <p className="mt-2 text-sm font-medium text-accent-danger">{error}</p>
        ) : null}
      </div>
    </FieldGroup>
  );
}
