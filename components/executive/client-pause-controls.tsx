"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClientPauseDialog } from "@/components/executive/client-pause-dialog";
import { updateClientPipeline } from "@/lib/api/admin-client";
import { defaultPauseMonth } from "@/lib/client-pipeline/pause";
import { formatAnnualityMonth } from "@/lib/client-profile/annuality";
import type { UserRecord } from "@/types/user";

/** Available from the overview, including viewers who only have Seguimiento access. */
export function ClientPauseControls({ client, onUpdated, onNotify }: {
  client: UserRecord;
  onUpdated: (client: UserRecord) => void;
  onNotify: (message: string, tone?: "success" | "error") => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const paused = client.pipelineStatus === "PAUSADO";
  async function resume() {
    setBusy(true);
    try {
      const updated = await updateClientPipeline(client.id, { pipelineStatus: "PENDIENTE", manualStatusChange: true, statusChangeNote: "Reactivación manual desde la ficha del cliente" });
      onUpdated(updated);
      onNotify("Cliente pendiente de revisión.");
    } catch (error) { onNotify(error instanceof Error ? error.message : "No se pudo reactivar el cliente.", "error"); }
    finally { setBusy(false); }
  }
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white p-3">
    <p className="text-sm text-muted">{paused ? `En pausa hasta ${formatAnnualityMonth(client.pauseUntilMonth ?? "")}. ${client.pauseReason ?? ""}` : "Puedes retomar el contacto en un mes posterior sin marcarlo como perdido."}</p>
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setOpen(true)}>{paused ? "Editar pausa" : "Pausar cliente"}</Button>
      {paused ? <Button type="button" size="sm" disabled={busy} onClick={() => void resume()}>Reactivar a Pendiente</Button> : null}
    </div>
    {open ? <ClientPauseDialog initialMonth={defaultPauseMonth(client)} initialReason={paused ? client.pauseReason ?? "" : client.clientProfile?.anualidad ? "Anualidad" : ""}
      onClose={() => setOpen(false)} onConfirm={async (month, reason) => {
        const updated = await updateClientPipeline(client.id, { pipelineStatus: "PAUSADO", manualStatusChange: true, statusChangeNote: reason, pauseUntilMonth: month, pauseReason: reason });
        onUpdated(updated); setOpen(false); onNotify("Cliente en pausa.");
      }} /> : null}
  </div>;
}
