"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CollapsibleSection } from "@/components/executive/collapsible-section";
import {
  buildEmptyAdditionalTitular,
  buildEmptyDependent,
  calculateAgeFromBirthDate,
  CLIENT_MOTIVO_COTIZACION_OPTIONS,
  CLIENT_REGION_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  motivoCotizacionIncludes,
  motivoCotizacionIncludesOtros,
  resolveClientMoneyCurrency,
  splitFullName,
  toggleMotivoCotizacionId,
} from "@/lib/client-profile/constants";
import { sanitizeRutInput, isValidRut } from "@/lib/auth/rut";
import {
  getClientManagementRutErrors,
  getClientManagementRutWarnings,
} from "@/lib/client-profile/validate-client-ruts";
import { CURRENT_COVERAGE_OPTIONS } from "@/lib/filter-options";
import {
  resolveCurrentCoverageId,
  resolveTitularCurrentCoverageId,
} from "@/lib/client-profile/current-coverage";
import {
  CONTRIBUTOR_TYPE_OPTIONS,
  resolveContributorType,
} from "@/lib/quote-criteria-options";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type {
  ClientAdditionalTitularProfile,
  ClientCoverageArea,
  ClientDependentProfile,
  ClientMoneyCurrency,
} from "@/types/client-profile";
import type {
  CompanyAgreementLookupResult,
  CompanyAgreementRecord,
} from "@/types/company-agreement";

const COVERAGE_SELECT_OPTIONS = CURRENT_COVERAGE_OPTIONS.map((option) => ({
  value: option.label,
  label: option.label,
}));

const FORM_LABEL_CLASS =
  "text-xs font-medium text-[color:var(--dash-navy,#092558)]";
const FORM_SECTION_TITLE_CLASS =
  "text-xs font-semibold uppercase tracking-wide text-[color:var(--dash-navy,#092558)]";

type EmployerAgreementStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "invalid" }
  | { kind: "none" }
  | { kind: "match"; agreement: CompanyAgreementRecord }
  | { kind: "error" };

function formatDiscountLabel(value: number | null): string | null {
  if (value == null) return null;
  const formatted = Number.isInteger(value)
    ? String(value)
    : value.toLocaleString("es-CL", { maximumFractionDigits: 2 });
  return `${formatted}%`;
}

function EmployerRutField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [status, setStatus] = useState<EmployerAgreementStatus>({
    kind: "idle",
  });

  useEffect(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      setStatus({ kind: "idle" });
      return;
    }

    if (!isValidRut(trimmed)) {
      setStatus({ kind: "invalid" });
      return;
    }

    let cancelled = false;
    setStatus({ kind: "checking" });
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams({ rut: trimmed });
          const response = await fetch(
            `/api/company-agreements/lookup?${params}`,
          );
          const payload = (await response.json().catch(() => null)) as
            | (CompanyAgreementLookupResult & { error?: string })
            | null;

          if (cancelled) return;

          if (!response.ok) {
            setStatus({ kind: "error" });
            return;
          }

          const match = payload?.matches[0] ?? null;
          if (match) {
            setStatus({ kind: "match", agreement: match });
          } else {
            setStatus({ kind: "none" });
          }
        } catch {
          if (!cancelled) setStatus({ kind: "error" });
        }
      })();
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value]);

  const discount = status.kind === "match"
    ? formatDiscountLabel(status.agreement.discountPercent)
    : null;

  return (
    <label className="block space-y-1.5">
      <span
        className={joinClasses(
          "flex flex-wrap items-center gap-2",
          FORM_LABEL_CLASS,
        )}
      >
        RUT empleador
        {status.kind === "checking" ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            Verificando…
          </span>
        ) : null}
        {status.kind === "match" ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
            En convenio
            {discount ? ` · ${discount}` : ""}
          </span>
        ) : null}
        {status.kind === "none" ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
            Sin convenio
          </span>
        ) : null}
        {status.kind === "invalid" ? (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-800">
            RUT inválido
          </span>
        ) : null}
        {status.kind === "error" ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            No se pudo verificar
          </span>
        ) : null}
      </span>
      <Input
        value={value}
        onChange={(event) => onChange(sanitizeRutInput(event.target.value))}
        placeholder="76.XXX.XXX-X"
      />
      {status.kind === "match" ? (
        <p className="text-[11px] text-emerald-800">
          {status.agreement.companyName.trim() || "Empresa con convenio"}
          {status.agreement.isapreName?.trim()
            ? ` · ${status.agreement.isapreName.trim()}`
            : ""}
        </p>
      ) : null}
      {status.kind === "none" ? (
        <p className="text-[11px] text-muted">
          Este RUT no aparece en el catálogo de convenios activos.
        </p>
      ) : null}
    </label>
  );
}

function CurrencyAmountField({
  label,
  amount,
  currency,
  onAmountChange,
  onCurrencyChange,
  placeholderUf = "Ej. 4,5",
  placeholderClp = "Ej. 180000",
}: {
  label: string;
  amount: string;
  currency: ClientMoneyCurrency;
  onAmountChange: (value: string) => void;
  onCurrencyChange: (value: ClientMoneyCurrency) => void;
  placeholderUf?: string;
  placeholderClp?: string;
}) {
  const nextCurrency: ClientMoneyCurrency = currency === "UF" ? "CLP" : "UF";

  return (
    <label className="block space-y-1.5">
      <span className={FORM_LABEL_CLASS}>{label}</span>
      <div className="flex gap-2">
        <Input
          value={amount}
          onChange={(event) => onAmountChange(event.target.value)}
          placeholder={currency === "UF" ? placeholderUf : placeholderClp}
          inputMode="decimal"
          className="min-w-0 flex-1"
        />
        <button
          type="button"
          onClick={() => onCurrencyChange(nextCurrency)}
          className={joinClasses(
            "inline-flex h-10 shrink-0 items-center justify-center rounded-md border px-3 text-xs font-semibold tracking-wide transition",
            currency === "UF"
              ? "border-primary/30 bg-primary/10 text-primary-dark hover:bg-primary/15"
              : "border-secondary/30 bg-secondary-muted/50 text-secondary hover:bg-secondary-muted",
          )}
          title={`Moneda: ${currency}. Clic para cambiar a ${nextCurrency}.`}
          aria-label={`Moneda ${currency}. Cambiar a ${nextCurrency}`}
        >
          {currency === "UF" ? "UF" : "$"}
        </button>
      </div>
      <p className="text-[11px] text-muted">
        Monto en {currency === "UF" ? "UF" : "pesos chilenos (CLP)"}.
      </p>
    </label>
  );
}

export interface ClientProfileFormValue {
  email: string;
  phone: string;
  rut: string;
  firstNames: string;
  lastNames: string;
  birthDate: string;
  age: string;
  currentIsapre: string;
  currentPlanPrice: string;
  currentPlanPriceCurrency: ClientMoneyCurrency;
  voluntaryAdditional: string;
  voluntaryAdditionalCurrency: ClientMoneyCurrency;
  heightCm: string;
  weightKg: string;
  maritalStatus: string;
  employerRut: string;
  contributorType: string;
  rentaImponible: string;
  motivoCotizacion: string;
  motivoCotizacionOther: string;
  address: string;
  commune: string;
  coverageArea: ClientCoverageArea;
  coverageRegionId: string;
  preferredClinics: string;
  anualidad: boolean;
  anualidadComment: string;
  segurosComplementarios: string;
  preexistenciasMedicas: string;
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
    currentPlanPrice: "",
    currentPlanPriceCurrency: "UF",
    voluntaryAdditional: "",
    voluntaryAdditionalCurrency: "UF",
    heightCm: "",
    weightKg: "",
    maritalStatus: "",
    employerRut: "",
    contributorType: "",
    rentaImponible: "",
    motivoCotizacion: "",
    motivoCotizacionOther: "",
    address: "",
    commune: "",
    coverageArea: "",
    coverageRegionId: "",
    preferredClinics: "",
    anualidad: false,
    anualidadComment: "",
    segurosComplementarios: "",
    preexistenciasMedicas: "",
    dependents: [],
    additionalTitulares: [],
  };
}

export type ClientProfileFormSection =
  | "employer"
  | "prevision"
  | "titulares"
  | "cargas"
  /** Solo titular principal (sin titulares adicionales ni cargas). */
  | "principal"
  /** Seguro, clínicas y preexistencias. */
  | "complementaria";

export interface ClientProfileFormProps {
  value: ClientProfileFormValue;
  onChange: (value: ClientProfileFormValue) => void;
  showEmail?: boolean;
  /** Solo lectura: todos los roles pueden ver; edición según permiso del drawer. */
  readOnly?: boolean;
  /** @deprecated RUT ya no es obligatorio; se mantiene por compatibilidad. */
  requireTitularRut?: boolean;
  rutErrors?: {
    titular?: string;
    dependents?: Record<string, string>;
    additionalTitulares?: Record<string, string>;
  };
  /**
   * Si se omite, se muestra el formulario completo (comportamiento actual).
   * Con valor, solo las secciones pedidas (empleador aparte de titulares).
   * `principal` = solo titular 1, sin “Agregar titular” ni cargas.
   */
  sections?: ClientProfileFormSection[];
  /** Al montar / cambiar, agrega titular o carga una vez. */
  autoAdd?: "titular" | "carga" | null;
  onAutoAddConsumed?: () => void;
}

export function ClientProfileForm({
  value,
  onChange,
  showEmail = true,
  readOnly = false,
  requireTitularRut = false,
  rutErrors,
  sections,
  autoAdd = null,
  onAutoAddConsumed,
}: ClientProfileFormProps) {
  const showAllSections = !sections;
  const showEmployerBlock =
    showAllSections === false && Boolean(sections?.includes("employer"));
  const showPrevisionBlock =
    showAllSections === false && Boolean(sections?.includes("prevision"));
  const showComplementariaBlock =
    showAllSections === false &&
    Boolean(sections?.includes("complementaria"));
  const showTitulares =
    showAllSections ||
    Boolean(sections?.includes("titulares")) ||
    Boolean(sections?.includes("principal"));
  const showAdditionalTitulares =
    showAllSections || Boolean(sections?.includes("titulares"));
  const showCargas = showAllSections || Boolean(sections?.includes("cargas"));
  /** En formulario completo el empleador vive dentro de titulares. */
  const showEmployerInline = showAllSections;
  /**
   * Modal «Información personal» (`principal`): solo datos del titular.
   * Plan / complemento / motivo viven en sus propias cápsulas.
   */
  const isPersonalOnly =
    Boolean(sections?.includes("principal")) &&
    !showAllSections &&
    !showAdditionalTitulares;

  const [blurRutErrors, setBlurRutErrors] = useState<{
    titular?: string;
    dependents: Record<string, string>;
    additionalTitulares: Record<string, string>;
  }>({ dependents: {}, additionalTitulares: {} });
  const autoAddConsumedRef = useRef<"titular" | "carga" | null>(null);

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
        if (field === "motivoCotizacion") {
          return {
            ...titular,
            motivoCotizacion: fieldValue,
            motivoCotizacionOther: motivoCotizacionIncludesOtros(fieldValue)
              ? titular.motivoCotizacionOther
              : "",
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

  useEffect(() => {
    if (!autoAdd || readOnly) {
      if (!autoAdd) autoAddConsumedRef.current = null;
      return;
    }
    if (autoAddConsumedRef.current === autoAdd) return;
    autoAddConsumedRef.current = autoAdd;
    if (autoAdd === "titular") {
      onChange({
        ...value,
        additionalTitulares: [
          ...value.additionalTitulares,
          buildEmptyAdditionalTitular(),
        ],
      });
    } else {
      onChange({
        ...value,
        dependents: [...value.dependents, buildEmptyDependent()],
      });
    }
    onAutoAddConsumed?.();
    // Solo al cambiar autoAdd / permiso de edición.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- evita re-disparar al editar el form
  }, [autoAdd, readOnly]);

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

    const selectValue = resolveCurrentCoverageId(currentValue) || currentValue;

    return (
      <select
        value={selectValue}
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
    <fieldset
      disabled={readOnly}
      className={joinClasses(
        "premium-client-form min-w-0 space-y-6 border-0 p-0",
        readOnly ? "opacity-95" : undefined,
      )}
    >
      {readOnly ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-950">
          Datos del cliente en solo lectura. Estás en seguimiento; el ejecutivo
          asignado puede editarlos.
        </p>
      ) : null}

      {showEmployerBlock ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5 sm:col-span-2">
              <span className={FORM_LABEL_CLASS}>Calidad de cliente</span>
              <select
                value={resolveContributorType(value.contributorType)}
                onChange={(event) =>
                  updateField("contributorType", event.target.value)
                }
                className={joinClasses("h-10 w-full rounded-md px-3 text-sm", ui.input)}
              >
                <option value="">Selecciona…</option>
                {CONTRIBUTOR_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <EmployerRutField
              value={value.employerRut}
              onChange={(next) => updateField("employerRut", next)}
            />
            <label className="block space-y-1.5">
              <span className={FORM_LABEL_CLASS}>Renta imponible</span>
              <Input
                value={value.rentaImponible}
                onChange={(event) =>
                  updateField("rentaImponible", event.target.value)
                }
                placeholder="Ej. 1500000"
              />
            </label>
          </div>
        </div>
      ) : null}

      {showPrevisionBlock ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5 sm:col-span-2">
              <span className={FORM_LABEL_CLASS}>Isapre actual</span>
              {renderIsapreSelect(value.currentIsapre, (next) =>
                updateField("currentIsapre", next),
              )}
            </label>
            <CurrencyAmountField
              label="Valor plan"
              amount={value.currentPlanPrice}
              currency={value.currentPlanPriceCurrency}
              onAmountChange={(next) => updateField("currentPlanPrice", next)}
              onCurrencyChange={(next) =>
                updateField("currentPlanPriceCurrency", next)
              }
            />
            <CurrencyAmountField
              label="Adicional voluntario"
              amount={value.voluntaryAdditional}
              currency={value.voluntaryAdditionalCurrency}
              onAmountChange={(next) =>
                updateField("voluntaryAdditional", next)
              }
              onCurrencyChange={(next) =>
                updateField("voluntaryAdditionalCurrency", next)
              }
            />
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
                <span className="font-medium text-[color:var(--dash-navy,#092558)]">
                  Anualidad
                </span>
              </label>
              {!value.anualidad ? (
                <label className="min-w-0 flex-1 space-y-1.5">
                  <span className={FORM_LABEL_CLASS}>
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
          </div>
        </div>
      ) : null}

      {showComplementariaBlock ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5 sm:col-span-2">
              <span className={FORM_LABEL_CLASS}>Seguro complementario</span>
              <Input
                value={value.segurosComplementarios}
                onChange={(event) =>
                  updateField("segurosComplementarios", event.target.value)
                }
                placeholder="Ej. dental, catastrófico…"
              />
            </label>
            <label className="block space-y-1.5 sm:col-span-2">
              <span className={FORM_LABEL_CLASS}>Clínicas de preferencia</span>
              <Input
                value={value.preferredClinics}
                onChange={(event) =>
                  updateField("preferredClinics", event.target.value)
                }
                placeholder="Ej. Clínica Alemana, RedSalud…"
              />
            </label>
            <label className="block space-y-1.5 sm:col-span-2">
              <span className={FORM_LABEL_CLASS}>Preexistencias</span>
              <Input
                value={value.preexistenciasMedicas}
                onChange={(event) =>
                  updateField("preexistenciasMedicas", event.target.value)
                }
                placeholder="Ej. hipertensión, diabetes…"
              />
            </label>
          </div>
        </div>
      ) : null}

      {showTitulares ? (
      <CollapsibleSection
        title={showAdditionalTitulares ? "Datos de titulares" : "Datos del titular"}
        description={
          showAllSections
            ? "Puedes registrar el titular principal y agregar titulares adicionales del grupo familiar."
            : undefined
        }
        className="space-y-0"
        hideIntro={!showAllSections}
        bodyClassName="space-y-4"
        headerRight={
          readOnly || !showAdditionalTitulares ? undefined : (
          <Button
            type="button"
            variant="info"
            size="sm"
            onClick={addAdditionalTitular}
          >
            Agregar titular
          </Button>
          )
        }
      >
        <div>
          <p className={joinClasses("mb-3", FORM_SECTION_TITLE_CLASS)}>
            Titular 1 (principal)
          </p>
          {/* Orden alineado a ClientProtocoloFlowView: personales → laboral → plan → motivo */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className={FORM_LABEL_CLASS}>Nombres *</span>
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
              <span className={FORM_LABEL_CLASS}>Apellidos</span>
              <Input
                value={value.lastNames}
                onChange={(event) =>
                  updateField("lastNames", event.target.value)
                }
                placeholder="Pérez González"
              />
            </label>

            <label className="block space-y-1.5">
              <span className={FORM_LABEL_CLASS}>RUT</span>
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
              <span className={FORM_LABEL_CLASS}>Edad</span>
              <Input
                value={value.age}
                onChange={(event) => updateField("age", event.target.value)}
                placeholder="Ej. 37"
              />
            </label>

            <label className="block space-y-1.5">
              <span className={FORM_LABEL_CLASS}>Teléfono</span>
              <Input
                value={value.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                placeholder="+56912345678"
              />
            </label>

            {showEmail ? (
              <label className="block space-y-1.5">
                <span className={FORM_LABEL_CLASS}>Email</span>
                <Input
                  type="email"
                  value={value.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="cliente@gmail.com"
                />
              </label>
            ) : null}

            <label className="block space-y-1.5">
              <span className={FORM_LABEL_CLASS}>Fecha de nacimiento</span>
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
              <span className={FORM_LABEL_CLASS}>Estado civil legal</span>
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

            <label className="block space-y-1.5">
              <span className={FORM_LABEL_CLASS}>Estatura (cm)</span>
              <Input
                value={value.heightCm}
                onChange={(event) =>
                  updateField("heightCm", event.target.value)
                }
                placeholder="170"
              />
            </label>

            <label className="block space-y-1.5">
              <span className={FORM_LABEL_CLASS}>Peso (kg)</span>
              <Input
                value={value.weightKg}
                onChange={(event) =>
                  updateField("weightKg", event.target.value)
                }
                placeholder="70"
              />
            </label>

            {showEmployerInline ? (
              <>
                <EmployerRutField
                  value={value.employerRut}
                  onChange={(next) => updateField("employerRut", next)}
                />
                <label className="block space-y-1.5">
                  <span className={FORM_LABEL_CLASS}>Renta imponible</span>
                  <Input
                    value={value.rentaImponible}
                    onChange={(event) =>
                      updateField("rentaImponible", event.target.value)
                    }
                    placeholder="Ej. 1500000"
                  />
                </label>
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className={FORM_LABEL_CLASS}>Calidad de cliente</span>
                  <select
                    value={resolveContributorType(value.contributorType)}
                    onChange={(event) =>
                      updateField("contributorType", event.target.value)
                    }
                    className={joinClasses(
                      "h-11 w-full rounded-xl px-3 text-sm",
                      ui.input,
                    )}
                  >
                    <option value="">Selecciona…</option>
                    {CONTRIBUTOR_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}

            {!isPersonalOnly ? (
              <>
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className={FORM_LABEL_CLASS}>Isapre actual</span>
                  {renderIsapreSelect(value.currentIsapre, (next) =>
                    updateField("currentIsapre", next),
                  )}
                </label>

                <CurrencyAmountField
                  label="Valor plan"
                  amount={value.currentPlanPrice}
                  currency={value.currentPlanPriceCurrency}
                  onAmountChange={(next) =>
                    updateField("currentPlanPrice", next)
                  }
                  onCurrencyChange={(next) =>
                    updateField("currentPlanPriceCurrency", next)
                  }
                />

                <CurrencyAmountField
                  label="Adicional voluntario"
                  amount={value.voluntaryAdditional}
                  currency={value.voluntaryAdditionalCurrency}
                  onAmountChange={(next) =>
                    updateField("voluntaryAdditional", next)
                  }
                  onCurrencyChange={(next) =>
                    updateField("voluntaryAdditionalCurrency", next)
                  }
                />

                <label className="block space-y-1.5 sm:col-span-2">
                  <span className={FORM_LABEL_CLASS}>
                    Seguro complementario
                  </span>
                  <Input
                    value={value.segurosComplementarios}
                    onChange={(event) =>
                      updateField("segurosComplementarios", event.target.value)
                    }
                    placeholder="Ej. dental, catastrófico…"
                  />
                </label>

                <label className="block space-y-1.5 sm:col-span-2">
                  <span className={FORM_LABEL_CLASS}>
                    Clínicas de preferencia
                  </span>
                  <Input
                    value={value.preferredClinics}
                    onChange={(event) =>
                      updateField("preferredClinics", event.target.value)
                    }
                    placeholder="Ej. Clínica Alemana, RedSalud…"
                  />
                </label>

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
                    <span className="font-medium text-[color:var(--dash-navy,#092558)]">
                      Anualidad
                    </span>
                  </label>
                  {!value.anualidad ? (
                    <label className="min-w-0 flex-1 space-y-1.5">
                      <span className={FORM_LABEL_CLASS}>
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
                  <span className={FORM_LABEL_CLASS}>Preexistencias</span>
                  <Input
                    value={value.preexistenciasMedicas}
                    onChange={(event) =>
                      updateField("preexistenciasMedicas", event.target.value)
                    }
                    placeholder="Ej. hipertensión, diabetes…"
                  />
                </label>

                <div className="space-y-2 sm:col-span-2">
                  <span className={FORM_LABEL_CLASS}>Motivo de cotización</span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {CLIENT_MOTIVO_COTIZACION_OPTIONS.map((option) => {
                      const selected = motivoCotizacionIncludes(
                        value.motivoCotizacion,
                        option.id,
                      );
                      return (
                        <label
                          key={option.id}
                          className={joinClasses(
                            "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
                            selected
                              ? "border-primary/40 bg-[color-mix(in_srgb,var(--dash-cyan,#1ac9ea)_12%,white)] font-semibold text-primary-dark"
                              : "border-border bg-white text-foreground hover:border-primary/25",
                          )}
                        >
                          <input
                            type="checkbox"
                            className="accent-[color:var(--dash-navy)]"
                            checked={selected}
                            onChange={() => {
                              const next = toggleMotivoCotizacionId(
                                value.motivoCotizacion,
                                option.id,
                              );
                              onChange({
                                ...value,
                                motivoCotizacion: next,
                                motivoCotizacionOther:
                                  motivoCotizacionIncludesOtros(next)
                                    ? value.motivoCotizacionOther
                                    : "",
                              });
                            }}
                          />
                          {option.label}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {motivoCotizacionIncludesOtros(value.motivoCotizacion) ? (
                  <label className="block space-y-1.5 sm:col-span-2">
                    <span className={FORM_LABEL_CLASS}>Detalle de Otros *</span>
                    <Input
                      value={value.motivoCotizacionOther}
                      onChange={(event) =>
                        updateField(
                          "motivoCotizacionOther",
                          event.target.value,
                        )
                      }
                      placeholder="Describe el motivo de cotización…"
                    />
                  </label>
                ) : null}
              </>
            ) : null}

            <label className="block space-y-1.5 sm:col-span-2">
              <span className={FORM_LABEL_CLASS}>Dirección particular</span>
              <Input
                value={value.address}
                onChange={(event) => updateField("address", event.target.value)}
                placeholder="Calle, número, depto."
              />
            </label>

            <label className="block space-y-1.5">
              <span className={FORM_LABEL_CLASS}>Comuna</span>
              <Input
                value={value.commune}
                onChange={(event) => updateField("commune", event.target.value)}
                placeholder="Ej. Las Condes"
              />
            </label>

            <label className="block space-y-1.5">
              <span className={FORM_LABEL_CLASS}>Región</span>
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
          </div>
        </div>

        {showAdditionalTitulares && value.additionalTitulares.length > 0 ? (
          <div className="space-y-3">
            {value.additionalTitulares.map((titular, index) => (
              <div key={titular.id}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className={FORM_SECTION_TITLE_CLASS}>
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
                    <span className={FORM_LABEL_CLASS}>Nombres *</span>
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
                    <span className={FORM_LABEL_CLASS}>Apellidos</span>
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
                    <span className={FORM_LABEL_CLASS}>RUT</span>
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
                    <span className={FORM_LABEL_CLASS}>Edad</span>
                    <Input
                      value={titular.age}
                      onChange={(event) =>
                        updateAdditionalTitular(
                          titular.id,
                          "age",
                          event.target.value,
                        )
                      }
                      placeholder="Ej. 37"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className={FORM_LABEL_CLASS}>Teléfono</span>
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
                    <span className={FORM_LABEL_CLASS}>
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
                    <span className={FORM_LABEL_CLASS}>
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

                  <label className="block space-y-1.5">
                    <span className={FORM_LABEL_CLASS}>Estatura (cm)</span>
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
                    <span className={FORM_LABEL_CLASS}>Peso (kg)</span>
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

                  <label className="block space-y-1.5">
                    <span className={FORM_LABEL_CLASS}>Renta imponible</span>
                    <Input
                      value={titular.rentaImponible}
                      onChange={(event) =>
                        updateAdditionalTitular(
                          titular.id,
                          "rentaImponible",
                          event.target.value,
                        )
                      }
                      placeholder="Ej. 1500000"
                    />
                  </label>

                  <label className="block space-y-1.5 sm:col-span-2">
                    <span className={FORM_LABEL_CLASS}>Isapre actual</span>
                    {renderIsapreSelect(titular.currentIsapre, (next) =>
                      updateAdditionalTitular(
                        titular.id,
                        "currentIsapre",
                        next,
                      ),
                    )}
                  </label>

                  <CurrencyAmountField
                    label="Valor plan"
                    amount={titular.currentPlanPrice ?? ""}
                    currency={resolveClientMoneyCurrency(
                      titular.currentPlanPriceCurrency,
                    )}
                    onAmountChange={(next) =>
                      updateAdditionalTitular(
                        titular.id,
                        "currentPlanPrice",
                        next,
                      )
                    }
                    onCurrencyChange={(next) =>
                      updateAdditionalTitular(
                        titular.id,
                        "currentPlanPriceCurrency",
                        next,
                      )
                    }
                  />

                  <CurrencyAmountField
                    label="Adicional voluntario"
                    amount={titular.voluntaryAdditional ?? ""}
                    currency={resolveClientMoneyCurrency(
                      titular.voluntaryAdditionalCurrency,
                    )}
                    onAmountChange={(next) =>
                      updateAdditionalTitular(
                        titular.id,
                        "voluntaryAdditional",
                        next,
                      )
                    }
                    onCurrencyChange={(next) =>
                      updateAdditionalTitular(
                        titular.id,
                        "voluntaryAdditionalCurrency",
                        next,
                      )
                    }
                  />

                  <label className="block space-y-1.5 sm:col-span-2">
                    <span className={FORM_LABEL_CLASS}>Preexistencias</span>
                    <Input
                      value={titular.preexistenciasMedicas}
                      onChange={(event) =>
                        updateAdditionalTitular(
                          titular.id,
                          "preexistenciasMedicas",
                          event.target.value,
                        )
                      }
                      placeholder="Ej. hipertensión, diabetes…"
                    />
                  </label>

                  <div className="space-y-2 sm:col-span-2">
                    <span className={FORM_LABEL_CLASS}>
                      Motivo de cotización
                    </span>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {CLIENT_MOTIVO_COTIZACION_OPTIONS.map((option) => {
                        const selected = motivoCotizacionIncludes(
                          titular.motivoCotizacion,
                          option.id,
                        );
                        return (
                          <label
                            key={option.id}
                            className={joinClasses(
                              "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
                              selected
                                ? "border-primary/40 bg-[color-mix(in_srgb,var(--dash-cyan,#1ac9ea)_12%,white)] font-semibold text-primary-dark"
                                : "border-border bg-white text-foreground hover:border-primary/25",
                            )}
                          >
                            <input
                              type="checkbox"
                              className="accent-[color:var(--dash-navy)]"
                              checked={selected}
                              onChange={() =>
                                updateAdditionalTitular(
                                  titular.id,
                                  "motivoCotizacion",
                                  toggleMotivoCotizacionId(
                                    titular.motivoCotizacion,
                                    option.id,
                                  ),
                                )
                              }
                            />
                            {option.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {motivoCotizacionIncludesOtros(titular.motivoCotizacion) ? (
                    <label className="block space-y-1.5 sm:col-span-2">
                      <span className={FORM_LABEL_CLASS}>
                        Detalle de Otros *
                      </span>
                      <Input
                        value={titular.motivoCotizacionOther}
                        onChange={(event) =>
                          updateAdditionalTitular(
                            titular.id,
                            "motivoCotizacionOther",
                            event.target.value,
                          )
                        }
                        placeholder="Describe el motivo de cotización…"
                      />
                    </label>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CollapsibleSection>
      ) : null}

      {showCargas ? (
      <CollapsibleSection
        title="Cargas familiares"
        description={
          showAllSections
            ? "Agrega cada carga con sus datos básicos."
            : undefined
        }
        className="space-y-0"
        hideIntro={!showAllSections}
        bodyClassName="space-y-4"
        headerRight={
          readOnly ? undefined : (
          <Button type="button" variant="info" size="sm" onClick={addDependent}>
            Agregar carga
          </Button>
          )
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
              <div key={dependent.id}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className={FORM_SECTION_TITLE_CLASS}>
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
                  <label className="block space-y-1.5 sm:col-span-2">
                    <span className={FORM_LABEL_CLASS}>Nombre</span>
                    <Input
                      value={dependent.fullName}
                      onChange={(event) =>
                        updateDependent(
                          dependent.id,
                          "fullName",
                          event.target.value,
                        )
                      }
                      placeholder="Nombre de la carga"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className={FORM_LABEL_CLASS}>RUT carga</span>
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
                    <span className={FORM_LABEL_CLASS}>
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
                    <span className={FORM_LABEL_CLASS}>Edad</span>
                    <Input
                      value={dependent.age}
                      onChange={(event) =>
                        updateDependent(
                          dependent.id,
                          "age",
                          event.target.value,
                        )
                      }
                      placeholder="Ej. 12 o nota"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className={FORM_LABEL_CLASS}>Estatura (cm)</span>
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
                    <span className={FORM_LABEL_CLASS}>Peso (kg)</span>
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

                  <label className="block space-y-1.5">
                    <span className={FORM_LABEL_CLASS}>
                      Preexistencias médicas
                    </span>
                    <Input
                      value={dependent.preexistenciasMedicas}
                      onChange={(event) =>
                        updateDependent(
                          dependent.id,
                          "preexistenciasMedicas",
                          event.target.value,
                        )
                      }
                      placeholder="Ej. asma, alergias…"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>
      ) : null}
    </fieldset>
  );
}

export function userRecordToProfileFormValue(
  user?: {
    email?: string;
    phone?: string | null;
    rut?: string | null;
    fullName?: string;
    pipelineNotes?: string | null;
    advisedPlan?: { isapre?: string } | null;
    requestedPlan?: { isapre?: string } | null;
    clientProfile?: {
      firstNames?: string;
      lastNames?: string;
      birthDate?: string;
      age?: string;
      currentIsapre?: string;
      currentPlanPrice?: string;
      currentPlanPriceCurrency?: ClientMoneyCurrency;
      voluntaryAdditional?: string;
      voluntaryAdditionalCurrency?: ClientMoneyCurrency;
      heightCm?: string;
      weightKg?: string;
      maritalStatus?: string;
      employerRut?: string;
      contributorType?: string;
      rentaImponible?: string;
      motivoCotizacion?: string;
      motivoCotizacionOther?: string;
      address?: string;
      commune?: string;
      coverageArea?: ClientCoverageArea;
      coverageRegionId?: string;
      preferredClinics?: string;
      anualidad?: boolean;
      anualidadComment?: string;
      segurosComplementarios?: string;
      preexistenciasMedicas?: string;
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
    currentIsapre: resolveTitularCurrentCoverageId({
      stored: profile?.currentIsapre,
      pipelineNotes: user?.pipelineNotes,
      chosenPlanIsapre:
        user?.advisedPlan?.isapre ?? user?.requestedPlan?.isapre,
    }),
    currentPlanPrice: profile?.currentPlanPrice ?? "",
    currentPlanPriceCurrency: resolveClientMoneyCurrency(
      profile?.currentPlanPriceCurrency,
    ),
    voluntaryAdditional: profile?.voluntaryAdditional ?? "",
    voluntaryAdditionalCurrency: resolveClientMoneyCurrency(
      profile?.voluntaryAdditionalCurrency,
    ),
    heightCm: profile?.heightCm ?? "",
    weightKg: profile?.weightKg ?? "",
    maritalStatus: profile?.maritalStatus ?? "",
    employerRut: profile?.employerRut ?? "",
    contributorType: resolveContributorType(profile?.contributorType),
    rentaImponible: profile?.rentaImponible ?? "",
    motivoCotizacion: profile?.motivoCotizacion ?? "",
    motivoCotizacionOther: profile?.motivoCotizacionOther ?? "",
    address: profile?.address ?? "",
    commune: profile?.commune ?? "",
    coverageArea: profile?.coverageArea ?? "",
    coverageRegionId: profile?.coverageRegionId ?? "",
    preferredClinics: profile?.preferredClinics ?? "",
    anualidad: profile?.anualidad === true,
    anualidadComment: profile?.anualidadComment ?? "",
    segurosComplementarios: profile?.segurosComplementarios ?? "",
    preexistenciasMedicas: profile?.preexistenciasMedicas ?? "",
    dependents: profile?.dependents ?? [],
    additionalTitulares: (profile?.additionalTitulares ?? []).map((titular) => ({
      ...titular,
      currentIsapre: resolveCurrentCoverageId(titular.currentIsapre),
    })),
  };
}
