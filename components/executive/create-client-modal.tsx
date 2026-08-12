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
import { getClientManagementRutErrors } from "@/lib/client-profile/validate-client-ruts";
import { sanitizeRutInput } from "@/lib/auth/rut";
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
  const [saving, setSaving] = useState(false);
  const [titularRutError, setTitularRutError] = useState<string | undefined>();

  const displayName = [profile.firstNames, profile.lastNames]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");

  function handleClose() {
    setProfile(buildEmptyClientProfileFormValue());
    setClientOrigin("MANUAL");
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
        currentIsapre: null,
        currentPlanPrice: null,
        currentPlanPriceCurrency: "UF",
        voluntaryAdditional: null,
        voluntaryAdditionalCurrency: "UF",
        heightCm: null,
        weightKg: null,
        maritalStatus: null,
        employerRut: null,
        contributorType: null,
        rentaImponible: null,
        motivoCotizacion: null,
        motivoCotizacionOther: null,
        address: null,
        commune: null,
        coverageArea: null,
        coverageRegionId: null,
        preferredClinics: null,
        anualidad: false,
        anualidadComment: null,
        segurosComplementarios: null,
        preexistenciasMedicas: null,
        dependents: [],
        additionalTitulares: [],
        pipelineNotes: null,
        clientOrigin,
      });
      onNotify("Cliente registrado. Completa el resto en la ficha.");
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
      description="Registra los datos personales del titular. Al guardar se abre la ficha."
      size="md"
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

        <section className="space-y-3 rounded-xl border border-border bg-white p-3 sm:p-4">
          <header className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-dark text-xs font-bold text-white">
              1
            </span>
            <h3 className="text-sm font-bold uppercase tracking-wide text-primary-dark">
              Datos personales
            </h3>
          </header>

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
        </section>

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
