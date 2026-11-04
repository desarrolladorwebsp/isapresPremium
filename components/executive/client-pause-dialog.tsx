"use client";
import { useState } from "react";
import { AdminFormModal } from "@/components/admin/admin-data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { validatePause } from "@/lib/client-pipeline/pause";

const MONTHS = Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1).padStart(2,"0"), label: new Intl.DateTimeFormat("es-CL", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2000,index,1,12))) }));

export function ClientPauseDialog({ initialMonth, initialReason = "", annuality = false, onClose, onConfirm, onDecline }: {
  initialMonth: string;
  initialReason?: string;
  annuality?: boolean;
  onClose: () => void;
  onConfirm: (month: string, reason: string) => Promise<void>;
  onDecline?: () => void;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [reason, setReason] = useState(initialReason);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [year = "", number = ""] = month.split("-");
  async function confirm() {
    setError("");
    try {
      const validated = validatePause(month, reason);
      setBusy(true);
      await onConfirm(validated.month, validated.reason);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo pausar el cliente.");
    } finally { setBusy(false); }
  }
  return <AdminFormModal open title={annuality ? "¿Quieres pausar este cliente?" : "Pausar cliente"}
    description="Quedará fuera de las gestiones pendientes hasta el mes elegido. Entonces pasará a Pendiente para revisión, conservando su responsable."
    onClose={() => { if (!busy) onClose(); }} overlayClassName="z-[90]" size="md">
    <div className="space-y-4">
      <label className="block space-y-1.5 text-sm"><span>Motivo de la pausa *</span>
        <textarea value={reason} onChange={event => setReason(event.target.value)} disabled={busy} maxLength={1000} rows={3}
          className="w-full rounded-lg border bg-background px-3 py-2" placeholder="Ej. Anualidad o solicitud de contacto más adelante" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5 text-sm"><span>Mes para retomar *</span>
          <Select value={number} disabled={busy} options={MONTHS} onChange={event => setMonth(`${year}-${event.target.value}`)} />
        </label>
        <label className="block space-y-1.5 text-sm"><span>Año para retomar *</span>
          <Input value={year} disabled={busy} inputMode="numeric" maxLength={4} onChange={event => setMonth(`${event.target.value.replace(/\D/g,"").slice(0,4)}-${number}`)} />
        </label>
      </div>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" disabled={busy} onClick={onDecline ?? onClose}>{annuality ? "Guardar sin pausar" : "Cancelar"}</Button>
        <Button type="button" disabled={busy} onClick={() => void confirm()}>{busy ? "Guardando…" : "Pausar cliente"}</Button>
      </div>
    </div>
  </AdminFormModal>;
}
