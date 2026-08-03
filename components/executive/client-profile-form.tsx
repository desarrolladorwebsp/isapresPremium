"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CollapsibleSection } from "@/components/executive/collapsible-section";
import {
  buildEmptyAdditionalTitular,
  buildEmptyDependent,
  calculateAgeFromBirthDate,
  CLIENT_REGION_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  splitFullName,
} from "@/lib/client-profile/constants";
import { sanitizeRutInput, isValidRut } from "@/lib/auth/rut";
import {
  getClientManagementRutErrors,
  getClientManagementRutWarnings,
} from "@/lib/client-profile/validate-client-ruts";
import { fetchClinics } from "@/lib/api/admin-client";
import { CURRENT_COVERAGE_OPTIONS } from "@/lib/filter-options";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type {
  ClientAdditionalTitularProfile,
  ClientCoverageArea,
  ClientDependentProfile,
} from "@/types/client-profile";
import type { Clinic } from "@/types/clinic";

const COVERAGE_SELECT_OPTIONS = CURRENT_COVERAGE_OPTIONS.map((option) => ({
  value: option.label,
  label: option.label,
}));

export interface ClientProfileFormValue {
  email: string;
  phone: string;
  rut: string;
  firstNames: string;
  lastNames: string;
  birthDate: string;
  age: string;
  currentIsapre: string;
  heightCm: string;
  weightKg: string;
  maritalStatus: string;
  address: string;
  commune: string;
  coverageArea: ClientCoverageArea;
  coverageRegionId: string;
  preferredClinicIds: string[];
  anualidad: boolean;
  anualidadComment: string;
  segurosComplementarios: string;
  dependents: ClientDependentProfile[];
  additionalTitulares: ClientAdditionalTitularProfile[];
}

export function buildEmptyClientProfileFormValue(): ClientProfileFormValue {
  return {
    email: "",
    phone: "",
    rut: "",
    firstNames: "",
    lastNames: "",
    birthDate: "",
    age: "",
    currentIsapre: "",
    heightCm: "",
    weightKg: "",
    maritalStatus: "",
    address: "",
    commune: "",
    coverageArea: "",
    coverageRegionId: "",
    preferredClinicIds: [],
    anualidad: false,
    anualidadComment: "",
    segurosComplementarios: "",
    dependents: [],
    additionalTitulares: [],
  };
}

export interface ClientProfileFormProps {
  value: ClientProfileFormValue;
  onChange: (value: ClientProfileFormValue) => void;
  showEmail?: boolean;
  /** @deprecated RUT ya no es obligatorio; se mantiene por compatibilidad. */
  requireTitularRut?: boolean;
  rutErrors?: {
    titular?: string;
    dependents?: Record<string, string>;
    additionalTitulares?: Record<string, string>;
  };
}

export function ClientProfileForm({
  value,
  onChange,
  showEmail = true,
  requireTitularRut = false,
  rutErrors,
}: ClientProfileFormProps) {
  const [blurRutErrors, setBlurRutErrors] = useState<{
    titular?: string;
    dependents: Record<string, string>;
    additionalTitulares: Record<string, string>;
  }>({ dependents: {}, additionalTitulares: {} });
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [clinicsLoading, setClinicsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setClinicsLoading(true);
    void fetchClinics()
      .then((rows) => {
        if (!cancelled) {
          setClinics(
            [...rows].sort((a, b) => a.name.localeCompare(b.name, "es")),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setClinics([]);
      })
      .finally(() => {
        if (!cancelled) setClinicsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const titularRutError = rutErrors?.titular ?? blurRutErrors.titular;
  const titularRutIsSoftWarning = Boolean(
    titularRutError &&
      value.rut.trim() &&
      !isValidRut(value.rut) &&
      titularRutError !== "El RUT es obligatorio.",
  );

  function dependentRutError(dependentId: string): string | undefined {
    return (
      rutErrors?.dependents?.[dependentId] ??
      blurRutErrors.dependents[dependentId]
    );
  }

  function additionalTitularRutError(titularId: string): string | undefined {
    return (
      rutErrors?.additionalTitulares?.[titularId] ??
      blurRutErrors.additionalTitulares[titularId]
    );
  }

  function validateTitularRutOnBlur() {
    const errors = getClientManagementRutErrors(
      { rut: value.rut },
      { requireTitularRut },
    );
    const warnings = getClientManagementRutWarnings({ rut: value.rut });
    setBlurRutErrors((current) => ({
      ...current,
      titular: errors.titular ?? warnings.titular,
    }));
  }

  function validateDependentRutOnBlur(dependentId: string, rut: string) {
    const warnings = getClientManagementRutWarnings({
      dependents: [{ id: dependentId, rut }],
    });
    setBlurRutErrors((current) => {
      const dependents = { ...current.dependents };
      const message = warnings.dependents[dependentId];
      if (message) {
        dependents[dependentId] = message;
      } else {
        delete dependents[dependentId];
      }
      return { ...current, dependents };
    });
  }

  function validateAdditionalTitularRutOnBlur(titularId: string, rut: string) {
    const warnings = getClientManagementRutWarnings({
      additionalTitulares: [{ id: titularId, rut }],
    });
    setBlurRutErrors((current) => {
      const additionalTitulares = { ...current.additionalTitulares };
      const message = warnings.additionalTitulares[titularId];
      if (message) {
        additionalTitulares[titularId] = message;
      } else {
        delete additionalTitulares[titularId];
      }
      return { ...current, additionalTitulares };
    });
  }

  function updateField<K extends keyof ClientProfileFormValue>(
    field: K,
    fieldValue: ClientProfileFormValue[K],
  ) {
    if (field === "rut") {
      setBlurRutErrors((current) => ({ ...current, titular: undefined }));
    }
    onChange({ ...value, [field]: fieldValue });
  }

  function updateDependent(
    dependentId: string,
    field: keyof ClientDependentProfile,
    fieldValue: string,
  ) {
    if (field === "rut") {
      setBlurRutErrors((current) => {
        const dependents = { ...current.dependents };
        delete dependents[dependentId];
        return { ...current, dependents };
      });
    }
    onChange({
      ...value,
      dependents: value.dependents.map((dependent) => {
        if (dependent.id !== dependentId) return dependent;
        if (field === "birthDate") {
          return {
            ...dependent,
            birthDate: fieldValue,
            age: calculateAgeFromBirthDate(fieldValue),
          };
        }
        return { ...dependent, [field]: fieldValue };
      }),
    });
  }

  function updateAdditionalTitular(
    titularId: string,
    field: keyof ClientAdditionalTitularProfile,
    fieldValue: string,
  ) {
    if (field === "rut") {
      setBlurRutErrors((current) => {
        const additionalTitulares = { ...current.additionalTitulares };
        delete additionalTitulares[titularId];
        return { ...current, additionalTitulares };
      });
    }
    onChange({
      ...value,
      additionalTitulares: value.additionalTitulares.map((titular) => {
        if (titular.id !== titularId) return titular;
        if (field === "birthDate") {
          return {
            ...titular,
            birthDate: fieldValue,
            age: calculateAgeFromBirthDate(fieldValue),
          };
        }
        return { ...titular, [field]: fieldValue };
      }),
    });
  }

  function addDependent() {
    onChange({
      ...value,
      dependents: [...value.dependents, buildEmptyDependent()],
    });
  }

  function removeDependent(dependentId: string) {
    onChange({
      ...value,
      dependents: value.dependents.filter(
        (dependent) => dependent.id !== dependentId,
      ),
    });
  }

  function addAdditionalTitular() {
    onChange({
      ...value,
      additionalTitulares: [
        ...value.additionalTitulares,
        buildEmptyAdditionalTitular(),
      ],
    });
  }

  function removeAdditionalTitular(titularId: string) {
    onChange({
      ...value,
      additionalTitulares: value.additionalTitulares.filter(
        (titular) => titular.id !== titularId,
      ),
    });
  }

  function togglePreferredClinic(clinicId: string) {
    const selected = new Set(value.preferredClinicIds);
    if (selected.has(clinicId)) selected.delete(clinicId);
    else selected.add(clinicId);
    updateField("preferredClinicIds", Array.from(selected));
  }

  function updateCoverageRegion(regionId: string) {
    onChange({
      ...value,
      coverageRegionId: regionId,
      coverageArea: regionId ? "region" : "",
    });
  }

  function renderIsapreSelect(
    currentValue: string,
    onSelect: (next: string) => void,
  ) {
    const options =
      currentValue.trim() &&
      !COVERAGE_SELECT_OPTIONS.some((option) => option.value === currentValue)
        ? [
            { value: currentValue, label: currentValue },
            ...COVERAGE_SELECT_OPTIONS,
          ]
        : COVERAGE_SELECT_OPTIONS;

    return (
      <select
        value={currentValue}
        onChange={(event) => onSelect(event.target.value)}
        className={joinClasses("h-10 w-full rounded-md px-3 text-sm", ui.input)}
      >
        <option value="">Seleccionar…</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="space-y-6">
      <CollapsibleSection
        title="Datos de titulares"
        description="Puedes registrar el titular principal y agregar titulares adicionales del grupo familiar."
        className="rounded-xl border border-border bg-bg-layout/30 p-4"
        bodyClassName="space-y-4"
        headerRight={
          <Button
            type="button"
            variant="info"
            size="sm"
            onClick={addAdditionalTitular}
          >
            Agregar titular
          </Button>
        }
      >
        <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
            Titular 1 (principal)
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {showEmail ? (
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-xs font-medium">Correo electrónico</span>
                <Input
                  type="email"
                  value={value.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="cliente@gmail.com"
                />
              </label>
            ) : null}

            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Celular</span>
              <Input
                value={value.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                placeholder="+56912345678"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium">RUT titular</span>
              <Input
                value={value.rut}
                aria-invalid={
                  Boolean(titularRutError) && !titularRutIsSoftWarning
                }
                onChange={(event) =>
                  updateField("rut", sanitizeRutInput(event.target.value))
                }
                onBlur={validateTitularRutOnBlur}
                placeholder="12345678-9"
                className={
                  titularRutError
                    ? titularRutIsSoftWarning
                      ? "border-amber-400 focus-visible:ring-amber-300/40"
                      : "border-danger focus-visible:ring-danger/30"
                    : undefined
                }
              />
              {titularRutError ? (
                <p
                  className={
                    titularRutIsSoftWarning
                      ? "text-xs text-amber-800"
                      : "text-xs text-danger"
                  }
                >
                  {titularRutIsSoftWarning
                    ? `${titularRutError} Puedes guardar de todos modos.`
                    : titularRutError}
                </p>
              ) : null}
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Nombres *</span>
              <Input
                required
                value={value.firstNames}
                onChange={(event) =>
                  updateField("firstNames", event.target.value)
                }
                placeholder="María"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Apellidos</span>
              <Input
                value={value.lastNames}
                onChange={(event) =>
                  updateField("lastNames", event.target.value)
                }
                placeholder="Pérez González"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Fecha de nacimiento</span>
              <Input
                type="date"
                value={value.birthDate}
                onChange={(event) => {
                  const nextBirthDate = event.target.value;
                  onChange({
                    ...value,
                    birthDate: nextBirthDate,
                    age: calculateAgeFromBirthDate(nextBirthDate),
                  });
                }}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Edad</span>
              <Input
                inputMode="numeric"
                value={value.age}
                onChange={(event) =>
                  updateField(
                    "age",
                    event.target.value.replace(/[^\d]/g, "").slice(0, 3),
                  )
                }
                placeholder="Ej. 35"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Isapre / previsión actual</span>
              {renderIsapreSelect(value.currentIsapre, (next) =>
                updateField("currentIsapre", next),
              )}
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Estatura (cm)</span>
              <Input
                value={value.heightCm}
                onChange={(event) =>
                  updateField("heightCm", event.target.value)
                }
                placeholder="170"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Peso (kg)</span>
              <Input
                value={value.weightKg}
                onChange={(event) =>
                  updateField("weightKg", event.target.value)
                }
                placeholder="70"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Estado civil legal</span>
              <select
                value={value.maritalStatus}
                onChange={(event) =>
                  updateField("maritalStatus", event.target.value)
                }
                className={joinClasses(
                  "h-11 w-full rounded-xl px-3 text-sm",
                  ui.input,
                )}
              >
                <option value="">Seleccionar…</option>
                {MARITAL_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-xs font-medium">Dirección particular</span>
              <Input
                value={value.address}
                onChange={(event) => updateField("address", event.target.value)}
                placeholder="Calle, número, depto."
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Comuna</span>
              <Input
                value={value.commune}
                onChange={(event) => updateField("commune", event.target.value)}
                placeholder="Ej. Las Condes"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Región</span>
              <select
                value={value.coverageRegionId}
                onChange={(event) => updateCoverageRegion(event.target.value)}
                className={joinClasses(
                  "h-10 w-full rounded-md px-3 text-sm",
                  ui.input,
                )}
              >
                <option value="">Seleccionar región…</option>
                {CLIENT_REGION_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="space-y-2 sm:col-span-2">
              <legend className="text-xs font-medium text-foreground">
                Clínicas de preferencia
              </legend>
              <p className="text-[11px] text-muted">
                Opcional. Puedes marcar una o varias clínicas preferidas del
                beneficiario.
              </p>
              {clinicsLoading ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted">
                  Cargando clínicas…
                </p>
              ) : clinics.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted">
                  No hay clínicas disponibles para seleccionar.
                </p>
              ) : (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border bg-white p-2">
                  {clinics.map((clinic) => {
                    const checked = value.preferredClinicIds.includes(clinic.id);
                    return (
                      <label
                        key={clinic.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-hover"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePreferredClinic(clinic.id)}
                        />
                        <span className="min-w-0 truncate">{clinic.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              {value.preferredClinicIds.length > 0 ? (
                <p className="text-[11px] text-muted">
                  {value.preferredClinicIds.length} clínica
                  {value.preferredClinicIds.length === 1 ? "" : "s"} seleccionada
                  {value.preferredClinicIds.length === 1 ? "" : "s"}.
                </p>
              ) : null}
            </fieldset>

            <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-end">
              <label className="flex h-10 shrink-0 cursor-pointer items-center gap-2 text-sm sm:pb-0">
                <input
                  type="checkbox"
                  checked={value.anualidad}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      anualidad: event.target.checked,
                      anualidadComment: event.target.checked
                        ? ""
                        : value.anualidadComment,
                    })
                  }
                />
                <span className="font-medium">Anualidad</span>
              </label>
              {!value.anualidad ? (
                <label className="min-w-0 flex-1 space-y-1.5">
                  <span className="text-xs font-medium">
                    Comentario (sin anualidad)
                  </span>
                  <Input
                    value={value.anualidadComment}
                    onChange={(event) =>
                      updateField("anualidadComment", event.target.value)
                    }
                    placeholder="Agregar comentario…"
                  />
                </label>
              ) : null}
            </div>

            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-xs font-medium">Seguros complementarios</span>
              <Input
                value={value.segurosComplementarios}
                onChange={(event) =>
                  updateField("segurosComplementarios", event.target.value)
                }
                placeholder="Ej. dental, catastrófico…"
              />
            </label>
          </div>
        </div>

        {value.additionalTitulares.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted">
            Sin titulares adicionales. Usa &quot;Agregar titular&quot; si el
            grupo familiar tiene 2 o más titulares.
          </p>
        ) : (
          <div className="space-y-3">
            {value.additionalTitulares.map((titular, index) => (
              <div
                key={titular.id}
                className="rounded-xl border border-border bg-white p-3 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Titular {index + 2}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAdditionalTitular(titular.id)}
                  >
                    Quitar
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium">Nombres *</span>
                    <Input
                      required
                      value={titular.firstNames}
                      onChange={(event) =>
                        updateAdditionalTitular(
                          titular.id,
                          "firstNames",
                          event.target.value,
                        )
                      }
                      placeholder="Juan"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium">Apellidos</span>
                    <Input
                      value={titular.lastNames}
                      onChange={(event) =>
                        updateAdditionalTitular(
                          titular.id,
                          "lastNames",
                          event.target.value,
                        )
                      }
                      placeholder="Pérez González"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium">RUT</span>
                    <Input
                      value={titular.rut}
                      onChange={(event) =>
                        updateAdditionalTitular(
                          titular.id,
                          "rut",
                          sanitizeRutInput(event.target.value),
                        )
                      }
                      onBlur={() =>
                        validateAdditionalTitularRutOnBlur(
                          titular.id,
                          titular.rut,
                        )
                      }
                      placeholder="12345678-9"
                      className={
                        additionalTitularRutError(titular.id)
                          ? "border-amber-400 focus-visible:ring-amber-300/40"
                          : undefined
                      }
                    />
                    {additionalTitularRutError(titular.id) ? (
                      <p className="text-xs text-amber-800">
                        {additionalTitularRutError(titular.id)} Puedes guardar
                        de todos modos.
                      </p>
                    ) : null}
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium">Celular</span>
                    <Input
                      value={titular.phone}
                      onChange={(event) =>
                        updateAdditionalTitular(
                          titular.id,
                          "phone",
                          event.target.value,
                        )
                      }
                      placeholder="+56912345678"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium">
                      Fecha de nacimiento
                    </span>
                    <Input
                      type="date"
                      value={titular.birthDate}
                      onChange={(event) =>
                        updateAdditionalTitular(
                          titular.id,
                          "birthDate",
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium">Edad</span>
                    <Input
                      inputMode="numeric"
                      value={titular.age}
                      onChange={(event) =>
                        updateAdditionalTitular(
                          titular.id,
                          "age",
                          event.target.value.replace(/[^\d]/g, "").slice(0, 3),
                        )
                      }
                      placeholder="Ej. 35"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium">
                      Isapre / previsión actual
                    </span>
                    {renderIsapreSelect(titular.currentIsapre, (next) =>
                      updateAdditionalTitular(
                        titular.id,
                        "currentIsapre",
                        next,
                      ),
                    )}
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium">Estatura (cm)</span>
                    <Input
                      value={titular.heightCm}
                      onChange={(event) =>
                        updateAdditionalTitular(
                          titular.id,
                          "heightCm",
                          event.target.value,
                        )
                      }
                      placeholder="170"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium">Peso (kg)</span>
                    <Input
                      value={titular.weightKg}
                      onChange={(event) =>
                        updateAdditionalTitular(
                          titular.id,
                          "weightKg",
                          event.target.value,
                        )
                      }
                      placeholder="70"
                    />
                  </label>

                  <label className="block space-y-1.5 sm:col-span-2">
                    <span className="text-xs font-medium">
                      Estado civil legal
                    </span>
                    <select
                      value={titular.maritalStatus}
                      onChange={(event) =>
                        updateAdditionalTitular(
                          titular.id,
                          "maritalStatus",
                          event.target.value,
                        )
                      }
                      className={joinClasses(
                        "h-11 w-full rounded-xl px-3 text-sm",
                        ui.input,
                      )}
                    >
                      <option value="">Seleccionar…</option>
                      {MARITAL_STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Cargas familiares"
        description="Agrega cada carga con sus datos básicos."
        className="rounded-xl border border-border bg-bg-layout/30 p-4"
        bodyClassName="space-y-4"
        headerRight={
          <Button type="button" variant="info" size="sm" onClick={addDependent}>
            Agregar carga
          </Button>
        }
      >
        {value.dependents.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted">
            Sin cargas registradas. Usa &quot;Agregar carga&quot; si el cliente
            tiene dependientes.
          </p>
        ) : (
          <div className="space-y-3">
            {value.dependents.map((dependent, index) => (
              <div
                key={dependent.id}
                className="rounded-xl border border-border bg-white p-3 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Carga {index + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDependent(dependent.id)}
                  >
                    Quitar
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium">RUT carga</span>
                    <Input
                      value={dependent.rut}
                      aria-invalid={false}
                      onChange={(event) =>
                        updateDependent(
                          dependent.id,
                          "rut",
                          sanitizeRutInput(event.target.value),
                        )
                      }
                      onBlur={() =>
                        validateDependentRutOnBlur(dependent.id, dependent.rut)
                      }
                      placeholder="12345678-9"
                      className={
                        dependentRutError(dependent.id)
                          ? "border-amber-400 focus-visible:ring-amber-300/40"
                          : undefined
                      }
                    />
                    {dependentRutError(dependent.id) ? (
                      <p className="text-xs text-amber-800">
                        {dependentRutError(dependent.id)} Puedes guardar de
                        todos modos.
                      </p>
                    ) : null}
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium">
                      Fecha de nacimiento
                    </span>
                    <Input
                      type="date"
                      value={dependent.birthDate}
                      onChange={(event) =>
                        updateDependent(
                          dependent.id,
                          "birthDate",
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium">Edad</span>
                    <Input
                      inputMode="numeric"
                      value={dependent.age}
                      onChange={(event) =>
                        updateDependent(
                          dependent.id,
                          "age",
                          event.target.value.replace(/[^\d]/g, "").slice(0, 3),
                        )
                      }
                      placeholder="Ej. 12"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium">Estatura (cm)</span>
                    <Input
                      value={dependent.heightCm}
                      onChange={(event) =>
                        updateDependent(
                          dependent.id,
                          "heightCm",
                          event.target.value,
                        )
                      }
                      placeholder="120"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium">Peso (kg)</span>
                    <Input
                      value={dependent.weightKg}
                      onChange={(event) =>
                        updateDependent(
                          dependent.id,
                          "weightKg",
                          event.target.value,
                        )
                      }
                      placeholder="25"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}

export function userRecordToProfileFormValue(
  user?: {
    email?: string;
    phone?: string | null;
    rut?: string | null;
    fullName?: string;
    clientProfile?: {
      firstNames?: string;
      lastNames?: string;
      birthDate?: string;
      age?: string;
      currentIsapre?: string;
      heightCm?: string;
      weightKg?: string;
      maritalStatus?: string;
      address?: string;
      commune?: string;
      coverageArea?: ClientCoverageArea;
      coverageRegionId?: string;
      preferredClinicIds?: string[];
      anualidad?: boolean;
      anualidadComment?: string;
      segurosComplementarios?: string;
      dependents?: ClientDependentProfile[];
      additionalTitulares?: ClientAdditionalTitularProfile[];
    };
  } | null,
): ClientProfileFormValue {
  const profile = user?.clientProfile;
  const fromName = splitFullName(user?.fullName);
  const email = user?.email ?? "";
  const isPlaceholderEmail = email.includes("@clientes.isaprespremium.local");
  return {
    email: isPlaceholderEmail ? "" : email,
    phone: user?.phone ?? "",
    rut: user?.rut ?? "",
    firstNames: profile?.firstNames || fromName.firstNames,
    lastNames: profile?.lastNames || fromName.lastNames,
    birthDate: profile?.birthDate ?? "",
    age:
      profile?.age ??
      (profile?.birthDate
        ? calculateAgeFromBirthDate(profile.birthDate)
        : ""),
    currentIsapre: profile?.currentIsapre ?? "",
    heightCm: profile?.heightCm ?? "",
    weightKg: profile?.weightKg ?? "",
    maritalStatus: profile?.maritalStatus ?? "",
    address: profile?.address ?? "",
    commune: profile?.commune ?? "",
    coverageArea: profile?.coverageArea ?? "",
    coverageRegionId: profile?.coverageRegionId ?? "",
    preferredClinicIds: profile?.preferredClinicIds ?? [],
    anualidad: profile?.anualidad === true,
    anualidadComment: profile?.anualidadComment ?? "",
    segurosComplementarios: profile?.segurosComplementarios ?? "",
    dependents: profile?.dependents ?? [],
    additionalTitulares: profile?.additionalTitulares ?? [],
  };
}
