"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldHint, FieldLabel } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PlanPdfField } from "@/components/admin/plan-pdf-field";
import { ISAPRE_FILTER_OPTIONS, PLAN_TYPE_FILTER_OPTIONS } from "@/domain";
import {
  PLAN_TYPE_LABELS,
  resolveHasTopFromPlanType,
  resolvePrimaryPlanType,
} from "@/lib/plan-metadata";
import { uploadPlanPdf } from "@/lib/api/admin-client";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { Clinic } from "@/domain";
import type { CoverageEntry, CoverageType, HealthPlan, PlanTypeId } from "@/domain";

/** Incluye 0% para no enmascarar valores importados fuera del rango habitual. */
const COVERAGE_PERCENTAGES = [0, 40, 50, 60, 70, 80, 90, 100] as const;

function coveragePercentageOptions(currentPercentage: number) {
  const values = new Set<number>(COVERAGE_PERCENTAGES);
  if (Number.isFinite(currentPercentage)) {
    values.add(Math.round(currentPercentage));
  }

  return [...values]
    .sort((left, right) => left - right)
    .map((value) => ({
      value: String(value),
      label: `${value}%`,
    }));
}

export interface PlanFormProps {
  initialValue: HealthPlan;
  clinics: Clinic[];
  isEditing: boolean;
  saving: boolean;
  embedded?: boolean;
  onSubmit: (plan: HealthPlan) => Promise<void>;
  onCancel: () => void;
}

function createCoverageRow(clinics: Clinic[]): CoverageEntry {
  const firstClinic = clinics[0];
  return {
    clinic_id: firstClinic?.id ?? "",
    clinic_name: firstClinic?.name ?? "",
    percentage: 70,
    type: "hospitalaria",
  };
}

export function PlanForm({
  initialValue,
  clinics,
  isEditing,
  saving,
  embedded = false,
  onSubmit,
  onCancel,
}: PlanFormProps) {
  const [form, setForm] = useState<HealthPlan>(initialValue);
  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const planType = resolvePrimaryPlanType(initialValue);
    setForm({
      ...initialValue,
      plan_type: planType,
      has_top: resolveHasTopFromPlanType(planType),
      pdf_url: initialValue.pdf_url ?? null,
      pdf_public_id: initialValue.pdf_public_id ?? null,
    });
    setPendingPdfFile(null);
    setSubmitError(null);
  }, [initialValue]);

  const isapreOptions = useMemo(
    () =>
      ISAPRE_FILTER_OPTIONS.map((option) => ({
        value: option.label,
        label: option.label,
      })),
    [],
  );

  const planTypeOptions = useMemo(
    () =>
      PLAN_TYPE_FILTER_OPTIONS.map((option) => ({
        value: option.id,
        label: PLAN_TYPE_LABELS[option.id],
      })),
    [],
  );

  const clinicOptions = useMemo(
    () =>
      clinics.map((clinic) => ({
        value: clinic.id,
        label: clinic.name,
      })),
    [clinics],
  );

  function updateCoverage(
    index: number,
    patch: Partial<CoverageEntry>,
  ): void {
    setForm((current) => ({
      ...current,
      coverage: current.coverage.map((entry, entryIndex) => {
        if (entryIndex !== index) return entry;

        const next = { ...entry, ...patch };

        if (patch.clinic_id) {
          const clinic = clinics.find((item) => item.id === patch.clinic_id);
          if (clinic) {
            next.clinic_name = clinic.name;
          }
        }

        return next;
      }),
    }));
  }

  function addCoverageRow(): void {
    setForm((current) => ({
      ...current,
      coverage: [...current.coverage, createCoverageRow(clinics)],
    }));
  }

  function removeCoverageRow(index: number): void {
    setForm((current) => ({
      ...current,
      coverage: current.coverage.filter((_, entryIndex) => entryIndex !== index),
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const planType = resolvePrimaryPlanType(form);
    const payload: HealthPlan = {
      ...form,
      isapre: form.isapre.trim(),
      plan_name: form.plan_name.trim(),
      unique_code: form.unique_code.trim(),
      plan_type: planType,
      has_top: resolveHasTopFromPlanType(planType),
      additional_notes: form.additional_notes?.trim() || null,
      pdf_url: form.pdf_url ?? null,
      pdf_public_id: form.pdf_public_id ?? null,
    };

    if (!payload.plan_name || !payload.unique_code || !payload.isapre) return;

    if (
      isEditing &&
      !pendingPdfFile &&
      payload.pdf_url &&
      payload.isapre !== initialValue.isapre.trim()
    ) {
      setSubmitError(
        "Cambiaste la Isapre. Vuelve a subir el PDF para moverlo a la carpeta correcta.",
      );
      return;
    }

    try {
      if (pendingPdfFile) {
        setUploadingPdf(true);
        const uploaded = await uploadPlanPdf(pendingPdfFile, {
          uniqueCode: payload.unique_code,
          isapre: payload.isapre,
          previousStoragePath: initialValue.pdf_public_id,
        });
        payload.pdf_url = uploaded.url;
        payload.pdf_public_id = uploaded.storagePath;
      }

      await onSubmit(payload);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el plan o subir el PDF.",
      );
    } finally {
      setUploadingPdf(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={joinClasses(
        "space-y-6",
        embedded ? "" : joinClasses("rounded-xl border bg-white p-5 shadow-card sm:p-6", ui.border),
      )}
    >
      {embedded ? null : (
        <div>
          <h2 className="text-lg font-bold text-primary-dark">
            {isEditing ? "Editar plan" : "Nuevo plan"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Configura los datos base y las coberturas por prestador.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup>
          <FieldLabel htmlFor="plan-isapre">Isapre</FieldLabel>
          <Select
            id="plan-isapre"
            options={isapreOptions}
            value={form.isapre}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                isapre: event.target.value,
              }))
            }
            className={joinClasses("h-11", ui.input)}
          />
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor="plan-base-price">Precio base (UF)</FieldLabel>
          <Input
            id="plan-base-price"
            type="number"
            min={0}
            step={0.01}
            value={form.base_price_uf}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                base_price_uf: Number(event.target.value),
              }))
            }
            required
            className={joinClasses("h-11 tabular-nums", ui.input)}
          />
        </FieldGroup>

        <FieldGroup className="sm:col-span-2">
          <FieldLabel htmlFor="plan-name">Nombre del plan</FieldLabel>
          <Input
            id="plan-name"
            value={form.plan_name}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                plan_name: event.target.value,
              }))
            }
            placeholder="Consalud 13-SF1001-26"
            required
            className={joinClasses("h-11", ui.input)}
          />
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor="plan-code">Código único</FieldLabel>
          <Input
            id="plan-code"
            value={form.unique_code}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                unique_code: event.target.value,
              }))
            }
            placeholder="13-SF1001-26"
            required
            disabled={isEditing}
            className={joinClasses("h-11 font-mono text-sm", ui.input)}
          />
          {isEditing ? (
            <FieldHint>El código único no se puede modificar.</FieldHint>
          ) : null}
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor="plan-type">Tipo de plan</FieldLabel>
          <Select
            id="plan-type"
            options={planTypeOptions}
            value={form.plan_type}
            onChange={(event) => {
              const planType = event.target.value as PlanTypeId;
              setForm((current) => ({
                ...current,
                plan_type: planType,
                has_top: resolveHasTopFromPlanType(planType),
              }));
            }}
            className={joinClasses("h-11", ui.input)}
          />
          <FieldHint>
            Preferente, libre elección o cerrado. Obliga la clasificación del
            plan en filtros y fichas.
          </FieldHint>
        </FieldGroup>

        <PlanPdfField
          isapre={form.isapre}
          uniqueCode={form.unique_code}
          pdfUrl={form.pdf_url}
          pdfPublicId={form.pdf_public_id}
          pdfFileName={pendingPdfFile?.name ?? null}
          disabled={saving}
          uploading={uploadingPdf}
          onFileSelect={setPendingPdfFile}
        />

        <FieldGroup className="sm:col-span-2">
          <FieldLabel htmlFor="plan-notes">Notas adicionales</FieldLabel>
          <textarea
            id="plan-notes"
            value={form.additional_notes ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                additional_notes: event.target.value || null,
              }))
            }
            rows={3}
            placeholder="Información complementaria del plan…"
            className={joinClasses(
              "w-full resize-y rounded-lg border px-3 py-2.5 text-sm",
              ui.input,
            )}
          />
        </FieldGroup>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-primary-dark">
              Coberturas por prestador
            </h3>
            <p className="text-xs text-muted">
              {form.coverage.length} registro(s) configurado(s)
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addCoverageRow}
            disabled={clinics.length === 0}
          >
            Añadir cobertura
          </Button>
        </div>

        {clinics.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted">
            Crea al menos una clínica antes de asignar coberturas.
          </p>
        ) : (
          <div className="space-y-3">
            {form.coverage.map((entry, index) => (
              <div
                key={`${entry.clinic_id}-${entry.type}-${index}`}
                className={joinClasses(
                  "grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_7rem_9rem_auto]",
                  ui.border,
                )}
              >
                <FieldGroup>
                  <FieldLabel>Prestador</FieldLabel>
                  <Select
                    options={clinicOptions}
                    value={entry.clinic_id}
                    onChange={(event) =>
                      updateCoverage(index, { clinic_id: event.target.value })
                    }
                    className={joinClasses("h-10", ui.input)}
                  />
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel>% Cobertura</FieldLabel>
                  <Select
                    options={coveragePercentageOptions(entry.percentage)}
                    value={String(entry.percentage)}
                    onChange={(event) =>
                      updateCoverage(index, {
                        percentage: Number(event.target.value),
                      })
                    }
                    className={joinClasses("h-10", ui.input)}
                  />
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel>Tipo</FieldLabel>
                  <Select
                    options={[
                      { value: "hospitalaria", label: "Hospitalaria" },
                      { value: "ambulatoria", label: "Ambulatoria" },
                    ]}
                    value={entry.type}
                    onChange={(event) =>
                      updateCoverage(index, {
                        type: event.target.value as CoverageType,
                      })
                    }
                    className={joinClasses("h-10", ui.input)}
                  />
                </FieldGroup>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => removeCoverageRow(index)}
                  >
                    Quitar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {submitError ? (
        <p className="rounded-lg border border-accent-danger/30 bg-danger-muted px-4 py-3 text-sm font-medium text-accent-danger">
          {submitError}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving || uploadingPdf}>
          {uploadingPdf
            ? "Subiendo PDF…"
            : saving
              ? "Guardando…"
              : isEditing
                ? "Guardar plan"
                : "Crear plan"}
        </Button>
      </div>
    </form>
  );
}
