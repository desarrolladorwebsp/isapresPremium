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
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
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
  const [pipelineNotes, setPipelineNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [rutErrors, setRutErrors] = useState<{
    titular?: string;
    dependents?: Record<string, string>;
  }>({});

  function handleClose() {
    setProfile(buildEmptyClientProfileFormValue());
    setClientOrigin("MANUAL");
    setPipelineNotes("");
    setRutErrors({});
    onClose();
  }

  function handleProfileChange(next: ClientProfileFormValue) {
    setProfile(next);
    if (rutErrors.titular || rutErrors.dependents) {
      setRutErrors({});
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const errors = getClientManagementRutErrors(
      { rut: profile.rut, dependents: profile.dependents },
      { requireTitularRut: true },
    );
    if (errors.firstMessage) {
      setRutErrors({
        titular: errors.titular,
        dependents: errors.dependents,
      });
      onNotify(errors.firstMessage, "error");
      return;
    }

    setSaving(true);
    try {
      const created = await createExecutiveClient({
        email: profile.email.trim(),
        phone: profile.phone.trim() || null,
        rut: profile.rut.trim() || null,
        firstNames: profile.firstNames.trim(),
        lastNames: profile.lastNames.trim(),
        birthDate: profile.birthDate || null,
        currentIsapre: profile.currentIsapre || null,
        heightCm: profile.heightCm || null,
        weightKg: profile.weightKg || null,
        maritalStatus: profile.maritalStatus || null,
        address: profile.address || null,
        commune: profile.commune || null,
        dependents: profile.dependents,
        pipelineNotes: pipelineNotes.trim() || null,
        clientOrigin,
      });
      onCreated(created);
      onNotify("Cliente registrado.");
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
      description="Registra los datos del titular y sus cargas. Esta información la gestiona el ejecutivo, independiente del cotizador."
      size="xl"
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Origen *</span>
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
          requireTitularRut
          rutErrors={rutErrors}
        />

        <label className="block space-y-2">
          <span className="text-sm font-medium">Notas iniciales</span>
          <textarea
            value={pipelineNotes}
            onChange={(event) => setPipelineNotes(event.target.value)}
            rows={3}
            placeholder="Ej. Referido por un cliente actual, interesado en plan familiar…"
            className={joinClasses("w-full rounded-xl px-3 py-2 text-sm", ui.input)}
          />
        </label>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving} variant="success">
            {saving ? "Guardando…" : "Registrar cliente"}
          </Button>
        </div>
      </form>
    </AdminFormModal>
  );
}
