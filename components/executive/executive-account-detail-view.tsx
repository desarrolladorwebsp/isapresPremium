"use client";

import { useMemo } from "react";
import {
  AdminPanel,
  AdminPanelHeader,
  AdminTable,
  AdminTableBody,
  AdminTableCard,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from "@/components/admin/admin-data-table";
import { ClientPipelineStatusBadge } from "@/components/executive/client-pipeline-status-badge";
import { ClientContactMethodBadge } from "@/components/executive/client-contact-method-badge";
import { IconArrowLeft } from "@/components/executive/executive-icons";
import { Button } from "@/components/ui/button";
import { useStaffSession } from "@/hooks/use-auth-session";
import { useExecutiveAccountsQuery } from "@/hooks/query/use-executive-accounts-query";
import { useExecutiveClientsQuery } from "@/hooks/query/use-executive-clients-query";
import { getStaffRoleLabel } from "@/lib/auth/staff-role";
import { CLIENT_PIPELINE_STATUS_LABELS } from "@/lib/client-pipeline/constants";
import { touchTarget, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { ExecutiveKind } from "@/types/staff-account";
import type { UserRecord } from "@/types/user";

export interface ExecutiveAccountDetailViewProps {
  executiveId: string;
  onBack: () => void;
  onOpenClient: (clientId: string) => void;
}

interface GestionEntry {
  id: string;
  clientId: string;
  clientName: string;
  text: string;
  sortKey: string;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function parsePipelineNoteLines(
  client: UserRecord,
): Array<{ text: string; sortKey: string }> {
  const notes = client.pipelineNotes?.trim();
  if (!notes) return [];

  const lines = notes
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  // Las notas se agregan al final: la última línea es la más reciente.
  return lines
    .map((line, index) => {
      const match = line.match(/^\[([^\]]+)\]\s*(.*)$/);
      const body = match?.[2]?.trim() || line;
      const stamp = match?.[1]?.trim() ?? "";
      return {
        text: stamp ? `${stamp} · ${body}` : body,
        sortKey: `${client.updatedAt}-${String(index).padStart(4, "0")}`,
      };
    })
    .reverse();
}

function buildGestiones(clients: UserRecord[]): GestionEntry[] {
  const entries: GestionEntry[] = [];

  for (const client of clients) {
    const noteLines = parsePipelineNoteLines(client);
    if (noteLines.length > 0) {
      for (const [index, line] of noteLines.entries()) {
        entries.push({
          id: `${client.id}-note-${index}`,
          clientId: client.id,
          clientName: client.fullName,
          text: line.text,
          sortKey: line.sortKey,
        });
      }
      continue;
    }

    if (client.lastCallOutcome?.trim()) {
      entries.push({
        id: `${client.id}-outcome`,
        clientId: client.id,
        clientName: client.fullName,
        text: client.lastCallOutcome.trim(),
        sortKey: client.updatedAt,
      });
    }
  }

  return entries.sort((a, b) => b.sortKey.localeCompare(a.sortKey)).slice(0, 40);
}

export function ExecutiveAccountDetailView({
  executiveId,
  onBack,
  onOpenClient,
}: ExecutiveAccountDetailViewProps) {
  const { isAdmin, user, executiveKind } = useStaffSession();
  const clientsQuery = useExecutiveClientsQuery();
  const executivesQuery = useExecutiveAccountsQuery({ enabled: isAdmin });

  const assignedClients = useMemo(
    () =>
      (clientsQuery.data ?? []).filter(
        (client) => client.assignedExecutiveId === executiveId,
      ),
    [clientsQuery.data, executiveId],
  );

  const account = useMemo(() => {
    if (isAdmin) {
      return (executivesQuery.data ?? []).find((row) => row.id === executiveId) ?? null;
    }
    if (user?.id === executiveId) {
      return {
        id: executiveId,
        fullName: user.fullName,
        executiveKind: executiveKind as ExecutiveKind | null,
      };
    }
    const fromClient = assignedClients[0];
    if (fromClient?.assignedExecutiveName) {
      return {
        id: executiveId,
        fullName: fromClient.assignedExecutiveName,
        executiveKind: null as ExecutiveKind | null,
      };
    }
    return null;
  }, [
    isAdmin,
    executivesQuery.data,
    executiveId,
    user,
    executiveKind,
    assignedClients,
  ]);

  const roleLabel = getStaffRoleLabel({
    realm: "executive",
    executiveKind: account?.executiveKind ?? null,
  });

  const gestiones = useMemo(
    () => buildGestiones(assignedClients),
    [assignedClients],
  );

  const loading =
    (clientsQuery.isLoading && !clientsQuery.data) ||
    (isAdmin && executivesQuery.isLoading && !executivesQuery.data);

  const displayName = account?.fullName ?? "Ejecutivo";

  return (
    <AdminPanel>
      <AdminPanelHeader
        title={displayName}
        description={`${roleLabel} · ${assignedClients.length} cliente${assignedClients.length === 1 ? "" : "s"} asignado${assignedClients.length === 1 ? "" : "s"}`}
        actions={
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={touchTarget}
            aria-label="Volver a clientes"
            title="Volver a clientes"
            onClick={onBack}
          >
            <IconArrowLeft className="size-4" />
            Volver
          </Button>
        }
      />

      {loading ? (
        <p className="text-sm text-muted">Cargando cartera del ejecutivo…</p>
      ) : (
        <div className="space-y-6">
          <div className={joinClasses(ui.surfaceCard, "space-y-3 p-4")}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Ejecutivo
              </p>
              <p className="mt-1 text-base font-semibold text-foreground">
                {displayName}
              </p>
              <p className="mt-0.5 text-sm text-muted">{roleLabel}</p>
            </div>
          </div>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Clientes asignados
              </h3>
              <p className="text-xs text-muted">
                Cartera actual del ejecutivo. Abre un cliente para ver o editar su
                gestión.
              </p>
            </div>

            {assignedClients.length === 0 ? (
              <p className="rounded-lg border border-border bg-white px-3 py-4 text-sm text-muted">
                Este ejecutivo no tiene clientes asignados.
              </p>
            ) : (
              <AdminTableCard>
                <AdminTable>
                  <AdminTableHead>
                    <tr>
                      <AdminTableHeaderCell>Cliente</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Estado</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Canal</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Próximo llamado</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Acción</AdminTableHeaderCell>
                    </tr>
                  </AdminTableHead>
                  <AdminTableBody>
                    {assignedClients.map((client) => (
                      <AdminTableRow key={client.id}>
                        <AdminTableCell>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                              {client.fullName}
                            </p>
                            <p className="truncate text-xs text-muted">
                              {client.email || client.phone || "Sin contacto"}
                            </p>
                          </div>
                        </AdminTableCell>
                        <AdminTableCell>
                          <ClientPipelineStatusBadge status={client.pipelineStatus} />
                        </AdminTableCell>
                        <AdminTableCell>
                          <ClientContactMethodBadge
                            method={client.preferredContactMethod}
                          />
                        </AdminTableCell>
                        <AdminTableCell>
                          <span className="text-sm tabular-nums text-foreground">
                            {formatDate(client.nextCallAt)}
                          </span>
                        </AdminTableCell>
                        <AdminTableCell>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => onOpenClient(client.id)}
                          >
                            Ver ficha
                          </Button>
                        </AdminTableCell>
                      </AdminTableRow>
                    ))}
                  </AdminTableBody>
                </AdminTable>
              </AdminTableCard>
            )}
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Gestiones del ejecutivo
              </h3>
              <p className="text-xs text-muted">
                Historial reciente de notas y resultados de contacto en su cartera.
              </p>
            </div>

            {gestiones.length === 0 ? (
              <p className="rounded-lg border border-border bg-white px-3 py-4 text-sm text-muted">
                Aún no hay gestiones registradas en estos clientes.
              </p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
                {gestiones.map((entry) => {
                  const client = assignedClients.find(
                    (row) => row.id === entry.clientId,
                  );
                  return (
                    <li key={entry.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenClient(entry.clientId)}
                          className="text-sm font-semibold text-primary-dark underline-offset-2 hover:underline"
                        >
                          {entry.clientName}
                        </button>
                        {client?.pipelineStatus ? (
                          <span className="text-[11px] text-muted">
                            {
                              CLIENT_PIPELINE_STATUS_LABELS[
                                client.pipelineStatus
                              ]
                            }
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-foreground">{entry.text}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </AdminPanel>
  );
}
