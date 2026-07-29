"use client";

import Link from "next/link";
import { useState } from "react";
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

const inputClassName =
  "w-full rounded-lg border border-white/20 bg-white/90 px-4 py-2.5 text-base text-zinc-800 placeholder:text-zinc-500 outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/30";

const selectClassName =
  "w-full rounded-lg border border-white/20 bg-white/90 px-4 py-2.5 text-base text-zinc-800 outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/30";

const labelClassName =
  "mb-1.5 block text-sm font-semibold tracking-wide text-white/95";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-300">{message}</p>;
}

function CotizadorStepper({
  currentStep,
}: {
  currentStep: number;
}) {
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
              >
                {stepNumber}
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
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CotizadorFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Partial<Record<keyof CotizadorFormData, string>>>({});

  const updateField = <K extends keyof CotizadorFormData>(
    field: K,
    value: CotizadorFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateStep1 = () => {
    const nextErrors: Partial<Record<keyof CotizadorFormData, string>> = {};
    if (!formData.nombreApellido.trim()) {
      nextErrors.nombreApellido = "Este campo es obligatorio";
    }
    if (!formData.email.trim()) {
      nextErrors.email = "Este campo es obligatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = "Ingresa un email válido";
    }
    if (!formData.telefono.trim()) {
      nextErrors.telefono = "Este campo es obligatorio";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateStep2 = () => {
    const nextErrors: Partial<Record<keyof CotizadorFormData, string>> = {};
    if (!formData.previsionActual) {
      nextErrors.previsionActual = "Selecciona tu previsión actual";
    }
    if (!formData.region) {
      nextErrors.region = "Selecciona tu región";
    }
    if (!formData.cargasMedicas) {
      nextErrors.cargasMedicas = "Indica tus cargas médicas";
    }
    if (!formData.rentaImponible.trim()) {
      nextErrors.rentaImponible = "Este campo es obligatorio";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateStep3 = () => {
    const nextErrors: Partial<Record<keyof CotizadorFormData, string>> = {};
    if (!formData.preferenciaContacto) {
      nextErrors.preferenciaContacto = "Selecciona una preferencia de contacto";
    }
    if (!formData.autorizaDatos) {
      nextErrors.autorizaDatos = "Debes autorizar el tratamiento de datos";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = () => {
    if (!validateStep3()) return;
    setCurrentStep(4);
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM_DATA);
    setErrors({});
    setCurrentStep(1);
  };

  return (
    <div className="flex h-full w-full flex-col rounded-2xl bg-brand-teal/75 p-5 shadow-2xl backdrop-blur-md sm:p-6 lg:rounded-none lg:bg-brand-teal/40 lg:p-8 lg:shadow-none lg:backdrop-blur-sm xl:px-10 xl:py-10">
      <h2 className="mb-5 text-center font-heading text-2xl font-bold tracking-tight text-white sm:text-[1.75rem]">
        Cotizador digital
      </h2>

      <CotizadorStepper currentStep={currentStep} />

      <div className="flex min-h-[320px] flex-1 flex-col lg:justify-between">
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="nombreApellido" className={labelClassName}>
                Nombre y Apellido *
              </label>
              <input
                id="nombreApellido"
                type="text"
                value={formData.nombreApellido}
                onChange={(e) => updateField("nombreApellido", e.target.value)}
                placeholder="Escriba su nombre y apellido"
                className={inputClassName}
              />
              <FieldError message={errors.nombreApellido} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="rut" className={labelClassName}>
                  RUT
                </label>
                <input
                  id="rut"
                  type="text"
                  value={formData.rut}
                  onChange={(e) => updateField("rut", e.target.value)}
                  placeholder="__.___.___-_"
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="edad" className={labelClassName}>
                  Edad
                </label>
                <input
                  id="edad"
                  type="number"
                  min={0}
                  value={formData.edad}
                  onChange={(e) => updateField("edad", e.target.value)}
                  className={inputClassName}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className={labelClassName}>
                Email *
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="Ej: hola@mimail.cl"
                className={inputClassName}
              />
              <FieldError message={errors.email} />
            </div>

            <div>
              <label htmlFor="telefono" className={labelClassName}>
                Teléfono *
              </label>
              <input
                id="telefono"
                type="tel"
                value={formData.telefono}
                onChange={(e) => updateField("telefono", e.target.value)}
                placeholder="(+56) (_) ___ ___"
                className={inputClassName}
              />
              <FieldError message={errors.telefono} />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleNext}
                className="min-h-11 rounded-lg bg-brand-teal-dark px-8 py-3 text-sm font-semibold text-white transition hover:bg-brand-teal-dark/90"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="previsionActual" className={labelClassName}>
                Selecciona previsión actual *
              </label>
              <select
                id="previsionActual"
                value={formData.previsionActual}
                onChange={(e) => updateField("previsionActual", e.target.value)}
                className={selectClassName}
              >
                {PREVISION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <FieldError message={errors.previsionActual} />
            </div>

            <div>
              <label htmlFor="ufActuales" className={labelClassName}>
                Indique cuántas UF paga actualmente
              </label>
              <input
                id="ufActuales"
                type="text"
                value={formData.ufActuales}
                onChange={(e) => updateField("ufActuales", e.target.value)}
                className={inputClassName}
              />
            </div>

            <div>
              <label htmlFor="region" className={labelClassName}>
                Región de Residencia *
              </label>
              <select
                id="region"
                value={formData.region}
                onChange={(e) => updateField("region", e.target.value)}
                className={selectClassName}
              >
                {REGIONES_CHILE.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <FieldError message={errors.region} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="cargasMedicas" className={labelClassName}>
                  Cargas Médicas / Legales *
                </label>
                <select
                  id="cargasMedicas"
                  value={formData.cargasMedicas}
                  onChange={(e) => updateField("cargasMedicas", e.target.value)}
                  className={selectClassName}
                >
                  {CARGAS_MEDICAS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.cargasMedicas} />
              </div>
              <div>
                <label htmlFor="edadCargas" className={labelClassName}>
                  Edad de las cargas médicas
                </label>
                <input
                  id="edadCargas"
                  type="text"
                  value={formData.edadCargas}
                  onChange={(e) => updateField("edadCargas", e.target.value)}
                  className={inputClassName}
                />
              </div>
            </div>

            <div>
              <label htmlFor="rentaImponible" className={labelClassName}>
                Renta imponible *
              </label>
              <input
                id="rentaImponible"
                type="text"
                value={formData.rentaImponible}
                onChange={(e) => updateField("rentaImponible", e.target.value)}
                placeholder="Indícanos tu renta imponible aproximada para todo evento."
                className={inputClassName}
              />
              <FieldError message={errors.rentaImponible} />
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={handleBack}
                className="min-h-11 rounded-lg bg-brand-green px-8 py-3 text-sm font-semibold text-white transition hover:bg-brand-green/90"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="min-h-11 rounded-lg bg-brand-teal-dark px-8 py-3 text-sm font-semibold text-white transition hover:bg-brand-teal-dark/90"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="motivoCotizacion" className={labelClassName}>
                ¿Porqué quieres cotizar un nuevo plan de Isapre?
              </label>
              <select
                id="motivoCotizacion"
                value={formData.motivoCotizacion}
                onChange={(e) => updateField("motivoCotizacion", e.target.value)}
                className={selectClassName}
              >
                {MOTIVO_COTIZACION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="preferenciaContacto" className={labelClassName}>
                Prefiero que me contacten por... *
              </label>
              <select
                id="preferenciaContacto"
                value={formData.preferenciaContacto}
                onChange={(e) =>
                  updateField("preferenciaContacto", e.target.value)
                }
                className={selectClassName}
              >
                {CONTACTO_PREFERENCIA_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <FieldError message={errors.preferenciaContacto} />
            </div>

            <div>
              <label className="flex items-start gap-3 text-sm text-white/90">
                <input
                  type="checkbox"
                  checked={formData.autorizaDatos}
                  onChange={(e) => updateField("autorizaDatos", e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-white/30 accent-brand-green"
                />
                <span>
                  Autorizo el tratamiento de mis datos personales conforme a la
                  legislación vigente y la{" "}
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
              <FieldError message={errors.autorizaDatos} />
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={handleBack}
                className="min-h-11 rounded-lg bg-brand-green px-8 py-3 text-sm font-semibold text-white transition hover:bg-brand-green/90"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="min-h-11 rounded-lg bg-brand-teal-dark px-8 py-3 text-sm font-semibold text-white transition hover:bg-brand-teal-dark/90"
              >
                Enviar Cotización
              </button>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-green/20 text-3xl text-brand-green">
              ✓
            </div>
            <h3 className="font-heading text-2xl font-bold tracking-tight text-white">
              ¡Cotización enviada!
            </h3>
            <p className="mt-2 max-w-sm text-base text-white/85">
              Nos pondremos en contacto contigo pronto.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="mt-6 rounded-lg bg-brand-teal-dark px-8 py-3 text-sm font-semibold text-white transition hover:bg-brand-teal-dark/90"
            >
              Nueva cotización
            </button>
          </div>
        )}
      </div>

      <CotizadorFooter />
    </div>
  );
}
