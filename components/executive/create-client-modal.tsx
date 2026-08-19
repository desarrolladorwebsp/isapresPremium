"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AdminFormModal } from "@/components/admin/admin-data-table";
import {
  buildEmptyClientProfileFormValue,
  type ClientProfileFormValue,
} from "@/components/executive/client-profile-form";
import { createExecutiveClient } from "@/lib/api/admin-client";
import {
  CLIENT_MOTIVO_COTIZACION_OPTIONS,
  motivoCotizacionIncludes,
  motivoCotizacionIncludesOtros,
  toggleMotivoCotizacionId,
} from "@/lib/client-profile/constants";
import { resolveCurrentCoverageId } from "@/lib/client-profile/current-coverage";
import { getClientManagementRutErrors } from "@/lib/client-profile/validate-client-ruts";
import { sanitizeRutInput } from "@/lib/auth/rut";
import { CURRENT_COVERAGE_OPTIONS } from "@/lib/filter-options";
import { joinClasses } from "@/lib/utils";
import type { ClientMoneyCurrency } from "@/types/client-profile";
import {
  MANUAL_CLIENT_ORIGIN_OPTIONS,
  type UserRecord,
} from "@/types/user";

export interface CreateClientModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (client: UserRecord) => void;
  onNotify: (message: string, tone?: "success" | "error") => void;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-wide text-primary-dark/70">
      {children}
    </span>
  );
}

function SectionCard({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-white p-3 sm:p-4">
      <header className="flex items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-dark text-xs font-bold text-white">
          {number}
        </span>
        <h3 className="text-sm font-bold uppercase tracking-wide text-primary-dark">
          {title}
        </h3>
      </header>
      {children}
    </section>
  );
}

function YesNoRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-medium text-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        {([true, false] as const).map((option) => {
          const selected = value === option;
          return (
            <button
              key={String(option)}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option)}
              className={joinClasses(
                "rounded-full px-3.5 py-1 text-xs font-semibold transition",
                selected
                  ? "bg-primary-dark text-white"
                  : "border border-border bg-white text-zinc-600 hover:border-primary/30",
              )}
            >
              {option ? "Sí" : "No"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CurrencyAmountField({
  label,
  amount,
  currency,
  onAmountChange,
  onCurrencyChange,
}: {
  label: string;
  amount: string;
  currency: ClientMoneyCurrency;
  onAmountChange: (value: string) => void;
  onCurrencyChange: (value: ClientMoneyCurrency) => void;
}) {
  return (
    <label className="block space-y-1">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex min-w-0 items-center gap-2">
        <Input
          value={amount}
          inputMode="decimal"
          onChange={(event) => onAmountChange(event.target.value)}
          className="min-w-0 flex-1"
        />
        <button
          type="button"
          onClick={() => onCurrencyChange(currency === "UF" ? "CLP" : "UF")}
          className={joinClasses(
            "inline-flex h-10 w-12 shrink-0 items-center justify-center rounded-md border text-xs font-semibold transition",
            currency === "UF"
              ? "border-primary/30 bg-primary/10 text-primary-dark hover:bg-primary/15"
              : "border-secondary/30 bg-secondary-muted/50 text-secondary hover:bg-secondary-muted",
          )}
          title={`Moneda: ${currency}. Clic para cambiar.`}
          aria-label={`Moneda ${currency}`}
        >
          {currency === "UF" ? "UF" : "$"}
        </button>
      </div>
    </label>
  );
}

export function CreateClientModal({
  open,
  onClose,
  onCreated,
  onNotify,
}: CreateClientModalProps) {
  const [profile, setProfile] = useState<ClientProfileFormValue>(
    buildEmptyClientProfileFormValue(),
  );
  const [clientOrigin, setClientOrigin] = useState<
    (typeof MANUAL_CLIENT_ORIGIN_OPTIONS)[number]["value"]
  >("MANUAL");
  const [pipelineNotes, setPipelineNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [titularRutError, setTitularRutError] = useState<string | undefined>();

  const displayName = [profile.firstNames, profile.lastNames]
    .filter((part) => part !== "")
    .join(" ");
  const hasSeguroCompl = profile.segurosComplementarios.trim().length > 0;
  const hasPreexistencia = profile.preexistenciasMedicas.trim().length > 0;

  function handleClose() {
    setProfile(buildEmptyClientProfileFormValue());
    setClientOrigin("MANUAL");
    setPipelineNotes("");
    setTitularRutError(undefined);
    onClose();
  }

  function setFullName(raw: string) {
    const parts = raw.trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1) {
      setProfile((current) => ({
        ...current,
        firstNames: raw,
        lastNames: parts.length === 0 ? "" : current.lastNames,
      }));
      return;
    }
    const last = parts.pop() ?? "";
    setProfile((current) => ({
      ...current,
      firstNames: parts.join(" "),
      lastNames: last,
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!profile.firstNames.trim()) {
      onNotify("Indica el nombre del cliente.", "error");
      return;
    }

    const errors = getClientManagementRutErrors(
      {
        rut: profile.rut,
        dependents: [],
        additionalTitulares: [],
      },
      { requireTitularRut: false },
    );
    if (errors.firstMessage) {
      setTitularRutError(errors.titular);
      onNotify(errors.firstMessage, "error");
      return;
    }

    setSaving(true);
    try {
      const created = await createExecutiveClient({
        email: profile.email.trim() || null,
        phone: profile.phone.trim() || null,
        rut: profile.rut.trim() || null,
        firstNames: profile.firstNames.trim(),
        lastNames: profile.lastNames.trim(),
        birthDate: profile.birthDate || null,
        age: profile.age.trim() || null,
        currentIsapre: profile.currentIsapre.trim() || null,
        currentPlanPrice: profile.currentPlanPrice.trim() || null,
        currentPlanPriceCurrency: profile.currentPlanPriceCurrency,
        voluntaryAdditional: profile.voluntaryAdditional.trim() || null,
        voluntaryAdditionalCurrency: profile.voluntaryAdditionalCurrency,
        heightCm: null,
        weightKg: null,
        maritalStatus: null,
        employerRut: profile.employerRut.trim() || null,
        contributorType: null,
        rentaImponible: profile.rentaImponible.trim() || null,
        motivoCotizacion: profile.motivoCotizacion.trim() || null,
        motivoCotizacionOther: profile.motivoCotizacionOther.trim() || null,
        address: null,
        commune: null,
        coverageArea: null,
        coverageRegionId: null,
        preferredClinics: profile.preferredClinics.trim() || null,
        anualidad: profile.anualidad,
        anualidadComment: null,
        segurosComplementarios: profile.segurosComplementarios.trim() || null,
        preexistenciasMedicas: profile.preexistenciasMedicas.trim() || null,
        dependents: [],
        additionalTitulares: [],
        pipelineNotes: pipelineNotes.trim() || null,
        clientOrigin,
      });
      onNotify("Cliente registrado y asignado a tu cartera. Completa el resto en la ficha.");
      onCreated(created);
      handleClose();
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudo registrar el cliente.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminFormModal
      open={open}
      onClose={handleClose}
      title="Agregar cliente"
      description="Registra los datos del titular. Al guardar se abre la ficha completa."
      size="lg"
    >
      <form
        className="premium-client-form space-y-4"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <label className="block space-y-1.5">
          <FieldLabel>Origen *</FieldLabel>
          <Select
            required
            value={clientOrigin}
            options={MANUAL_CLIENT_ORIGIN_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            onChange={(event) =>
              setClientOrigin(
                event.target
                  .value as (typeof MANUAL_CLIENT_ORIGIN_OPTIONS)[number]["value"],
              )
            }
          />
        </label>

        <SectionCard number={1} title="Datos personales">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 sm:col-span-2">
              <FieldLabel>Nombre completo *</FieldLabel>
              <Input
                required
                value={displayName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Nombre y apellido"
              />
            </label>
            <label className="block space-y-1">
              <FieldLabel>RUT</FieldLabel>
              <Input
                value={profile.rut}
                aria-invalid={Boolean(titularRutError)}
                onChange={(event) => {
                  setTitularRutError(undefined);
                  setProfile((current) => ({
                    ...current,
                    rut: sanitizeRutInput(event.target.value),
                  }));
                }}
                placeholder="12345678-9"
                className={
                  titularRutError
                    ? "border-danger focus-visible:ring-danger/30"
                    : undefined
                }
              />
              {titularRutError ? (
                <p className="text-[11px] text-danger">{titularRutError}</p>
              ) : null}
            </label>
            <label className="block space-y-1">
              <FieldLabel>Edad</FieldLabel>
              <Input
                value={profile.age}
                onChange={(event) => {
                  const digits = event.target.value.replace(/[^\d]/g, "");
                  setProfile((current) => ({ ...current, age: digits }));
                }}
                placeholder="Ej. 37"
              />
            </label>
            <label className="block space-y-1">
              <FieldLabel>Teléfono</FieldLabel>
              <Input
                value={profile.phone}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                placeholder="+56912345678"
              />
            </label>
            <label className="block space-y-1">
              <FieldLabel>Email</FieldLabel>
              <Input
                type="email"
                value={profile.email}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="cliente@email.com"
              />
            </label>
          </div>
        </SectionCard>

        <SectionCard number={2} title="Información laboral">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <FieldLabel>RUT empleador</FieldLabel>
              <Input
                value={profile.employerRut}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    employerRut: sanitizeRutInput(event.target.value),
                  }))
                }
                placeholder="76.XXX.XXX-X"
              />
            </label>
            <label className="block space-y-1">
              <FieldLabel>Renta imponible</FieldLabel>
              <Input
                value={profile.rentaImponible}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    rentaImponible: event.target.value,
                  }))
                }
                placeholder="Ej. Voluntario / $240.000"
              />
            </label>
          </div>
        </SectionCard>

        <SectionCard number={3} title="Información del plan actual">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <FieldLabel>Isapre actual</FieldLabel>
              <Select
                value={resolveCurrentCoverageId(profile.currentIsapre)}
                placeholder="Selecciona…"
                options={CURRENT_COVERAGE_OPTIONS.map((option) => ({
                  value: option.id,
                  label: option.label,
                }))}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    currentIsapre: event.target.value,
                  }))
                }
              />
            </label>
            <label className="block space-y-1">
              <FieldLabel>Clínicas de preferencia</FieldLabel>
              <Input
                value={profile.preferredClinics}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    preferredClinics: event.target.value,
                  }))
                }
                placeholder="Ej. Hospital clínico UC"
              />
            </label>
            <CurrencyAmountField
              label="Valor plan"
              amount={profile.currentPlanPrice}
              currency={profile.currentPlanPriceCurrency}
              onAmountChange={(value) =>
                setProfile((current) => ({
                  ...current,
                  currentPlanPrice: value,
                }))
              }
              onCurrencyChange={(value) =>
                setProfile((current) => ({
                  ...current,
                  currentPlanPriceCurrency: value,
                }))
              }
            />
            <CurrencyAmountField
              label="Adicional voluntario"
              amount={profile.voluntaryAdditional}
              currency={profile.voluntaryAdditionalCurrency}
              onAmountChange={(value) =>
                setProfile((current) => ({
                  ...current,
                  voluntaryAdditional: value,
                }))
              }
              onCurrencyChange={(value) =>
                setProfile((current) => ({
                  ...current,
                  voluntaryAdditionalCurrency: value,
                }))
              }
            />
            <YesNoRow
              label="Seguro complementario"
              value={hasSeguroCompl}
              onChange={(next) =>
                setProfile((current) => ({
                  ...current,
                  segurosComplementarios: next
                    ? current.segurosComplementarios.trim() || "Sí"
                    : "",
                }))
              }
            />
            <YesNoRow
              label="Anualidad"
              value={profile.anualidad}
              onChange={(next) =>
                setProfile((current) => ({ ...current, anualidad: next }))
              }
            />
            <div className="sm:col-span-2">
              <YesNoRow
                label="Preexistencias"
                value={hasPreexistencia}
                onChange={(next) =>
                  setProfile((current) => ({
                    ...current,
                    preexistenciasMedicas: next
                      ? current.preexistenciasMedicas.trim() || "Sí"
                      : "",
                  }))
                }
              />
            </div>
            {hasPreexistencia ? (
              <label className="block space-y-1 sm:col-span-2">
                <FieldLabel>Describe las preexistencias</FieldLabel>
                <textarea
                  value={profile.preexistenciasMedicas}
                  rows={2}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      preexistenciasMedicas: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  placeholder="Ej. asma, alergias…"
                />
              </label>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard number={4} title="Motivo de cotización">
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {CLIENT_MOTIVO_COTIZACION_OPTIONS.map((option) => {
                const selected = motivoCotizacionIncludes(
                  profile.motivoCotizacion,
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
                        setProfile((current) => ({
                          ...current,
                          motivoCotizacion: toggleMotivoCotizacionId(
                            current.motivoCotizacion,
                            option.id,
                          ),
                        }))
                      }
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
            {motivoCotizacionIncludesOtros(profile.motivoCotizacion) ? (
              <label className="block space-y-1">
                <FieldLabel>Detalle de Otros</FieldLabel>
                <Input
                  value={profile.motivoCotizacionOther}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      motivoCotizacionOther: event.target.value,
                    }))
                  }
                  placeholder="Describe el motivo…"
                />
              </label>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard number={5} title="Observaciones del ejecutivo">
          <textarea
            value={pipelineNotes}
            rows={2}
            onChange={(event) => setPipelineNotes(event.target.value)}
            placeholder="Notas de la gestión o reunión…"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </SectionCard>

        <p className="text-xs text-muted">
          Podrás adjuntar documentos y completar la ficha del cliente después de guardar.
        </p>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving} variant="success">
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </AdminFormModal>
  );
}
