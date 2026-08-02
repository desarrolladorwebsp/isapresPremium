"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  CARGAS_MEDICAS_OPTIONS,
  CONTACTO_PREFERENCIA_OPTIONS,
  COTIZADOR_STEPS,
  INITIAL_FORM_DATA,
  MOTIVO_COTIZACION_OPTIONS,
  PREVISION_OPTIONS,
  REGIONES_CHILE,
  type CotizadorFormData,
} from "@/constants/cotizador";
import { siteConfig } from "@/constants/site";
import {
  formatRutInput,
  validateLeadStep,
  type LeadFieldErrors,
} from "@/lib/leads/validation";

const baseInputClassName =
  "w-full rounded-lg border bg-white/90 px-4 py-2.5 text-base text-zinc-800 placeholder:text-zinc-500 outline-none transition focus:ring-2";

const okBorder =
  "border-white/20 focus:border-brand-green focus:ring-brand-green/30";
const errorBorder = "border-red-400 focus:border-red-400 focus:ring-red-400/30";

const labelClassName =
  "mb-1.5 block text-sm font-semibold tracking-wide text-white/95";

function fieldClassName(hasError?: boolean) {
  return `${baseInputClassName} ${hasError ? errorBorder : okBorder}`;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs text-red-300" role="alert">
      {message}
    </p>
  );
}

function CotizadorStepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-1">
      {COTIZADOR_STEPS.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = currentStep === stepNumber;
        const isCompleted = currentStep > stepNumber;

        return (
          <div key={step.id} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {index > 0 && (
                <div
                  className={`h-0.5 flex-1 ${isCompleted || isActive ? "bg-brand-green" : "bg-white/25"}`}
                />
              )}
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? "border-white bg-white text-brand-teal"
                    : isCompleted
                      ? "border-brand-green bg-brand-green text-white"
                      : "border-white/40 bg-transparent text-white/70"
                }`}
                aria-current={isActive ? "step" : undefined}
              >
                {isCompleted && stepNumber < 4 ? "✓" : stepNumber}
              </div>
              {index < COTIZADOR_STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 ${isCompleted ? "bg-brand-green" : "bg-white/25"}`}
                />
              )}
            </div>
            <span className="mt-2 hidden text-center text-[10px] leading-tight text-white/80 sm:block">
              {step.shortLabel.split("\n").map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CotizadorFooter() {
  return (
    <div className="mt-6 border-t border-white/15 pt-4 text-center">
      <p className="text-sm text-white/90">
        +2500 planes para que puedas elegir la opción que mejor se adapte a tus
        necesidades.
      </p>
      <Link
        href={`mailto:${siteConfig.contact.email}`}
        className="mt-2 inline-block text-sm font-semibold text-brand-green underline-offset-2 hover:underline"
      >
        Contáctanos
      </Link>
    </div>
  );
}

export function CotizadorForm() {
  const formId = useId();
  const formTopRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] =
    useState<CotizadorFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<LeadFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccessHint, setSubmitSuccessHint] = useState<string | null>(
    null,
  );
  /** Honeypot anti-bot: debe permanecer vacío. */
  const [honeypot, setHoneypot] = useState("");

  useEffect(() => {
    formTopRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [currentStep]);

  const errorId = (field: keyof CotizadorFormData) =>
    `${formId}-${field}-error`;

  const updateField = <K extends keyof CotizadorFormData>(
    field: K,
    value: CotizadorFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    if (submitError) setSubmitError(null);
  };

  const focusFirstError = (nextErrors: LeadFieldErrors) => {
    const firstField = Object.keys(nextErrors)[0];
    if (!firstField) return;
    const el = document.getElementById(firstField);
    el?.focus();
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const validateStep = (step: 1 | 2 | 3) => {
    const result = validateLeadStep(step, formData);
    if (result.ok) {
      setErrors({});
      return true;
    }
    setErrors(result.errors);
    queueMicrotask(() => focusFirstError(result.errors));
    return false;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep(1)) return;
    if (currentStep === 2 && !validateStep(2)) return;
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setSubmitError(null);
    setErrors({});
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccessHint(null);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, _hp: honeypot }),
      });

      const result = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        fieldErrors?: LeadFieldErrors;
        clientEmailSent?: boolean;
        retryAfterSeconds?: number;
      } | null;

      if (response.status === 429) {
        setSubmitError(
          result?.error ||
            "Demasiadas solicitudes. Intenta nuevamente en unos minutos.",
        );
        return;
      }

      if (response.status === 403) {
        setSubmitError(
          result?.error || "No pudimos validar el origen de la solicitud.",
        );
        return;
      }

      if (response.status === 400 && result?.fieldErrors) {
        setErrors(result.fieldErrors);
        setSubmitError(
          result.error || "Revisa los campos marcados e intenta nuevamente.",
        );
        // If server rejected fields from earlier steps, send user back.
        const step1Keys: (keyof CotizadorFormData)[] = [
          "nombreApellido",
          "rut",
          "edad",
          "email",
          "telefono",
        ];
        const step2Keys: (keyof CotizadorFormData)[] = [
          "previsionActual",
          "ufActuales",
          "region",
          "cargasMedicas",
          "edadCargas",
          "rentaImponible",
        ];
        const errorKeys = Object.keys(
          result.fieldErrors,
        ) as (keyof CotizadorFormData)[];
        if (errorKeys.some((key) => step1Keys.includes(key))) {
          setCurrentStep(1);
        } else if (errorKeys.some((key) => step2Keys.includes(key))) {
          setCurrentStep(2);
        }
        queueMicrotask(() => focusFirstError(result.fieldErrors ?? {}));
        return;
      }

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error ||
            "No pudimos enviar tu solicitud. Intenta nuevamente.",
        );
      }

      if (result.clientEmailSent === false) {
        setSubmitSuccessHint(
          "Recibimos tu solicitud. Si no llega el correo de confirmación, revisa spam o escríbenos por WhatsApp.",
        );
      }

      setCurrentStep(4);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "No pudimos enviar tu solicitud. Intenta nuevamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (currentStep === 3) {
      void handleSubmit();
      return;
    }
    if (currentStep < 3) handleNext();
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM_DATA);
    setErrors({});
    setSubmitError(null);
    setSubmitSuccessHint(null);
    setCurrentStep(1);
  };

  return (
    <div
      ref={formTopRef}
      className="flex h-full w-full flex-col rounded-2xl bg-brand-teal/45 p-5 shadow-2xl backdrop-blur-lg sm:p-6 lg:rounded-none lg:bg-brand-teal/25 lg:p-8 lg:shadow-none lg:backdrop-blur-md xl:px-10 xl:py-10"
    >
      <h2 className="mb-5 text-center font-heading text-2xl font-bold tracking-tight text-white sm:text-[1.75rem]">
        Cotizador digital
      </h2>

      <CotizadorStepper currentStep={currentStep} />

      <div className="flex min-h-[320px] flex-1 flex-col lg:justify-between">
        {currentStep < 4 ? (
          <form className="space-y-4" onSubmit={handleFormSubmit} noValidate>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-[10000px] h-0 w-0 overflow-hidden opacity-0"
            >
              <label htmlFor={`${formId}-website`}>Sitio web</label>
              <input
                id={`${formId}-website`}
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(event) => setHoneypot(event.target.value)}
              />
            </div>
            {currentStep === 1 && (
              <>
                <div>
                  <label htmlFor="nombreApellido" className={labelClassName}>
                    Nombre y Apellido *
                  </label>
                  <input
                    id="nombreApellido"
                    name="nombreApellido"
                    type="text"
                    autoComplete="name"
                    value={formData.nombreApellido}
                    onChange={(e) =>
                      updateField("nombreApellido", e.target.value)
                    }
                    placeholder="Escriba su nombre y apellido"
                    className={fieldClassName(!!errors.nombreApellido)}
                    aria-invalid={!!errors.nombreApellido}
                    aria-describedby={
                      errors.nombreApellido
                        ? errorId("nombreApellido")
                        : undefined
                    }
                  />
                  <FieldError
                    id={errorId("nombreApellido")}
                    message={errors.nombreApellido}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="rut" className={labelClassName}>
                      RUT
                    </label>
                    <input
                      id="rut"
                      name="rut"
                      type="text"
                      inputMode="text"
                      autoComplete="off"
                      value={formData.rut}
                      onChange={(e) =>
                        updateField("rut", formatRutInput(e.target.value))
                      }
                      placeholder="12.345.678-9"
                      className={fieldClassName(!!errors.rut)}
                      aria-invalid={!!errors.rut}
                      aria-describedby={errors.rut ? errorId("rut") : undefined}
                    />
                    <FieldError id={errorId("rut")} message={errors.rut} />
                  </div>
                  <div>
                    <label htmlFor="edad" className={labelClassName}>
                      Edad
                    </label>
                    <input
                      id="edad"
                      name="edad"
                      type="number"
                      min={18}
                      max={99}
                      inputMode="numeric"
                      value={formData.edad}
                      onChange={(e) => updateField("edad", e.target.value)}
                      className={fieldClassName(!!errors.edad)}
                      aria-invalid={!!errors.edad}
                      aria-describedby={
                        errors.edad ? errorId("edad") : undefined
                      }
                    />
                    <FieldError id={errorId("edad")} message={errors.edad} />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className={labelClassName}>
                    Email *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="Ej: hola@mimail.cl"
                    className={fieldClassName(!!errors.email)}
                    aria-invalid={!!errors.email}
                    aria-describedby={
                      errors.email ? errorId("email") : undefined
                    }
                  />
                  <FieldError id={errorId("email")} message={errors.email} />
                </div>

                <div>
                  <label htmlFor="telefono" className={labelClassName}>
                    Teléfono *
                  </label>
                  <input
                    id="telefono"
                    name="telefono"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    value={formData.telefono}
                    onChange={(e) => updateField("telefono", e.target.value)}
                    placeholder="+56 9 1234 5678"
                    className={fieldClassName(!!errors.telefono)}
                    aria-invalid={!!errors.telefono}
                    aria-describedby={
                      errors.telefono ? errorId("telefono") : undefined
                    }
                  />
                  <FieldError
                    id={errorId("telefono")}
                    message={errors.telefono}
                  />
                </div>
              </>
            )}

            {currentStep === 2 && (
              <>
                <div>
                  <label htmlFor="previsionActual" className={labelClassName}>
                    Selecciona previsión actual *
                  </label>
                  <select
                    id="previsionActual"
                    name="previsionActual"
                    value={formData.previsionActual}
                    onChange={(e) =>
                      updateField("previsionActual", e.target.value)
                    }
                    className={fieldClassName(!!errors.previsionActual)}
                    aria-invalid={!!errors.previsionActual}
                    aria-describedby={
                      errors.previsionActual
                        ? errorId("previsionActual")
                        : undefined
                    }
                  >
                    {PREVISION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <FieldError
                    id={errorId("previsionActual")}
                    message={errors.previsionActual}
                  />
                </div>

                <div>
                  <label htmlFor="ufActuales" className={labelClassName}>
                    Indique cuántas UF paga actualmente
                  </label>
                  <input
                    id="ufActuales"
                    name="ufActuales"
                    type="text"
                    inputMode="decimal"
                    value={formData.ufActuales}
                    onChange={(e) => updateField("ufActuales", e.target.value)}
                    className={fieldClassName()}
                  />
                </div>

                <div>
                  <label htmlFor="region" className={labelClassName}>
                    Región de Residencia *
                  </label>
                  <select
                    id="region"
                    name="region"
                    value={formData.region}
                    onChange={(e) => updateField("region", e.target.value)}
                    className={fieldClassName(!!errors.region)}
                    aria-invalid={!!errors.region}
                    aria-describedby={
                      errors.region ? errorId("region") : undefined
                    }
                  >
                    {REGIONES_CHILE.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <FieldError id={errorId("region")} message={errors.region} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="cargasMedicas" className={labelClassName}>
                      Cargas Médicas / Legales *
                    </label>
                    <select
                      id="cargasMedicas"
                      name="cargasMedicas"
                      value={formData.cargasMedicas}
                      onChange={(e) =>
                        updateField("cargasMedicas", e.target.value)
                      }
                      className={fieldClassName(!!errors.cargasMedicas)}
                      aria-invalid={!!errors.cargasMedicas}
                      aria-describedby={
                        errors.cargasMedicas
                          ? errorId("cargasMedicas")
                          : undefined
                      }
                    >
                      {CARGAS_MEDICAS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <FieldError
                      id={errorId("cargasMedicas")}
                      message={errors.cargasMedicas}
                    />
                  </div>
                  <div>
                    <label htmlFor="edadCargas" className={labelClassName}>
                      Edad de las cargas médicas
                    </label>
                    <input
                      id="edadCargas"
                      name="edadCargas"
                      type="text"
                      value={formData.edadCargas}
                      onChange={(e) =>
                        updateField("edadCargas", e.target.value)
                      }
                      placeholder="Ej: 5, 12, 45"
                      className={fieldClassName()}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="rentaImponible" className={labelClassName}>
                    Renta imponible *
                  </label>
                  <input
                    id="rentaImponible"
                    name="rentaImponible"
                    type="text"
                    inputMode="decimal"
                    value={formData.rentaImponible}
                    onChange={(e) =>
                      updateField("rentaImponible", e.target.value)
                    }
                    placeholder="Indícanos tu renta imponible aproximada"
                    className={fieldClassName(!!errors.rentaImponible)}
                    aria-invalid={!!errors.rentaImponible}
                    aria-describedby={
                      errors.rentaImponible
                        ? errorId("rentaImponible")
                        : undefined
                    }
                  />
                  <FieldError
                    id={errorId("rentaImponible")}
                    message={errors.rentaImponible}
                  />
                </div>
              </>
            )}

            {currentStep === 3 && (
              <>
                <div>
                  <label htmlFor="motivoCotizacion" className={labelClassName}>
                    ¿Por qué quieres cotizar un nuevo plan de Isapre?
                  </label>
                  <select
                    id="motivoCotizacion"
                    name="motivoCotizacion"
                    value={formData.motivoCotizacion}
                    onChange={(e) =>
                      updateField("motivoCotizacion", e.target.value)
                    }
                    className={fieldClassName()}
                  >
                    {MOTIVO_COTIZACION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="preferenciaContacto"
                    className={labelClassName}
                  >
                    Prefiero que me contacten por... *
                  </label>
                  <select
                    id="preferenciaContacto"
                    name="preferenciaContacto"
                    value={formData.preferenciaContacto}
                    onChange={(e) =>
                      updateField("preferenciaContacto", e.target.value)
                    }
                    className={fieldClassName(!!errors.preferenciaContacto)}
                    aria-invalid={!!errors.preferenciaContacto}
                    aria-describedby={
                      errors.preferenciaContacto
                        ? errorId("preferenciaContacto")
                        : undefined
                    }
                  >
                    {CONTACTO_PREFERENCIA_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <FieldError
                    id={errorId("preferenciaContacto")}
                    message={errors.preferenciaContacto}
                  />
                </div>

                <div>
                  <label className="flex items-start gap-3 text-sm text-white/90">
                    <input
                      id="autorizaDatos"
                      name="autorizaDatos"
                      type="checkbox"
                      checked={formData.autorizaDatos}
                      onChange={(e) =>
                        updateField("autorizaDatos", e.target.checked)
                      }
                      className="mt-0.5 h-5 w-5 shrink-0 rounded border-white/30 accent-brand-green"
                      aria-invalid={!!errors.autorizaDatos}
                      aria-describedby={
                        errors.autorizaDatos
                          ? errorId("autorizaDatos")
                          : undefined
                      }
                    />
                    <span>
                      Autorizo el tratamiento de mis datos personales conforme a
                      la legislación vigente y la{" "}
                      <Link
                        href="/politicas"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-brand-green underline-offset-2 hover:underline"
                      >
                        política de privacidad
                      </Link>
                      .
                    </span>
                  </label>
                  <FieldError
                    id={errorId("autorizaDatos")}
                    message={errors.autorizaDatos}
                  />
                </div>
              </>
            )}

            <div
              className={`flex gap-3 pt-2 ${
                currentStep === 1
                  ? "justify-end"
                  : "flex-col-reverse sm:flex-row sm:justify-between"
              }`}
            >
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="min-h-11 rounded-lg bg-brand-green px-8 py-3 text-sm font-semibold text-white transition hover:bg-brand-green/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Volver
                </button>
              ) : null}
              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-11 rounded-lg bg-brand-teal-dark px-8 py-3 text-sm font-semibold text-white transition hover:bg-brand-teal-dark/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {currentStep === 3
                  ? isSubmitting
                    ? "Enviando solicitud..."
                    : "Solicitar cotización"
                  : "Siguiente"}
              </button>
            </div>

            {submitError ? (
              <p className="text-center text-sm text-red-200" role="alert">
                {submitError}
              </p>
            ) : null}
          </form>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-green/20 text-3xl text-brand-green"
              aria-hidden
            >
              ✓
            </div>
            <h3 className="font-heading text-2xl font-bold tracking-tight text-white">
              ¡Solicitud enviada!
            </h3>
            <p className="mt-2 max-w-sm text-base text-white/85">
              Recibimos tu solicitud de cotización. Un asesor te contactará
              pronto según tu preferencia.
            </p>
            {submitSuccessHint ? (
              <p
                className="mt-3 max-w-sm text-sm text-amber-100/95"
                role="status"
              >
                {submitSuccessHint}
              </p>
            ) : (
              <p className="mt-3 max-w-sm text-sm text-white/70" role="status">
                También te enviamos un correo de confirmación.
              </p>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="mt-6 rounded-lg bg-brand-teal-dark px-8 py-3 text-sm font-semibold text-white transition hover:bg-brand-teal-dark/90"
            >
              Nueva solicitud
            </button>
          </div>
        )}
      </div>

      <CotizadorFooter />
    </div>
  );
}
