"use client";

import { useState } from "react";
import { AdminFormModal } from "@/components/admin/admin-data-table";
import { Button } from "@/components/ui/button";
import { ClientOriginBadge } from "@/components/executive/client-origin-badge";
import { updateClientPipeline } from "@/lib/api/admin-client";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import {
  CLIENT_ORIGIN_OPTIONS,
  isClientOrigin,
  type ClientOrigin,
  type UserRecord,
} from "@/types/user";

export interface ClientOriginEditorProps {
  client: UserRecord;
  onUpdated: (client: UserRecord) => void;
  onNotify: (message: string, tone?: "success" | "error") => void;
  /** Solo lectura (p. ej. seguimiento derivado). */
  readOnly?: boolean;
}

function originLabel(origin: ClientOrigin): string {
  return (
    CLIENT_ORIGIN_OPTIONS.find((option) => option.value === origin)?.label ??
    origin
  );
}

export function ClientOriginEditor({
  client,
  onUpdated,
  onNotify,
  readOnly = false,
}: ClientOriginEditorProps) {
  const currentOrigin: ClientOrigin = client.clientOrigin ?? "MANUAL";
  const [pendingOrigin, setPendingOrigin] = useState<ClientOrigin | null>(null);
  const [saving, setSaving] = useState(false);

  function handleSelectChange(nextValue: string) {
    if (!isClientOrigin(nextValue) || nextValue === currentOrigin) return;
    setPendingOrigin(nextValue);
  }

  function handleCancel() {
    if (saving) return;
    setPendingOrigin(null);
  }

  async function handleConfirm() {
    if (!pendingOrigin || pendingOrigin === currentOrigin) {
      setPendingOrigin(null);
      return;
    }

    setSaving(true);
    try {
      const updated = await updateClientPipeline(client.id, {
        clientOrigin: pendingOrigin,
      });
      onUpdated(updated);
      onNotify("Origen del cliente actualizado.");
      setPendingOrigin(null);
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el origen.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  if (readOnly) {
    return (
      <ClientOriginBadge
        origin={currentOrigin}
        cotizadorSource={client.cotizadorSource}
        webFormSource={client.webFormSource}
      />
    );
  }

  return (
    <>
      <label className="inline-flex max-w-full items-center gap-1.5">
        <span className="sr-only">Origen del cliente</span>
        <select
          value={currentOrigin}
          disabled={saving}
          onChange={(event) => handleSelectChange(event.target.value)}
          title="Cambiar origen del cliente (queda registro en notas)"
          aria-label="Origen del cliente"
          className={joinClasses(
            "h-7 max-w-[14rem] rounded-full px-2.5 text-xs font-semibold",
            ui.input,
            saving ? "opacity-60" : "",
          )}
        >
          {CLIENT_ORIGIN_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <AdminFormModal
        open={pendingOrigin != null}
        title="Cambiar origen del cliente"
        description={`¿Confirmas cambiar el origen de «${originLabel(currentOrigin)}» a «${originLabel(pendingOrigin ?? currentOrigin)}»? Quedará un registro en las notas del cliente.`}
        onClose={handleCancel}
        size="md"
      >
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={handleCancel}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={saving}
            onClick={() => void handleConfirm()}
          >
            {saving ? "Guardando…" : "Confirmar cambio"}
          </Button>
        </div>
      </AdminFormModal>
    </>
  );
}
