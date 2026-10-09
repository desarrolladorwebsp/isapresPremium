"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  AdminBadge,
  AdminPanel,
  AdminPanelHeader,
  AdminRefreshButton,
  AdminTable,
  AdminTableBody,
  AdminTableCard,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from "@/components/admin/admin-data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createSendpulseLineAdmin,
  fetchSendpulseEvents,
  fetchSendpulseLines,
  revokeSendpulseLineAdmin,
  rotateSendpulseLineAdmin,
} from "@/lib/api/admin-client";
import { SENDPULSE_TRIGGERS } from "@/lib/sendpulse/triggers";
import type {
  SendpulseEventRecord,
  SendpulseLineRecord,
} from "@/types/sendpulse";

export interface SendpulseLinesPanelProps {
  onNotify: (message: string, tone?: "success" | "error") => void;
}

type RevealedToken = {
  token: string;
  botPhone: string;
  label: string;
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function outcomeTone(
  outcome: string,
): "success" | "warning" | "danger" | "neutral" | "info" {
  if (outcome === "OK" || outcome === "DUPLICATE") return "success";
  if (outcome === "EMAIL_FAILED" || outcome === "UNAVAILABLE") return "danger";
  if (outcome === "RATE_LIMITED") return "warning";
  if (outcome === "INVALID_TOKEN" || outcome === "INVALID_PAYLOAD") return "warning";
  return "neutral";
}

export function SendpulseLinesPanel({ onNotify }: SendpulseLinesPanelProps) {
  const [lines, setLines] = useState<SendpulseLineRecord[]>([]);
  const [events, setEvents] = useState<SendpulseEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState("");
  const [botPhone, setBotPhone] = useState("");
  const [revealed, setRevealed] = useState<RevealedToken | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextLines, nextEvents] = await Promise.all([
        fetchSendpulseLines(),
        fetchSendpulseEvents(),
      ]);
      setLines(nextLines);
      setEvents(nextEvents);
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo cargar SendPulse.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const created = await createSendpulseLineAdmin({
        label,
        botPhone,
      });
      setRevealed({
        token: created.token,
        botPhone: created.line.botPhone,
        label: created.line.label,
      });
      setLabel("");
      setBotPhone("");
      onNotify("Token creado. Cópialo ahora: no se vuelve a mostrar.", "success");
      await load();
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo crear la línea.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRotate(line: SendpulseLineRecord) {
    if (
      !window.confirm(
        `Rotar el token de ${line.label}? El token anterior deja de funcionar.`,
      )
    ) {
      return;
    }
    setBusyId(line.id);
    try {
      const rotated = await rotateSendpulseLineAdmin(line.id);
      setRevealed({
        token: rotated.token,
        botPhone: rotated.line.botPhone,
        label: rotated.line.label,
      });
      onNotify("Token nuevo. Cópialo ahora: no se vuelve a mostrar.", "success");
      await load();
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo rotar el token.",
        "error",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleRevoke(line: SendpulseLineRecord) {
    if (!window.confirm(`Revocar la línea ${line.label}? SendPulse dejará de poder avisar.`)) {
      return;
    }
    setBusyId(line.id);
    try {
      await revokeSendpulseLineAdmin(line.id);
      onNotify("Línea revocada.", "success");
      await load();
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo revocar la línea.",
        "error",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      onNotify("Copiado.", "success");
    } catch {
      onNotify("No se pudo copiar.", "error");
    }
  }

  return (
    <AdminPanel>
      <AdminPanelHeader
        title="SendPulse"
        description="Un token por número de WhatsApp. El disparador avisa por correo y queda registrado aquí. Todavía no crea el cliente en el CRM."
        actions={<AdminRefreshButton onClick={() => void load()} loading={loading} />}
      />

      <form
        onSubmit={(event) => void handleCreate(event)}
        className="grid gap-3 rounded-xl border border-border bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-foreground">Nombre de la línea</span>
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="WhatsApp ventas"
            maxLength={80}
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-foreground">Teléfono del bot</span>
          <Input
            value={botPhone}
            onChange={(event) => setBotPhone(event.target.value)}
            placeholder="+56999999999"
            inputMode="tel"
            required
          />
        </label>
        <Button type="submit" disabled={saving}>
          {saving ? "Creando…" : "Crear token"}
        </Button>
      </form>

      {revealed ? (
        <div className="grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <p className="font-semibold">
            Token de {revealed.label}. Pégalo en SendPulse y no lo vuelvas a pedir: aquí solo queda el prefijo.
          </p>
          <code className="break-all rounded-md bg-white px-3 py-2 text-xs">
            Authorization: Bearer {revealed.token}
          </code>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => void copyText(revealed.token)}>
              Copiar token
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() =>
                void copyText(
                  JSON.stringify(
                    {
                      id: "{{contact_id}}",
                      nombre: "{{name}}",
                      telefono: "{{phone}}",
                      bot: revealed.botPhone,
                      disparador: "contratar",
                    },
                    null,
                    2,
                  ),
                )
              }
            >
              Copiar JSON
            </Button>
          </div>
          <p>
            En el flujo usa el elemento <strong>Solicitud API</strong>, método POST, a{" "}
            <code>https://isaprespremium.cl/api/webhooks/sendpulse</code>. Solo{" "}
            <code>id</code> es obligatorio. El campo <code>bot</code> puede ir fijo en{" "}
            <code>{revealed.botPhone}</code>. <code>disparador</code> es una de estas claves:{" "}
            {Object.entries(SENDPULSE_TRIGGERS)
              .map(([key, text]) => `${key} (${text})`)
              .join(", ")}
            .
          </p>
        </div>
      ) : null}

      <AdminTableCard>
        <AdminTable>
          <AdminTableHead>
            <AdminTableRow>
              <AdminTableHeaderCell>Línea</AdminTableHeaderCell>
              <AdminTableHeaderCell>Bot</AdminTableHeaderCell>
              <AdminTableHeaderCell>Token</AdminTableHeaderCell>
              <AdminTableHeaderCell>Estado</AdminTableHeaderCell>
              <AdminTableHeaderCell>Último uso</AdminTableHeaderCell>
              <AdminTableHeaderCell>Acciones</AdminTableHeaderCell>
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {lines.length === 0 ? (
              <AdminTableRow>
                <AdminTableCell>
                  {loading ? "Cargando líneas…" : "Todavía no hay líneas."}
                </AdminTableCell>
              </AdminTableRow>
            ) : (
              lines.map((line) => (
                <AdminTableRow key={line.id}>
                  <AdminTableCell>{line.label}</AdminTableCell>
                  <AdminTableCell>{line.botPhone}</AdminTableCell>
                  <AdminTableCell>
                    <code>{line.tokenPrefix}…</code>
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminBadge tone={line.active ? "success" : "danger"}>
                      {line.active ? "Activa" : "Revocada"}
                    </AdminBadge>
                  </AdminTableCell>
                  <AdminTableCell>{formatWhen(line.lastUsedAt)}</AdminTableCell>
                  <AdminTableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={busyId === line.id}
                        onClick={() => void handleRotate(line)}
                      >
                        Rotar token
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        disabled={!line.active || busyId === line.id}
                        onClick={() => void handleRevoke(line)}
                      >
                        Revocar
                      </Button>
                    </div>
                  </AdminTableCell>
                </AdminTableRow>
              ))
            )}
          </AdminTableBody>
        </AdminTable>
      </AdminTableCard>

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Conexiones</h2>
        <p className="text-sm text-foreground/70">
          Cada aviso, también los rechazados. OK significa que el correo salió. Duplicado significa que el mismo contacto y disparador ya se habían avisado en los últimos 10 minutos.
        </p>
        <AdminTableCard>
          <AdminTable>
            <AdminTableHead>
              <AdminTableRow>
                <AdminTableHeaderCell>Cuándo</AdminTableHeaderCell>
                <AdminTableHeaderCell>Línea</AdminTableHeaderCell>
                <AdminTableHeaderCell>Disparador</AdminTableHeaderCell>
                <AdminTableHeaderCell>Contacto</AdminTableHeaderCell>
                <AdminTableHeaderCell>Resultado</AdminTableHeaderCell>
                <AdminTableHeaderCell>Detalle</AdminTableHeaderCell>
              </AdminTableRow>
            </AdminTableHead>
            <AdminTableBody>
              {events.length === 0 ? (
                <AdminTableRow>
                  <AdminTableCell>
                    {loading ? "Cargando conexiones…" : "Todavía no hay conexiones."}
                  </AdminTableCell>
                </AdminTableRow>
              ) : (
                events.map((event) => (
                  <AdminTableRow key={event.id}>
                    <AdminTableCell>{formatWhen(event.createdAt)}</AdminTableCell>
                    <AdminTableCell>
                      {event.lineLabel ?? event.botPhone ?? "—"}
                    </AdminTableCell>
                    <AdminTableCell>
                      {event.triggerLabel ?? event.triggerKey ?? "—"}
                    </AdminTableCell>
                    <AdminTableCell>
                      <div>{event.contactName || "Sin nombre"}</div>
                      <div className="text-xs text-foreground/70">
                        {event.contactPhone ?? "—"}
                        {event.contactId ? ` · ${event.contactId}` : ""}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <AdminBadge tone={outcomeTone(event.outcome)}>
                        {event.outcomeLabel}
                      </AdminBadge>
                    </AdminTableCell>
                    <AdminTableCell>{event.errorMessage ?? "—"}</AdminTableCell>
                  </AdminTableRow>
                ))
              )}
            </AdminTableBody>
          </AdminTable>
        </AdminTableCard>
      </div>
    </AdminPanel>
  );
}
