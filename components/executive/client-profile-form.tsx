"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CollapsibleSection } from "@/components/executive/collapsible-section";
import {
  buildEmptyDependent,
  MARITAL_STATUS_OPTIONS,
  splitFullName,
} from "@/lib/client-profile/constants";
import { sanitizeRutInput, isValidRut } from "@/lib/auth/rut";
import {
  getClientManagementRutErrors,
  getClientManagementRutWarnings,
} from "@/lib/client-profile/validate-client-ruts";
import { ISAPRE_FILTER_OPTIONS } from "@/lib/filter-options";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { ClientDependentProfile } from "@/types/client-profile";

const ISAPRE_SELECT_OPTIONS = ISAPRE_FILTER_OPTIONS.map((option) => ({
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
  currentIsapre: string;
  heightCm: string;
  weightKg: string;
  maritalStatus: string;
  address: string;
  commune: string;
  dependents: ClientDependentProfile[];
}

export function buildEmptyClientProfileFormValue(): ClientProfileFormValue {
  return {
    email: "",
    phone: "",
    rut: "",
    firstNames: "",
    lastNames: "",
    birthDate: "",
    currentIsapre: "",
    heightCm: "",
    weightKg: "",
    maritalStatus: "",
    address: "",
    commune: "",
    dependents: [],
  };
}

export interface ClientProfileFormProps {
  value: ClientProfileFormValue;
  onChange: (value: ClientProfileFormValue) => void;
  showEmail?: boolean;
  /** Al crear cliente el RUT titular es obligatorio. */
  requireTitularRut?: boolean;
  rutErrors?: {
    titular?: string;
    dependents?: Record<string, string>;
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
  }>({ dependents: {} });

  const isapreOptions = useMemo(() => {
    const current = value.currentIsapre.trim();
    if (
      current &&
      !ISAPRE_SELECT_OPTIONS.some((option) => option.value === current)
    ) {
      return [{ value: current, label: current }, ...ISAPRE_SELECT_OPTIONS];
    }
    return ISAPRE_SELECT_OPTIONS;
  }, [value.currentIsapre]);

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
      dependents: value.dependents.map((dependent) =>
        dependent.id === dependentId
          ? { ...dependent, [field]: fieldValue }
          : dependent,
      ),
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

  return (
    <div className="space-y-6">
      <CollapsibleSection
        title="Datos del titular"
        description="Información personal y de contacto que el ejecutivo registra para la gestión."
        className="rounded-xl border border-border bg-bg-layout/30 p-4"
        bodyClassName="space-y-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {showEmail ? (
            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-xs font-medium">Correo electrónico *</span>
              <Input
                type="email"
                required
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
            <span className="text-xs font-medium">
              RUT titular{requireTitularRut ? " *" : ""}
            </span>
            <Input
              value={value.rut}
              required={requireTitularRut}
              aria-invalid={Boolean(titularRutError) && !titularRutIsSoftWarning}
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
              onChange={(event) => updateField("firstNames", event.target.value)}
              placeholder="María"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium">Apellidos *</span>
            <Input
              required
              value={value.lastNames}
              onChange={(event) => updateField("lastNames", event.target.value)}
              placeholder="Pérez González"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium">Fecha de nacimiento</span>
            <Input
              type="date"
              value={value.birthDate}
              onChange={(event) => updateField("birthDate", event.target.value)}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium">Isapre actual</span>
            <select
              value={value.currentIsapre}
              onChange={(event) =>
                updateField("currentIsapre", event.target.value)
              }
              className={joinClasses("h-10 w-full rounded-md px-3 text-sm", ui.input)}
            >
              <option value="">Seleccionar…</option>
              {isapreOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium">Estatura (cm)</span>
            <Input
              value={value.heightCm}
              onChange={(event) => updateField("heightCm", event.target.value)}
              placeholder="170"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium">Peso (kg)</span>
            <Input
              value={value.weightKg}
              onChange={(event) => updateField("weightKg", event.target.value)}
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
              className={joinClasses("h-11 w-full rounded-xl px-3 text-sm", ui.input)}
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
        </div>
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
            Sin cargas registradas. Usa &quot;Agregar carga&quot; si el cliente tiene
            dependientes.
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
                        {dependentRutError(dependent.id)} Puedes guardar de todos
                        modos.
                      </p>
                    ) : null}
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium">Fecha de nacimiento</span>
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
      currentIsapre?: string;
      heightCm?: string;
      weightKg?: string;
      maritalStatus?: string;
      address?: string;
      commune?: string;
      dependents?: ClientDependentProfile[];
    };
  } | null,
): ClientProfileFormValue {
  const profile = user?.clientProfile;
  const fromName = splitFullName(user?.fullName);
  return {
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    rut: user?.rut ?? "",
    firstNames: profile?.firstNames || fromName.firstNames,
    lastNames: profile?.lastNames || fromName.lastNames,
    birthDate: profile?.birthDate ?? "",
    currentIsapre: profile?.currentIsapre ?? "",
    heightCm: profile?.heightCm ?? "",
    weightKg: profile?.weightKg ?? "",
    maritalStatus: profile?.maritalStatus ?? "",
    address: profile?.address ?? "",
    commune: profile?.commune ?? "",
    dependents: profile?.dependents ?? [],
  };
}
