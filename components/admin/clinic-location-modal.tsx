"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldHint, FieldLabel } from "@/components/ui/form-field";
import { AdminBadge } from "@/components/admin/admin-data-table";
import {
  GooglePlacesAddressInput,
  type GooglePlacesSelection,
} from "@/components/maps/google-places-address-input";
import {
  clearClinicLocation,
  updateClinicLocation,
} from "@/lib/api/admin-client";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { Clinic } from "@/domain";

export interface ClinicLocationModalContentProps {
  clinic: Clinic;
  onSaved: () => Promise<void>;
  onNotify: (message: string, tone?: "success" | "error") => void;
  onClose: () => void;
}

function googleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function ClinicLocationModalContent({
  clinic,
  onSaved,
  onNotify,
  onClose,
}: ClinicLocationModalContentProps) {
  const [address, setAddress] = useState(clinic.location?.address ?? "");
  const [selectedPlace, setSelectedPlace] =
    useState<GooglePlacesSelection | null>(null);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Clinic["location"] | null>(null);

  useEffect(() => {
    setAddress(clinic.location?.address ?? "");
    setSelectedPlace(null);
    setError(null);
    setConfirmed(null);
  }, [clinic]);

  const current = confirmed ?? clinic.location ?? null;

  async function handleSave() {
    if (!selectedPlace) {
      setError(
        "Selecciona una dirección de la lista sugerida por Google Maps. No se aceptan direcciones escritas a mano.",
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await updateClinicLocation(clinic.id, selectedPlace);
      setConfirmed(result.location ?? null);
      setSelectedPlace(null);
      onNotify("Dirección validada y actualizada en el mapa.");
      await onSaved();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo validar la dirección.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    const ok = window.confirm(
      "¿Quitar la ubicación de esta clínica? Dejará de aparecer en el mapa.",
    );
    if (!ok) return;

    setClearing(true);
    setError(null);
    try {
      await clearClinicLocation(clinic.id);
      setConfirmed(null);
      setAddress("");
      setSelectedPlace(null);
      onNotify("Ubicación eliminada.");
      await onSaved();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar la ubicación.",
      );
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="space-y-5">
      <div
        className={joinClasses(
          "rounded-xl border bg-bg-layout/60 p-4",
          ui.border,
        )}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Ubicación actual
        </p>
        {current ? (
          <div className="mt-2 space-y-1.5">
            <p className="text-sm font-medium text-foreground">
              {current.address}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>
                {current.lat.toFixed(5)}, {current.lng.toFixed(5)}
              </span>
              <AdminBadge tone={current.source === "manual" ? "info" : "neutral"}>
                {current.source === "manual"
                  ? "Editada manualmente"
                  : current.source === "curated"
                    ? "Verificada"
                    : "Geocodificada"}
              </AdminBadge>
              <a
                href={googleMapsLink(current.lat, current.lng)}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline underline-offset-2"
              >
                Ver en el mapa
              </a>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">
            Esta clínica aún no tiene una dirección asignada al mapa.
          </p>
        )}
      </div>

      <FieldGroup>
        <FieldLabel htmlFor="clinic-address">Nueva dirección</FieldLabel>
        <GooglePlacesAddressInput
          id="clinic-address"
          value={address}
          onValueChange={setAddress}
          onPlaceSelect={setSelectedPlace}
          placeholder="Ej: Av. Providencia 2653, Providencia, Santiago"
          className={joinClasses("h-11", ui.input)}
          disabled={saving || clearing}
        />
        <FieldHint>
          Escribe y elige una dirección de las sugerencias de Google Maps. Solo
          se guardan ubicaciones reales verificadas en Chile.
        </FieldHint>
        {selectedPlace ? (
          <p className="text-xs font-medium text-emerald-800" role="status">
            Dirección verificada: {selectedPlace.lat.toFixed(5)},{" "}
            {selectedPlace.lng.toFixed(5)}
          </p>
        ) : address.trim() ? (
          <p className="text-xs text-amber-800" role="status">
            Debes seleccionar una opción de la lista de Google Maps para
            continuar.
          </p>
        ) : null}
      </FieldGroup>

      {error ? (
        <div
          className={joinClasses(
            "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700",
          )}
        >
          {error}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {clinic.location ? (
          <Button
            type="button"
            variant="danger"
            onClick={() => void handleClear()}
            disabled={clearing || saving}
          >
            {clearing ? "Quitando…" : "Quitar ubicación"}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || clearing || !selectedPlace}
          >
            {saving ? "Validando…" : "Validar y guardar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
