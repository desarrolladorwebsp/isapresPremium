"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  IconEye,
  IconUserPlus,
  IconUsers,
  IconWhatsApp,
} from "@/components/executive/executive-icons";
import {
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
  AdminRowActions,
  AdminToolbar,
  AdminFormModal,
  TableCellStack,
} from "@/components/admin/admin-data-table";
import {
  assignClientToExecutive,
  distributeUnassignedClients,
} from "@/lib/api/admin-client";
import { useStaffSession } from "@/hooks/use-auth-session";
import { useExecutiveAccountsQuery } from "@/hooks/query/use-executive-accounts-query";
import { useExecutiveClientsQuery } from "@/hooks/query/use-executive-clients-query";
import {
  invalidateExecutiveClients,
  upsertExecutiveClientCache,
} from "@/lib/query/executive-cache";
import { ClientPipelineStatusBadge } from "@/components/executive/client-pipeline-status-badge";
import { ClientPlanSummary } from "@/components/executive/client-plan-summary";
import { ClientOriginBadge } from "@/components/executive/client-origin-badge";
import { ClientContactMethodBadge } from "@/components/executive/client-contact-method-badge";
import { ClientRutCell } from "@/components/executive/client-rut-cell";
import { CotizadorSourceBadge } from "@/components/executive/cotizador-source-badge";
import { CreateClientModal } from "@/components/executive/create-client-modal";
import { ExecutiveAccountDetailView } from "@/components/executive/executive-account-detail-view";
import { ExecutiveClientDetailView } from "@/components/executive/executive-client-detail-view";
import { buildClientWhatsAppMessage } from "@/lib/client-pipeline/constants";
import { buildWhatsAppUrl } from "@/lib/partner-entity/theme";
import {
  STAFF_CLIENT_ID_QUERY,
  STAFF_EXECUTIVE_ID_QUERY,
  staffClientHref,
  staffExecutiveHref,
  staffSectionHref,
} from "@/lib/staff/staff-sections";
import { touchTarget, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { UserRecord } from "@/types/user";

export interface ExecutiveClientsPanelProps {
  onNotify: (message: string, tone?: "success" | "error") => void;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatNextCallAt(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function ExecutiveClientsPanel({
  onNotify,
}: ExecutiveClientsPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { isAdmin } = useStaffSession();
  const clientsQuery = useExecutiveClientsQuery();
  const executivesQuery = useExecutiveAccountsQuery({ enabled: isAdmin });

  const detailClientId = searchParams.get(STAFF_CLIENT_ID_QUERY)?.trim() || null;
  const detailExecutiveId =
    searchParams.get(STAFF_EXECUTIVE_ID_QUERY)?.trim() || null;

  const clients = clientsQuery.data;
  const executives = executivesQuery.data ?? [];
  const loading =
    (clientsQuery.isLoading && !clients) ||
    (isAdmin && executivesQuery.isLoading && !executivesQuery.data);
  const isFetching = clientsQuery.isFetching || executivesQuery.isFetching;

  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [distributing, setDistributing] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [pendingExecutiveByClientId, setPendingExecutiveByClientId] = useState<
    Record<string, string>
  >({});
  const [distributeConfirmOpen, setDistributeConfirmOpen] = useState(false);

  function openClientFicha(clientId: string, executiveId?: string) {
    router.replace(
      staffClientHref(clientId, {
        executiveId: executiveId ?? detailExecutiveId ?? undefined,
      }),
      { scroll: false },
    );
  }

  function closeClientFicha() {
    if (detailExecutiveId) {
      router.replace(staffExecutiveHref(detailExecutiveId), { scroll: false });
      return;
    }
    router.replace(staffSectionHref("clientes"), { scroll: false });
  }

  function closeExecutiveFicha() {
    router.replace(staffSectionHref("clientes"), { scroll: false });
  }

  useEffect(() => {
    if (clientsQuery.isError) {
      onNotify(
        clientsQuery.error instanceof Error
          ? clientsQuery.error.message
          : "No se pudieron cargar los clientes.",
        "error",
      );
    }
  }, [clientsQuery.isError, clientsQuery.error, onNotify]);

  const filteredClients = useMemo(() => {
    const rows = clients ?? [];
    const query = search.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((client) =>
      [
        client.fullName,
        client.email,
        client.phone,
        client.rut,
        client.cotizadorSource?.label,
        client.cotizadorSource?.slug,
        client.cotizadorSource?.description,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [clients, search]);

  const unassignedCount = useMemo(
    () => (clients ?? []).filter((client) => !client.assignedExecutiveId).length,
    [clients],
  );

  if (detailClientId) {
    return (
      <ExecutiveClientDetailView
        clientId={detailClientId}
        onBack={closeClientFicha}
        onNotify={onNotify}
      />
    );
  }

  if (detailExecutiveId) {
    return (
      <ExecutiveAccountDetailView
        executiveId={detailExecutiveId}
        onBack={closeExecutiveFicha}
        onOpenClient={(clientId) => openClientFicha(clientId, detailExecutiveId)}
      />
    );
  }

  async function handleRefresh() {
    await Promise.all([
      clientsQuery.refetch(),
      isAdmin ? executivesQuery.refetch() : Promise.resolve(),
    ]);
  }

  async function handleAssignExecutive(
    client: UserRecord,
    executiveAccountId: string | null,
  ) {
    setSavingId(client.id);
    try {
      const updated = await assignClientToExecutive(client.id, executiveAccountId);
      upsertExecutiveClientCache(queryClient, updated);
      void invalidateExecutiveClients(queryClient);
      setPendingExecutiveByClientId((current) => {
        const next = { ...current };
        delete next[client.id];
        return next;
      });
      onNotify(
        executiveAccountId
          ? `Cliente asignado a ${updated.assignedExecutiveName ?? "ejecutivo"}.`
          : "Cliente sin ejecutivo asignado.",
      );
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudo asignar el ejecutivo.",
        "error",
      );
    } finally {
      setSavingId(null);
    }
  }

  function handlePendingExecutiveChange(clientId: string, executiveAccountId: string) {
    setPendingExecutiveByClientId((current) => ({
      ...current,
      [clientId]: executiveAccountId,
    }));
  }

  function cancelPendingExecutiveChange(clientId: string) {
    setPendingExecutiveByClientId((current) => {
      const next = { ...current };
      delete next[clientId];
      return next;
    });
  }

  function resolveExecutiveLabel(executiveAccountId: string): string {
    if (!executiveAccountId) return "Sin asignar";
    return (
      executives.find((executive) => executive.id === executiveAccountId)?.fullName ??
      "el ejecutivo seleccionado"
    );
  }

  async function handleDistributeUnassigned() {
    setDistributing(true);
    try {
      const result = await distributeUnassignedClients();
      onNotify(result.message, result.assigned > 0 ? "success" : "error");
      setDistributeConfirmOpen(false);
      await invalidateExecutiveClients(queryClient);
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudieron asignar los clientes pendientes.",
        "error",
      );
    } finally {
      setDistributing(false);
    }
  }

  return (
    <AdminPanel>
      <AdminPanelHeader
        title="Clientes"
        compactMobile
        actions={
          <>
            <AdminRefreshButton
              compactMobile
              loading={isFetching && !loading}
              onClick={() => void handleRefresh()}
            />
            <Button
              size="sm"
              variant="success"
              onClick={() => setCreateModalOpen(true)}
              aria-label="Agregar cliente"
              title="Agregar cliente"
              className={joinClasses(
                touchTarget,
                "px-0 sm:h-9 sm:min-h-9 sm:min-w-0 sm:px-3",
              )}
            >
              <IconUserPlus className="size-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Agregar cliente</span>
            </Button>
            {isAdmin && unassignedCount > 0 ? (
              <Button
                size="sm"
                variant="warning"
                disabled={distributing}
                onClick={() => setDistributeConfirmOpen(true)}
                aria-label={
                  distributing
                    ? "Asignando pendientes"
                    : `Asignar pendientes (${unassignedCount})`
                }
                title={
                  distributing
                    ? "Asignando…"
                    : `Asignar pendientes (${unassignedCount})`
                }
                className={joinClasses(
                  touchTarget,
                  "relative px-0 sm:h-9 sm:min-h-9 sm:min-w-0 sm:px-3",
                )}
              >
                <IconUsers className="size-4 sm:mr-1.5" />
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-700 px-1 text-[10px] font-bold text-white sm:hidden">
                  {unassignedCount}
                </span>
                <span className="hidden sm:inline">
                  {distributing
                    ? "Asignando…"
                    : `Asignar pendientes (${unassignedCount})`}
                </span>
              </Button>
            ) : null}
          </>
        }
      />

      <AdminToolbar>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre, correo, teléfono o RUT…"
          className={joinClasses("h-11", ui.input)}
        />
      </AdminToolbar>

      <AdminTableCard
        loading={loading}
        empty={!loading && filteredClients.length === 0}
        emptyTitle="Aún no tienes clientes"
        emptyDescription={
          isAdmin
            ? "Los clientes aparecerán cuando soliciten cotizaciones o cuando un ejecutivo los registre manualmente."
            : "Agrega clientes que captaste por tu cuenta o espera leads asignados desde el cotizador."
        }
        loadingMessage="Cargando clientes…"
        footer={`Mostrando ${filteredClients.length} de ${(clients ?? []).length} clientes.`}
      >
        <AdminTable minWidth={isAdmin ? "72rem" : "64rem"}>
          <AdminTableHead>
            <tr>
              <AdminTableHeaderCell>Cliente</AdminTableHeaderCell>
              <AdminTableHeaderCell>Origen</AdminTableHeaderCell>
              {isAdmin ? (
                <AdminTableHeaderCell>Cotizador</AdminTableHeaderCell>
              ) : null}
              <AdminTableHeaderCell>Plan</AdminTableHeaderCell>
              <AdminTableHeaderCell>Contacto</AdminTableHeaderCell>
              <AdminTableHeaderCell>RUT</AdminTableHeaderCell>
              {isAdmin ? (
                <AdminTableHeaderCell>Ejecutivo</AdminTableHeaderCell>
              ) : null}
              <AdminTableHeaderCell>Registro</AdminTableHeaderCell>
              <AdminTableHeaderCell>Acciones</AdminTableHeaderCell>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {filteredClients.map((client) => (
              <AdminTableRow key={client.id}>
                <AdminTableCell className="min-w-[11rem]">
                  <TableCellStack>
                    <p className="font-semibold leading-tight text-foreground">
                      {client.fullName}
                    </p>
                    <ClientPipelineStatusBadge status={client.pipelineStatus} />
                    <ClientContactMethodBadge
                      method={client.preferredContactMethod}
                    />
                    {formatNextCallAt(client.nextCallAt) ? (
                      <p className="text-[11px] leading-tight text-primary-dark">
                        Próximo llamado: {formatNextCallAt(client.nextCallAt)}
                      </p>
                    ) : null}
                  </TableCellStack>
                </AdminTableCell>
                <AdminTableCell className="whitespace-nowrap">
                  <TableCellStack>
                    <ClientOriginBadge
                      origin={client.clientOrigin}
                      cotizadorSource={client.cotizadorSource}
                    />
                  </TableCellStack>
                </AdminTableCell>
                {isAdmin ? (
                  <AdminTableCell className="min-w-[8rem]">
                    <CotizadorSourceBadge
                      source={client.cotizadorSource}
                      compact
                    />
                  </AdminTableCell>
                ) : null}
                <AdminTableCell className="min-w-[12rem]">
                  <ClientPlanSummary
                    requestedPlan={client.requestedPlan}
                    advisedPlan={client.advisedPlan}
                    compact
                  />
                </AdminTableCell>
                <AdminTableCell className="min-w-[10rem]">
                  <TableCellStack>
                    <p className="truncate text-sm leading-tight">{client.email}</p>
                    <p className="text-xs leading-tight text-muted">
                      {client.phone ?? "Sin teléfono"}
                    </p>
                  </TableCellStack>
                </AdminTableCell>
                <AdminTableCell className="whitespace-nowrap">
                  <ClientRutCell rut={client.rut} />
                </AdminTableCell>
                {isAdmin ? (
                  <AdminTableCell className="min-w-[11rem]">
                    {(() => {
                      const currentExecutiveId = client.assignedExecutiveId ?? "";
                      const selectedExecutiveId =
                        pendingExecutiveByClientId[client.id] ?? currentExecutiveId;
                      const hasPendingChange =
                        selectedExecutiveId !== currentExecutiveId;

                      return (
                        <TableCellStack className="gap-2">
                          <select
                            value={selectedExecutiveId}
                            disabled={savingId === client.id}
                            onChange={(event) => {
                              handlePendingExecutiveChange(
                                client.id,
                                event.target.value,
                              );
                            }}
                            className={joinClasses(
                              "h-9 w-full min-w-[10rem] rounded-lg px-2 text-sm",
                              ui.input,
                              hasPendingChange ? "ring-2 ring-primary/25" : "",
                            )}
                            aria-label={`Asignar ejecutivo a ${client.fullName}`}
                          >
                            <option value="">Sin asignar</option>
                            {executives.map((executive) => (
                              <option key={executive.id} value={executive.id}>
                                {executive.fullName}
                              </option>
                            ))}
                          </select>

                          {hasPendingChange ? (
                            <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
                              <p className="text-[11px] leading-snug text-muted">
                                {selectedExecutiveId
                                  ? `¿Confirmas asignar a ${client.fullName} al ejecutivo ${resolveExecutiveLabel(selectedExecutiveId)}?`
                                  : `¿Confirmas dejar a ${client.fullName} sin ejecutivo asignado?`}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="primary"
                                  disabled={savingId === client.id}
                                  onClick={() => {
                                    void handleAssignExecutive(
                                      client,
                                      selectedExecutiveId || null,
                                    );
                                  }}
                                >
                                  Confirmar
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={savingId === client.id}
                                  onClick={() =>
                                    cancelPendingExecutiveChange(client.id)
                                  }
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </TableCellStack>
                      );
                    })()}
                  </AdminTableCell>
                ) : null}
                <AdminTableCell className="whitespace-nowrap">
                  <TableCellStack>
                    <span className="text-sm tabular-nums">
                      {formatDate(client.createdAt)}
                    </span>
                  </TableCellStack>
                </AdminTableCell>
                <AdminTableCell>
                  <AdminRowActions className="flex-nowrap">
                    {client.phone ? (
                      <a
                        href={buildWhatsAppUrl(
                          client.phone,
                          buildClientWhatsAppMessage(client.fullName),
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" variant="whatsapp">
                          <IconWhatsApp className="mr-1.5 size-3.5" />
                          WhatsApp
                        </Button>
                      </a>
                    ) : (
                      <Button size="sm" variant="ghost" disabled className="opacity-50">
                        <IconWhatsApp className="mr-1.5 size-3.5" />
                        WhatsApp
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => openClientFicha(client.id)}
                    >
                      <IconEye className="mr-1.5 size-3.5" />
                      Ver ficha
                    </Button>
                  </AdminRowActions>
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTableBody>
        </AdminTable>
      </AdminTableCard>

      <AdminFormModal
        open={distributeConfirmOpen}
        title="Asignar clientes pendientes"
        description={`¿Confirmas asignar automáticamente ${unassignedCount} cliente${unassignedCount === 1 ? "" : "s"} sin ejecutivo (round-robin)?`}
        onClose={() => setDistributeConfirmOpen(false)}
        size="md"
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            disabled={distributing}
            onClick={() => setDistributeConfirmOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={distributing}
            onClick={() => void handleDistributeUnassigned()}
          >
            {distributing ? "Asignando…" : "Confirmar"}
          </Button>
        </div>
      </AdminFormModal>

      <CreateClientModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={(created) => {
          upsertExecutiveClientCache(queryClient, created);
          void invalidateExecutiveClients(queryClient);
          openClientFicha(created.id);
        }}
        onNotify={onNotify}
      />
    </AdminPanel>
  );
}
