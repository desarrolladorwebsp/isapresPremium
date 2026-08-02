"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldHint, FieldLabel } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { slugifyClinicId } from "@/domain";
import { resolveClinicZoneIds } from "@/lib/clinic-zones";
import { ClinicZoneBadges } from "@/components/admin/clinic-plans-modal";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { Clinic } from "@/domain";

export interface ClinicFormProps {
  initialValue: Clinic;
  isEditing: boolean;
  saving: boolean;
  embedded?: boolean;
  onSubmit: (clinic: Clinic) => Promise<void>;
  onCancel: () => void;
}

export function ClinicForm({
  initialValue,
  isEditing,
  saving,
  embedded = false,
  onSubmit,
  onCancel,
}: ClinicFormProps) {
  const [form, setForm] = useState<Clinic>(initialValue);
  const [autoSlug, setAutoSlug] = useState(!isEditing);

  useEffect(() => {
    setForm(initialValue);
    setAutoSlug(!isEditing);
  }, [initialValue, isEditing]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const payload: Clinic = {
      id: form.id.trim(),
      name: form.name.trim(),
      zones:
        form.zones.length > 0
          ? form.zones
          : resolveClinicZoneIds(form.id.trim()),
    };

    if (!payload.name) return;

    if (!isEditing && !payload.id) {
      payload.id = slugifyClinicId(payload.name);
    }

    await onSubmit(payload);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={joinClasses(
        "space-y-5",
        embedded ? "" : joinClasses("rounded-xl border bg-white p-5 shadow-card sm:p-6", ui.border),
      )}
    >
      {embedded ? null : (
        <div>
          <h2 className="text-lg font-bold text-primary-dark">
            {isEditing ? "Editar clínica" : "Nueva clínica"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            El identificador se usa en las coberturas de los planes.
          </p>
        </div>
      )}

      <FieldGroup>
        <FieldLabel htmlFor="clinic-name">Nombre comercial</FieldLabel>
        <Input
          id="clinic-name"
          value={form.name}
          onChange={(event) => {
            const name = event.target.value;
            setForm((current) => ({
              ...current,
              name,
              id:
                autoSlug && !isEditing
                  ? slugifyClinicId(name)
                  : current.id,
            }));
          }}
          placeholder="Ej: Clínica RedSalud Vitacura"
          required
          className={joinClasses("h-11", ui.input)}
        />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel htmlFor="clinic-id">Identificador (slug)</FieldLabel>
        <Input
          id="clinic-id"
          value={form.id}
          onChange={(event) => {
            setAutoSlug(false);
            setForm((current) => ({ ...current, id: event.target.value }));
          }}
          placeholder="cl-redsalud-vitacura"
          required
          disabled={isEditing}
          className={joinClasses("h-11 font-mono text-sm", ui.input)}
        />
        {isEditing ? (
          <FieldHint>El identificador no se puede modificar.</FieldHint>
        ) : (
          <FieldHint>Se genera automáticamente desde el nombre.</FieldHint>
        )}
      </FieldGroup>

      {form.id.trim() ? (
        <FieldGroup>
          <FieldLabel>Zonas geográficas</FieldLabel>
          <ClinicZoneBadges
            zoneIds={
              form.zones.length > 0
                ? form.zones
                : resolveClinicZoneIds(form.id.trim())
            }
          />
          <FieldHint>
            Se asignan automáticamente según el catálogo de zonas. Al guardar se
            persisten en la clínica.
          </FieldHint>
        </FieldGroup>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear clínica"}
        </Button>
      </div>
    </form>
  );
}
