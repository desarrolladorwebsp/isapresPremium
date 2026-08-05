"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  IconEye,
  IconLayoutCards,
  IconLayoutTable,
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
import { isTrackingOnlyForExecutive } from "@/lib/client-pipeline/tracking";
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
import { formatPersonDisplayName } from "@/lib/format-person-name";
import type { UserRecord } from "@/types/user";
import { CLIENT_ORIGIN_LABELS } from "@/components/executive/client-origin-badge";

export interface ExecutiveClientsPanelProps {
  onNotify: (message: string, tone?: "success" | "error") => void;
}

type ClientsSortKey =
  | "cliente"
  | "origen"
  | "cotizador"
  | "plan"
  | "contacto"
  | "rut"
  | "registroPor"
  | "ejecutivo"
  | "registro";

type SortDirection = "asc" | "desc";

type ClientsViewMode = "table" | "cards";

const CLIENTS_VIEW_MODE_KEY = "executive-clients-view-mode";

const CLIENTS_SORT_OPTIONS: { key: ClientsSortKey; label: string; adminOnly?: boolean }[] = [
  { key: "registro", label: "Fecha registro" },
  { key: "cliente", label: "Cliente" },
  { key: "origen", label: "Origen" },
  { key: "cotizador", label: "Cotizador", adminOnly: true },
  { key: "plan", label: "Plan" },
  { key: "contacto", label: "Contacto" },
  { key: "rut", label: "RUT" },
  { key: "registroPor", label: "Registró" },
  { key: "ejecutivo", label: "Asignado" },
];

function readStoredClientsViewMode(): ClientsViewMode {
  if (typeof window === "undefined") return "table";
  try {
    const stored = window.localStorage.getItem(CLIENTS_VIEW_MODE_KEY);
    if (stored === "table" || stored === "cards") return stored;
  } catch {
    /* ignore */
  }
  return "table";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
    timeStyle: "short",
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

function compareText(a: string, b: string): number {
  return a.localeCompare(b, "es", { sensitivity: "base", numeric: true });
}

function resolveRegisteredByLabel(client: UserRecord): string {
  if (client.registeredByName?.trim()) {
    return formatPersonDisplayName(client.registeredByName);
  }
  switch (client.clientOrigin) {
    case "COTIZADOR":
      return "Cotizador";
    case "FORMULARIO_WEB":
      return "Formulario web";
    case "CAMPANA_LEAD_WHATSAPP":
      return "Campaña WhatsApp";
    default:
      return "—";
  }
}

function resolveAssignedExecutiveLabel(client: UserRecord): string {
  return formatPersonDisplayName(client.assignedExecutiveName);
}

function clientSortValue(client: UserRecord, key: ClientsSortKey): string | number {
  switch (key) {
    case "cliente":
      return client.fullName?.trim() || "";
    case "origen": {
      const origin = client.clientOrigin ?? "MANUAL";
      if (origin === "FORMULARIO_WEB" && client.webFormSource?.trim()) {
        return client.webFormSource.trim();
      }
      return CLIENT_ORIGIN_LABELS[origin] ?? origin;
    }
    case "cotizador":
      return (
        client.cotizadorSource?.label?.trim() ||
        client.cotizadorSource?.slug?.trim() ||
        ""
      );
    case "plan":
      return (
        client.advisedPlan?.planName?.trim() ||
        client.requestedPlan?.planName?.trim() ||
        ""
      );
    case "contacto":
      return client.email?.trim() || client.phone?.trim() || "";
    case "rut":
      return client.rut?.trim() || "";
    case "registroPor":
      return resolveRegisteredByLabel(client);
    case "ejecutivo":
      return resolveAssignedExecutiveLabel(client);
    case "registro":
      return new Date(client.createdAt).getTime() || 0;
    default:
      return "";
  }
}

export function ExecutiveClientsPanel({
  onNotify,
}: ExecutiveClientsPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { isAdmin, user } = useStaffSession();
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
  const [segment, setSegment] = useState<"cartera" | "derivados">("cartera");
  const [viewMode, setViewMode] = useState<ClientsViewMode>("table");
  const [sortKey, setSortKey] = useState<ClientsSortKey>("registro");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [distributing, setDistributing] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [pendingExecutiveByClientId, setPendingExecutiveByClientId] = useState<
    Record<string, string>
  >({});
  const [distributeConfirmOpen, setDistributeConfirmOpen] = useState(false);

  useEffect(() => {
    setViewMode(readStoredClientsViewMode());
  }, []);

  function handleViewModeChange(mode: ClientsViewMode) {
    setViewMode(mode);
    try {
      window.localStorage.setItem(CLIENTS_VIEW_MODE_KEY, mode);
    } catch {
      /* ignore */
    }
  }

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

  const segmentedClients = useMemo(() => {
    const rows = clients ?? [];
    if (isAdmin || !user?.id) return rows;
    if (segment === "derivados") {
      return rows.filter((client) =>
        isTrackingOnlyForExecutive(client, user.id),
      );
    }
    return rows.filter((client) => client.assignedExecutiveId === user.id);
  }, [clients, isAdmin, segment, user?.id]);

  const derivadosCount = useMemo(() => {
    if (isAdmin || !user?.id) return 0;
    return (clients ?? []).filter((client) =>
      isTrackingOnlyForExecutive(client, user.id),
    ).length;
  }, [clients, isAdmin, user?.id]);

  const filteredClients = useMemo(() => {
    const rows = segmentedClients;
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
        client.webFormSource,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [segmentedClients, search]);

  const sortedClients = useMemo(() => {
    const rows = [...filteredClients];
    const direction = sortDirection === "asc" ? 1 : -1;

    rows.sort((left, right) => {
      const a = clientSortValue(left, sortKey);
      const b = clientSortValue(right, sortKey);

      if (typeof a === "number" && typeof b === "number") {
        if (a === b) return compareText(left.fullName, right.fullName);
        return (a - b) * direction;
      }

      const cmp = compareText(String(a), String(b));
      if (cmp !== 0) return cmp * direction;
      return compareText(left.fullName, right.fullName);
    });

    return rows;
  }, [filteredClients, sortKey, sortDirection]);

  function toggleSort(nextKey: ClientsSortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection(nextKey === "registro" ? "desc" : "asc");
  }

  function sortProps(key: ClientsSortKey) {
    return {
      sortable: true as const,
      sortDirection: sortKey === key ? sortDirection : null,
      onSort: () => toggleSort(key),
    };
  }

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
    const executive = executives.find((row) => row.id === executiveAccountId);
    if (!executive) return "la cuenta seleccionada";
    return formatPersonDisplayName(executive.fullName);
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

  const listFooter = `Mostrando ${sortedClients.length} de ${segmentedClients.length} clientes.`;

  function renderExecutiveAssign(client: UserRecord) {
    const currentExecutiveId = client.assignedExecutiveId ?? "";
    const selectedExecutiveId =
      pendingExecutiveByClientId[client.id] ?? currentExecutiveId;
    const hasPendingChange = selectedExecutiveId !== currentExecutiveId;

    return (
      <div className="space-y-2">
        <select
          value={selectedExecutiveId}
          disabled={savingId === client.id}
          onChange={(event) => {
            handlePendingExecutiveChange(client.id, event.target.value);
          }}
          className={joinClasses(
            "h-8 w-full min-w-[8.5rem] max-w-[10rem] rounded-lg px-2 text-xs",
            ui.input,
            hasPendingChange ? "ring-2 ring-primary/25" : "",
          )}
          aria-label={`Asignar ejecutivo a ${client.fullName}`}
        >
          <option value="">Sin asignar</option>
          {executives.map((executive) => (
            <option key={executive.id} value={executive.id}>
              {formatPersonDisplayName(executive.fullName)}
            </option>
          ))}
        </select>

        {hasPendingChange ? (
          <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
            <p className="text-[11px] leading-snug text-muted">
              {selectedExecutiveId
                ? `¿Confirmas asignar a ${client.fullName} a ${resolveExecutiveLabel(selectedExecutiveId)}?`
                : `¿Confirmas dejar a ${client.fullName} sin ejecutivo asignado?`}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="primary"
                disabled={savingId === client.id}
                onClick={() => {
                  void handleAssignExecutive(client, selectedExecutiveId || null);
                }}
              >
                Confirmar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={savingId === client.id}
                onClick={() => cancelPendingExecutiveChange(client.id)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  function renderClientActions(client: UserRecord, { compact = false } = {}) {
    return (
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
            <Button size="sm" variant="whatsapp" className={compact ? "px-2.5" : undefined}>
              <IconWhatsApp className={joinClasses("size-3.5", compact ? "sm:mr-1" : "mr-1.5")} />
              {compact ? <span className="hidden sm:inline">WhatsApp</span> : "WhatsApp"}
            </Button>
          </a>
        ) : (
          <Button size="sm" variant="ghost" disabled className={joinClasses("opacity-50", compact && "px-2.5")}>
            <IconWhatsApp className={joinClasses("size-3.5", compact ? "sm:mr-1" : "mr-1.5")} />
            {compact ? <span className="hidden sm:inline">WhatsApp</span> : "WhatsApp"}
          </Button>
        )}
        <Button
          size="sm"
          variant="primary"
          className={compact ? "px-2.5" : undefined}
          onClick={() => openClientFicha(client.id)}
        >
          <IconEye className={joinClasses("size-3.5", compact ? "sm:mr-1" : "mr-1.5")} />
          {compact ? <span className="hidden sm:inline">Ver ficha</span> : "Ver ficha"}
        </Button>
      </AdminRowActions>
    );
  }

  function renderClientIdentity(client: UserRecord) {
    return (
      <TableCellStack className="min-h-0 gap-1">
        <p className="truncate font-semibold leading-tight text-foreground">
          {client.fullName}
        </p>
        <ClientPipelineStatusBadge status={client.pipelineStatus} />
        {!isAdmin &&
        user?.id &&
        isTrackingOnlyForExecutive(client, user.id) ? (
          <span className="inline-flex w-fit rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
            Derivado · seguimiento
          </span>
        ) : null}
        <ClientContactMethodBadge method={client.preferredContactMethod} />
        {formatNextCallAt(client.confirmationCallAt) ? (
          <p className="text-[11px] leading-tight text-amber-800">
            Confirmación Zoom: {formatNextCallAt(client.confirmationCallAt)}
          </p>
        ) : null}
        {formatNextCallAt(client.nextCallAt) ? (
          <p className="text-[11px] leading-tight text-primary-dark">
            Próximo llamado: {formatNextCallAt(client.nextCallAt)}
          </p>
        ) : null}
      </TableCellStack>
    );
  }

  return (
    <AdminPanel>
      <AdminPanelHeader
        title="Clientes"
        compactMobile
        actions={
          <>
            <div
              className={joinClasses(
                "inline-flex shrink-0 rounded-lg p-0.5",
                ui.borderHairline,
              )}
              role="group"
              aria-label="Vista de clientes"
            >
              <button
                type="button"
                onClick={() => handleViewModeChange("table")}
                aria-pressed={viewMode === "table"}
                aria-label="Vista de tabla"
                title="Vista de tabla"
                className={joinClasses(
                  touchTarget,
                  "rounded-md px-0 transition sm:h-9 sm:min-h-9 sm:min-w-9 sm:px-2",
                  viewMode === "table"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted hover:bg-surface-hover hover:text-foreground",
                )}
              >
                <IconLayoutTable className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange("cards")}
                aria-pressed={viewMode === "cards"}
                aria-label="Vista de cuadros"
                title="Vista de cuadros"
                className={joinClasses(
                  touchTarget,
                  "rounded-md px-0 transition sm:h-9 sm:min-h-9 sm:min-w-9 sm:px-2",
                  viewMode === "cards"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted hover:bg-surface-hover hover:text-foreground",
                )}
              >
                <IconLayoutCards className="size-4" />
              </button>
            </div>
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
                variant="danger"
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
                  "relative border-rose-300 !bg-rose-600 px-0 !text-white shadow-sm hover:!bg-rose-500 active:scale-[0.98] sm:h-9 sm:min-h-9 sm:min-w-0 sm:px-3",
                )}
              >
                <IconUsers className="size-4 sm:mr-1.5" />
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-900 px-1 text-[10px] font-bold text-white sm:hidden">
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

      <AdminToolbar className="sm:grid-cols-[minmax(0,1fr)_auto]">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre, correo, teléfono o RUT…"
          className={joinClasses("h-11", ui.input)}
        />
        {viewMode === "cards" ? (
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="clients-sort-key">
              Ordenar por
            </label>
            <select
              id="clients-sort-key"
              value={sortKey}
              onChange={(event) => {
                const nextKey = event.target.value as ClientsSortKey;
                setSortKey(nextKey);
                setSortDirection(nextKey === "registro" ? "desc" : "asc");
              }}
              className={joinClasses("h-11 min-w-[10rem] rounded-lg px-3 text-sm", ui.input)}
            >
              {CLIENTS_SORT_OPTIONS.filter(
                (option) => isAdmin || !option.adminOnly,
              ).map((option) => (
                <option key={option.key} value={option.key}>
                  Ordenar: {option.label}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() =>
                setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
              }
              className={joinClasses(touchTarget, "h-11 px-3")}
              aria-label={
                sortDirection === "asc" ? "Orden ascendente" : "Orden descendente"
              }
              title={sortDirection === "asc" ? "Ascendente" : "Descendente"}
            >
              {sortDirection === "asc" ? "A→Z" : "Z→A"}
            </Button>
          </div>
        ) : null}
      </AdminToolbar>

      {!isAdmin ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={segment === "cartera" ? "primary" : "ghost"}
            onClick={() => setSegment("cartera")}
            className={touchTarget}
          >
            Mi cartera
          </Button>
          <Button
            type="button"
            size="sm"
            variant={segment === "derivados" ? "primary" : "ghost"}
            onClick={() => setSegment("derivados")}
            className={touchTarget}
          >
            Derivados{derivadosCount > 0 ? ` (${derivadosCount})` : ""}
          </Button>
        </div>
      ) : null}

      <AdminTableCard
        loading={loading}
        empty={!loading && sortedClients.length === 0}
        emptyTitle={
          segment === "derivados"
            ? "Sin clientes derivados"
            : "Aún no tienes clientes"
        }
        emptyDescription={
          segment === "derivados"
            ? "Cuando redirijas un cliente a otro ejecutivo, quedará aquí en seguimiento hasta el cierre."
            : isAdmin
              ? "Los clientes aparecerán cuando soliciten cotizaciones o cuando un ejecutivo los registre manualmente."
              : "Agrega clientes que captaste por tu cuenta o espera leads asignados desde el cotizador."
        }
        loadingMessage="Cargando clientes…"
        footer={listFooter}
        contentLayout={viewMode === "cards" ? "stack" : "scroll"}
      >
        {viewMode === "table" ? (
          <AdminTable minWidth={isAdmin ? "70rem" : "62rem"}>
            <AdminTableHead>
              <tr>
                <AdminTableHeaderCell {...sortProps("cliente")}>
                  Cliente
                </AdminTableHeaderCell>
                <AdminTableHeaderCell {...sortProps("origen")}>
                  Origen
                </AdminTableHeaderCell>
                {isAdmin ? (
                  <AdminTableHeaderCell {...sortProps("cotizador")}>
                    Cotizador
                  </AdminTableHeaderCell>
                ) : null}
                <AdminTableHeaderCell {...sortProps("plan")}>
                  Plan
                </AdminTableHeaderCell>
                <AdminTableHeaderCell {...sortProps("contacto")}>
                  Contacto
                </AdminTableHeaderCell>
                <AdminTableHeaderCell {...sortProps("rut")}>
                  RUT
                </AdminTableHeaderCell>
                <AdminTableHeaderCell {...sortProps("registroPor")}>
                  Registró
                </AdminTableHeaderCell>
                <AdminTableHeaderCell {...sortProps("ejecutivo")}>
                  Asignado
                </AdminTableHeaderCell>
                <AdminTableHeaderCell {...sortProps("registro")}>
                  Registro
                </AdminTableHeaderCell>
                <AdminTableHeaderCell>Acciones</AdminTableHeaderCell>
              </tr>
            </AdminTableHead>
            <AdminTableBody>
              {sortedClients.map((client) => (
                <AdminTableRow key={client.id}>
                  <AdminTableCell className="max-w-[9.5rem] min-w-[8.5rem]">
                    <div className="min-w-0 [&>div]:min-h-0 [&>div]:gap-0.5">
                      {renderClientIdentity(client)}
                    </div>
                  </AdminTableCell>
                  <AdminTableCell className="max-w-[7.5rem] min-w-[6.5rem]">
                    <div className="min-w-0 overflow-hidden">
                      <ClientOriginBadge
                        origin={client.clientOrigin}
                        cotizadorSource={client.cotizadorSource}
                        webFormSource={client.webFormSource}
                      />
                    </div>
                  </AdminTableCell>
                  {isAdmin ? (
                    <AdminTableCell className="max-w-[7rem] min-w-[6rem]">
                      <div className="min-w-0 overflow-hidden">
                        <CotizadorSourceBadge
                          source={client.cotizadorSource}
                          compact
                        />
                      </div>
                    </AdminTableCell>
                  ) : null}
                  <AdminTableCell className="max-w-[9rem] min-w-[7.5rem]">
                    <div className="min-w-0 overflow-hidden">
                      <ClientPlanSummary
                        requestedPlan={client.requestedPlan}
                        advisedPlan={client.advisedPlan}
                        compact
                      />
                    </div>
                  </AdminTableCell>
                  <AdminTableCell className="max-w-[9rem] min-w-[7.5rem]">
                    <TableCellStack className="min-h-0 gap-0.5">
                      <p className="truncate text-xs leading-tight sm:text-sm">
                        {client.email}
                      </p>
                      <p className="truncate text-[11px] leading-tight text-muted">
                        {client.phone ?? "Sin teléfono"}
                      </p>
                    </TableCellStack>
                  </AdminTableCell>
                  <AdminTableCell className="min-w-[6rem] whitespace-nowrap">
                    <ClientRutCell rut={client.rut} />
                  </AdminTableCell>
                  <AdminTableCell className="max-w-[7rem] min-w-[6rem]">
                    <span className="block truncate text-xs text-foreground sm:text-sm">
                      {resolveRegisteredByLabel(client)}
                    </span>
                  </AdminTableCell>
                  <AdminTableCell className="max-w-[9.5rem] min-w-[8rem]">
                    {isAdmin ? (
                      <TableCellStack className="min-h-0 gap-1.5">
                        <p className="truncate text-xs font-medium text-foreground sm:text-sm">
                          {resolveAssignedExecutiveLabel(client)}
                        </p>
                        {renderExecutiveAssign(client)}
                      </TableCellStack>
                    ) : (
                      <span className="block truncate text-xs text-foreground sm:text-sm">
                        {resolveAssignedExecutiveLabel(client)}
                      </span>
                    )}
                  </AdminTableCell>
                  <AdminTableCell className="min-w-[6rem] whitespace-nowrap">
                    <span className="text-xs tabular-nums sm:text-sm">
                      {formatDate(client.createdAt)}
                    </span>
                  </AdminTableCell>
                  <AdminTableCell className="min-w-[7.5rem] whitespace-nowrap">
                    {renderClientActions(client, { compact: true })}
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sortedClients.map((client) => (
              <article
                key={client.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-bg-layout/40 p-4 transition hover:border-primary/30 hover:bg-bg-layout/60"
              >
                <header className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">{renderClientIdentity(client)}</div>
                  <ClientOriginBadge
                    origin={client.clientOrigin}
                    cotizadorSource={client.cotizadorSource}
                    webFormSource={client.webFormSource}
                  />
                </header>

                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Contacto
                    </p>
                    <p className="truncate leading-tight text-foreground">
                      {client.email}
                    </p>
                    <p className="text-xs leading-tight text-muted">
                      {client.phone ?? "Sin teléfono"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <ClientRutCell rut={client.rut} />
                    <span className="text-xs tabular-nums text-muted">
                      {formatDate(client.createdAt)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Registró
                      </p>
                      <p className="leading-tight text-foreground">
                        {resolveRegisteredByLabel(client)}
                      </p>
                    </div>
                    <div>
                      <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Asignado
                      </p>
                      <p className="leading-tight text-foreground">
                        {resolveAssignedExecutiveLabel(client)}
                      </p>
                    </div>
                  </div>
                  {isAdmin ? (
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Cotizador
                      </p>
                      <CotizadorSourceBadge
                        source={client.cotizadorSource}
                        compact
                      />
                    </div>
                  ) : null}
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Plan
                    </p>
                    <ClientPlanSummary
                      requestedPlan={client.requestedPlan}
                      advisedPlan={client.advisedPlan}
                      compact
                    />
                  </div>
                  {isAdmin ? (
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Reasignar
                      </p>
                      {renderExecutiveAssign(client)}
                    </div>
                  ) : null}
                </div>

                <div className="mt-auto border-t border-border/70 pt-3">
                  {renderClientActions(client)}
                </div>
              </article>
            ))}
          </div>
        )}
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
