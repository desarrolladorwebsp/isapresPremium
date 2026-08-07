"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { AdminFormModal } from "@/components/admin/admin-data-table";
import {
  ClientProfileForm,
  buildEmptyClientProfileFormValue,
  type ClientProfileFormValue,
} from "@/components/executive/client-profile-form";
import { createExecutiveClient } from "@/lib/api/admin-client";
import { getClientManagementRutErrors } from "@/lib/client-profile/validate-client-ruts";
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
  const [rutErrors, setRutErrors] = useState<{
    titular?: string;
  }>({});

  function handleClose() {
    setProfile(buildEmptyClientProfileFormValue());
    setClientOrigin("MANUAL");
    setRutErrors({});
    onClose();
  }

  function handleProfileChange(next: ClientProfileFormValue) {
    setProfile({
      ...next,
      // Alta rápida: solo titular principal; el resto se completa en la ficha.
      dependents: [],
      additionalTitulares: [],
    });
    if (rutErrors.titular) {
      setRutErrors({});
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const errors = getClientManagementRutErrors(
      {
        rut: profile.rut,
        dependents: [],
        additionalTitulares: [],
      },
      { requireTitularRut: false },
    );
    if (errors.firstMessage) {
      setRutErrors({
        titular: errors.titular,
      });
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
        currentIsapre: profile.currentIsapre || null,
        currentPlanPrice: profile.currentPlanPrice.trim() || null,
        currentPlanPriceCurrency: profile.currentPlanPriceCurrency || "UF",
        voluntaryAdditional: profile.voluntaryAdditional.trim() || null,
        voluntaryAdditionalCurrency:
          profile.voluntaryAdditionalCurrency || "UF",
        heightCm: profile.heightCm || null,
        weightKg: profile.weightKg || null,
        maritalStatus: profile.maritalStatus || null,
        employerRut: profile.employerRut.trim() || null,
        rentaImponible: profile.rentaImponible.trim() || null,
        motivoCotizacion: profile.motivoCotizacion || null,
        motivoCotizacionOther:
          profile.motivoCotizacion === "otros"
            ? profile.motivoCotizacionOther.trim() || null
            : null,
        address: profile.address || null,
        commune: profile.commune || null,
        coverageArea: profile.coverageArea || null,
        coverageRegionId: profile.coverageRegionId || null,
        preferredClinics: profile.preferredClinics.trim() || null,
        anualidad: profile.anualidad,
        anualidadComment: profile.anualidad
          ? null
          : profile.anualidadComment.trim() || null,
        segurosComplementarios: profile.segurosComplementarios.trim() || null,
        preexistenciasMedicas: profile.preexistenciasMedicas.trim() || null,
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
        error instanceof Error ? error.message : "No se pudo registrar el cliente.",
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
      description="Registra al titular principal. Al guardar se abre la ficha para completar el resto de datos."
      size="xl"
    >
      <form className="premium-client-form space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-primary-dark">Origen *</span>
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

        <ClientProfileForm
          value={profile}
          onChange={handleProfileChange}
          rutErrors={rutErrors}
          sections={["principal"]}
        />

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving} variant="success">
            {saving ? "Guardando…" : "Guardar y abrir ficha"}
          </Button>
        </div>
      </form>
    </AdminFormModal>
  );
}
