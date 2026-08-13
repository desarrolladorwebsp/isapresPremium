"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  IconCalendar,
  IconClock,
  IconEye,
  IconLayoutCards,
  IconLayoutTable,
  IconMail,
  IconPhone,
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
import { canBrowseAllClientsAsExecutive } from "@/lib/auth/staff-role";
import {
  isReturnedClientForExecutive,
  isTrackingOnlyForExecutive,
} from "@/lib/client-pipeline/tracking";
import {
  CLIENT_GESTION_FILTER_OPTIONS,
  DEFAULT_CLIENT_GESTION_FILTERS,
  clientMatchesGestionFilters,
  type ClientGestionFilter,
} from "@/lib/client-pipeline/client-gestion-filter";
import { ClientPipelineStatusBadge } from "@/components/executive/client-pipeline-status-badge";
import { ClientPlanSummary } from "@/components/executive/client-plan-summary";
import { ClientOriginBadge } from "@/components/executive/client-origin-badge";
import { ClientRutCell } from "@/components/executive/client-rut-cell";
import { CreateClientModal } from "@/components/executive/create-client-modal";
import { ExecutiveAccountDetailView } from "@/components/executive/executive-account-detail-view";
import { ExecutiveClientDetailView } from "@/components/executive/executive-client-detail-view";
import { ClientPortfolioCard } from "@/components/executive/client-portfolio-card";
import {
  buildClientWhatsAppMessage,
  CLIENT_PIPELINE_STATUS_LABELS,
  CLIENT_PIPELINE_STATUS_OPTIONS,
} from "@/lib/client-pipeline/constants";
import {
  AGENDA_URGENCY_LABELS,
  agendaUrgencyChipClasses,
  agendaUrgencyFromIso,
  type AgendaUrgency,
} from "@/lib/client-pipeline/agenda-urgency";
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
import type { ClientPipelineStatus } from "@/types/client-pipeline";
import type { UserRecord } from "@/types/user";
import { CLIENT_ORIGIN_LABELS } from "@/components/executive/client-origin-badge";

export interface ExecutiveClientsPanelProps {
  onNotify: (message: string, tone?: "success" | "error") => void;
}

type ClientsSortKey =
  | "cliente"
  | "zoom"
  | "origen"
  | "plan"
  | "contacto"
  | "rut"
  | "registroPor"
  | "ejecutivo"
  | "registro";

type SortDirection = "asc" | "desc";

type ClientsViewMode = "table" | "cards";

const CLIENTS_VIEW_MODE_KEY = "executive-clients-view-mode";

const CLIENTS_SORT_OPTIONS: {
  key: ClientsSortKey;
  label: string;
  adminOnly?: boolean;
}[] = [
  { key: "registro", label: "Fecha registro" },
  { key: "cliente", label: "Cliente" },
  { key: "zoom", label: "Zoom" },
  { key: "origen", label: "Origen" },
  { key: "plan", label: "Plan" },
  { key: "contacto", label: "Contacto" },
  { key: "rut", label: "RUT" },
  { key: "registroPor", label: "Registró" },
  { key: "ejecutivo", label: "Asignado" },
];

function readStoredClientsViewMode(): ClientsViewMode {
  if (typeof window === "undefined") return "cards";
  try {
    const stored = window.localStorage.getItem(CLIENTS_VIEW_MODE_KEY);
    if (stored === "table" || stored === "cards") return stored;
  } catch {
    /* ignore */
  }
  return "cards";
}

function formatDateParts(value: string): { date: string; time: string } {
  const date = new Date(value);
  return {
    date: new Intl.DateTimeFormat("es-CL", {
      timeZone: "America/Santiago",
      dateStyle: "short",
    }).format(date),
    time: new Intl.DateTimeFormat("es-CL", {
      timeZone: "America/Santiago",
      timeStyle: "short",
    }).format(date),
  };
}

function formatDate(value: string): string {
  const { date, time } = formatDateParts(value);
  return `${date}, ${time}`;
}

function RegistroDateTime({ value }: { value: string }) {
  const { date, time } = formatDateParts(value);
  return (
    <span className="flex flex-col leading-tight tabular-nums">
      <span className="text-xs font-semibold text-primary-dark sm:text-sm">
        {date}
      </span>
      <span className="text-[11px] font-medium text-primary/80 sm:text-xs">
        {time}
      </span>
    </span>
  );
}

function TableScheduleChip({
  icon,
  label,
  value,
  urgency,
}: {
  icon: ReactNode;
  label: string;
  value?: string | null;
  urgency: AgendaUrgency;
}) {
  const tone = agendaUrgencyChipClasses(urgency);
  return (
    <div
      className={joinClasses(
        "inline-flex max-w-full items-start gap-1.5 rounded-md px-1 py-0.5",
        tone.shell,
      )}
      title={`${label}: ${AGENDA_URGENCY_LABELS[urgency]}`}
    >
      <span
        className={joinClasses(
          "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full",
          tone.icon,
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span
          className={joinClasses(
            "block truncate text-[10px] font-semibold uppercase tracking-wide",
            tone.label,
          )}
        >
          {label}
        </span>
        {value ? (
          <span
            className={joinClasses(
              "block truncate text-[11px] font-semibold tabular-nums leading-snug",
              tone.value,
            )}
          >
            {value}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function scheduleUrgencyForClient(
  iso: string | null | undefined,
  pipelineStatus: UserRecord["pipelineStatus"],
): AgendaUrgency {
  const closed = pipelineStatus === "RECEPCIONADO" || pipelineStatus === "PERDIDO";
  return agendaUrgencyFromIso(iso, closed);
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
    case "CAMPANA_ISAPRES_PREMIUM":
      return "Campaña Isapres Premium";
    case "CAMPANA_CONSALUD":
      return "Campaña Consalud";
    case "CAMPANA_BANMEDICA":
      return "Campaña Banmédica";
    case "CAMPANA_COLMENA":
      return "Campaña Colmena";
    case "CAMPANA_CRUZ_BLANCA":
      return "Campaña Cruz Blanca";
    case "CAMPANA_VIDA_TRES":
      return "Campaña Vida Tres";
    case "CAMPANA_NUEVA_MASVIDA":
      return "Campaña Nueva Masvida";
    case "CAMPANA_ESENCIAL":
      return "Campaña Esencial";
    default:
      return "—";
  }
}

function resolveAssignedExecutiveLabel(client: UserRecord): string {
  return formatPersonDisplayName(client.assignedExecutiveName);
}

function clientSortValue(
  client: UserRecord,
  key: ClientsSortKey,
): string | number {
  switch (key) {
    case "cliente":
      return client.fullName?.trim() || "";
    case "zoom": {
      const confirmation = client.confirmationCallAt
        ? new Date(client.confirmationCallAt).getTime()
        : Number.POSITIVE_INFINITY;
      const nextCall = client.nextCallAt
        ? new Date(client.nextCallAt).getTime()
        : Number.POSITIVE_INFINITY;
      return Math.min(confirmation, nextCall);
    }
    case "origen": {
      const origin = client.clientOrigin ?? "MANUAL";
      if (origin === "FORMULARIO_WEB" && client.webFormSource?.trim()) {
        return client.webFormSource.trim();
      }
      return CLIENT_ORIGIN_LABELS[origin] ?? origin;
    }
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
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const queryClient = useQueryClient();
  const { isAdmin, user, executiveKind } = useStaffSession();
  const clientsQuery = useExecutiveClientsQuery();
  const executivesQuery = useExecutiveAccountsQuery({ enabled: isAdmin });
  const canBrowseAllClients =
    isAdmin || canBrowseAllClientsAsExecutive(executiveKind);

  const detailClientId =
    searchParams.get(STAFF_CLIENT_ID_QUERY)?.trim() || null;
  const detailExecutiveId =
    searchParams.get(STAFF_EXECUTIVE_ID_QUERY)?.trim() || null;

  const clients = clientsQuery.data;
  const executives = executivesQuery.data ?? [];
  const loading =
    (clientsQuery.isLoading && !clients) ||
    (isAdmin && executivesQuery.isLoading && !executivesQuery.data);
  const isFetching = clientsQuery.isFetching || executivesQuery.isFetching;

  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<
    "cartera" | "derivados" | "devueltos" | "todos"
  >("cartera");
  const [viewMode, setViewMode] = useState<ClientsViewMode>("cards");
  const [sortKey, setSortKey] = useState<ClientsSortKey>("registro");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [gestionFilters, setGestionFilters] = useState<ClientGestionFilter[]>(
    () => [...DEFAULT_CLIENT_GESTION_FILTERS],
  );
  const [gestionFilterOpen, setGestionFilterOpen] = useState(false);
  const gestionFilterRef = useRef<HTMLDivElement | null>(null);
  /** Panel de filtros colapsable en vista < lg. */
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
  /** `""` = todos, `__unassigned__` = sin ejecutivo, o id de cuenta. */
  const [executiveFilterId, setExecutiveFilterId] = useState("");
  /** `""` = todos los estados del pipeline. */
  const [statusFilter, setStatusFilter] = useState<"" | ClientPipelineStatus>(
    "",
  );
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

  useEffect(() => {
    if (!gestionFilterOpen) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (
        target &&
        gestionFilterRef.current &&
        !gestionFilterRef.current.contains(target)
      ) {
        setGestionFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [gestionFilterOpen]);

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
    if (segment === "todos" && canBrowseAllClientsAsExecutive(executiveKind)) {
      return rows;
    }
    if (segment === "derivados") {
      return rows.filter((client) =>
        isTrackingOnlyForExecutive(client, user.id),
      );
    }
    if (segment === "devueltos") {
      return rows.filter((client) =>
        isReturnedClientForExecutive(client, user.id),
      );
    }
    // Mi cartera: asignados activos, sin contar devoluciones (van a Devueltos).
    return rows.filter(
      (client) =>
        client.assignedExecutiveId === user.id &&
        !isReturnedClientForExecutive(client, user.id),
    );
  }, [clients, executiveKind, isAdmin, segment, user?.id]);

  const derivadosCount = useMemo(() => {
    if (isAdmin || !user?.id) return 0;
    return (clients ?? []).filter((client) =>
      isTrackingOnlyForExecutive(client, user.id),
    ).length;
  }, [clients, isAdmin, user?.id]);

  const devueltosCount = useMemo(() => {
    if (isAdmin || !user?.id) return 0;
    return (clients ?? []).filter((client) =>
      isReturnedClientForExecutive(client, user.id),
    ).length;
  }, [clients, isAdmin, user?.id]);

  const showExecutiveFilter = canBrowseAllClients;

  const sortedExecutives = useMemo(() => {
    if (isAdmin) {
      return [...executives].sort((left, right) =>
        formatPersonDisplayName(left.fullName).localeCompare(
          formatPersonDisplayName(right.fullName),
          "es",
          { sensitivity: "base" },
        ),
      );
    }

    const byId = new Map<string, { id: string; fullName: string }>();
    for (const client of clients ?? []) {
      const id = client.assignedExecutiveId?.trim();
      if (!id || byId.has(id)) continue;
      byId.set(id, {
        id,
        fullName:
          client.assignedExecutiveName?.trim() ||
          "Ejecutivo sin nombre",
      });
    }
    return [...byId.values()].sort((left, right) =>
      formatPersonDisplayName(left.fullName).localeCompare(
        formatPersonDisplayName(right.fullName),
        "es",
        { sensitivity: "base" },
      ),
    );
  }, [clients, executives, isAdmin]);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    // Perdido / Recepcionado viven en el bucket "gestionadas".
    // No se eliminan: el filtro "Gestión: pendientes" los ocultaba.
    // Si buscas por estatus terminal o por texto, no los escondemos.
    const statusBypassesGestion =
      statusFilter === "PERDIDO" || statusFilter === "RECEPCIONADO";
    const searchBypassesGestion = query.length > 0;

    let rows =
      statusBypassesGestion || searchBypassesGestion
        ? segmentedClients
        : segmentedClients.filter((client) =>
            clientMatchesGestionFilters(client, gestionFilters),
          );

    if (statusFilter) {
      rows = rows.filter(
        (client) => (client.pipelineStatus ?? "NUEVO") === statusFilter,
      );
    }

    if (showExecutiveFilter && executiveFilterId === "__unassigned__") {
      rows = rows.filter((client) => !client.assignedExecutiveId);
    } else if (showExecutiveFilter && executiveFilterId) {
      rows = rows.filter(
        (client) => client.assignedExecutiveId === executiveFilterId,
      );
    }

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
  }, [
    segmentedClients,
    search,
    gestionFilters,
    showExecutiveFilter,
    executiveFilterId,
    statusFilter,
  ]);

  const gestionFilterIsDefault = useMemo(
    () =>
      gestionFilters.length === DEFAULT_CLIENT_GESTION_FILTERS.length &&
      DEFAULT_CLIENT_GESTION_FILTERS.every((value) =>
        gestionFilters.includes(value),
      ) &&
      !gestionFilters.includes("gestionadas"),
    [gestionFilters],
  );

  const gestionFilterLabel = useMemo(() => {
    if (gestionFilters.length === 0) return "Gestión: ninguna";
    if (gestionFilterIsDefault) return "Gestión: pendientes";
    if (gestionFilters.length === CLIENT_GESTION_FILTER_OPTIONS.length) {
      return "Gestión: todas";
    }
    const labels = CLIENT_GESTION_FILTER_OPTIONS.filter((option) =>
      gestionFilters.includes(option.value),
    ).map((option) => option.label);
    return `Gestión: ${labels.join(", ")}`;
  }, [gestionFilters, gestionFilterIsDefault]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (!gestionFilterIsDefault) count += 1;
    if (statusFilter) count += 1;
    if (showExecutiveFilter && executiveFilterId) count += 1;
    if (
      viewMode === "cards" &&
      (sortKey !== "registro" || sortDirection !== "desc")
    ) {
      count += 1;
    }
    return count;
  }, [
    gestionFilterIsDefault,
    statusFilter,
    showExecutiveFilter,
    executiveFilterId,
    viewMode,
    sortKey,
    sortDirection,
  ]);

  function toggleGestionFilter(value: ClientGestionFilter) {
    setGestionFilters((current) => {
      if (current.includes(value)) {
        return current.filter((item) => item !== value);
      }
      return [...current, value];
    });
  }

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
    () =>
      (clients ?? []).filter((client) => !client.assignedExecutiveId).length,
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
        onOpenClient={(clientId) =>
          openClientFicha(clientId, detailExecutiveId)
        }
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
      const updated = await assignClientToExecutive(
        client.id,
        executiveAccountId,
      );
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

  function handlePendingExecutiveChange(
    clientId: string,
    executiveAccountId: string,
  ) {
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
    if (compact) {
      return (
        <AdminRowActions className="!flex-nowrap justify-center gap-1.5">
          {client.phone ? (
            <a
              href={buildWhatsAppUrl(
                client.phone,
                buildClientWhatsAppMessage(client.fullName),
              )}
              target="_blank"
              rel="noopener noreferrer"
              title="WhatsApp"
              aria-label={`WhatsApp a ${client.fullName}`}
              className="inline-flex size-9 items-center justify-center rounded-xl bg-[#25D366]/12 text-[#1da851] transition hover:bg-[#25D366]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/35"
            >
              <IconWhatsApp className="size-4" />
            </a>
          ) : (
            <span
              title="Sin teléfono"
              aria-label="WhatsApp no disponible"
              className="inline-flex size-9 cursor-not-allowed items-center justify-center rounded-xl bg-zinc-100 opacity-40"
            >
              <IconWhatsApp className="size-4 text-[#25D366]" />
            </span>
          )}
          <button
            type="button"
            title="Ver ficha"
            aria-label={`Ver ficha de ${client.fullName}`}
            className="inline-flex size-9 items-center justify-center rounded-xl bg-[var(--dash-navy,#092558)] text-white shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            onClick={() => openClientFicha(client.id)}
          >
            <IconEye className="size-4 text-white" />
          </button>
        </AdminRowActions>
      );
    }

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
            title="WhatsApp"
            aria-label={`WhatsApp a ${client.fullName}`}
          >
            <Button size="sm" variant="whatsapp">
              <IconWhatsApp className="mr-1.5 size-3.5" />
              WhatsApp
            </Button>
          </a>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            disabled
            title="Sin teléfono"
            aria-label="WhatsApp no disponible"
            className="opacity-50"
          >
            <IconWhatsApp className="mr-1.5 size-3.5" />
            WhatsApp
          </Button>
        )}
        <Button
          size="sm"
          variant="primary"
          title="Ver ficha"
          aria-label={`Ver ficha de ${client.fullName}`}
          onClick={() => openClientFicha(client.id)}
        >
          <IconEye className="mr-1.5 size-3.5" />
          Ver ficha
        </Button>
      </AdminRowActions>
    );
  }

  function renderClientIdentity(client: UserRecord) {
    return (
      <TableCellStack className="min-h-0 gap-1.5">
        <p className="truncate text-sm font-bold capitalize leading-tight text-primary-dark">
          {client.fullName}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <ClientPipelineStatusBadge status={client.pipelineStatus} />
          {!isAdmin &&
          user?.id &&
          isTrackingOnlyForExecutive(client, user.id) ? (
            <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
              Derivado · seguimiento
            </span>
          ) : null}
        </div>
      </TableCellStack>
    );
  }

  function renderZoomSchedule(client: UserRecord) {
    const confirmationAt = formatNextCallAt(client.confirmationCallAt);
    const nextCallAt = formatNextCallAt(client.nextCallAt);

    if (!confirmationAt && !nextCallAt) {
      return <span className="text-xs text-muted">—</span>;
    }

    return (
      <TableCellStack className="min-h-0 gap-1">
        {confirmationAt ? (
          <TableScheduleChip
            icon={<IconCalendar className="size-2.5" />}
            label="Confirmación Zoom"
            value={confirmationAt}
            urgency={scheduleUrgencyForClient(
              client.confirmationCallAt,
              client.pipelineStatus,
            )}
          />
        ) : null}
        {nextCallAt ? (
          <TableScheduleChip
            icon={<IconClock className="size-2.5" />}
            label="Próximo llamado"
            value={nextCallAt}
            urgency={scheduleUrgencyForClient(
              client.nextCallAt,
              client.pipelineStatus,
            )}
          />
        ) : null}
      </TableCellStack>
    );
  }

  return (
    <AdminPanel>
      <AdminPanelHeader
        title="Clientes"
        compactMobile
        middle={
          <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2 lg:max-w-md lg:flex-none">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, correo, teléfono o RUT…"
                aria-label="Buscar clientes"
                className={joinClasses("h-9 min-w-0 flex-1", ui.input)}
              />
              <Button
                type="button"
                size="sm"
                variant={filtersPanelOpen || activeFiltersCount > 0 ? "primary" : "ghost"}
                onClick={() => setFiltersPanelOpen((open) => !open)}
                aria-expanded={filtersPanelOpen}
                aria-controls="clients-filters-panel"
                className={joinClasses(
                  touchTarget,
                  "relative shrink-0 px-3 sm:h-9 sm:min-h-9 lg:hidden",
                )}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="mr-1.5 size-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path
                    d="M4 7h16M4 12h10M4 17h16"
                    strokeLinecap="round"
                  />
                </svg>
                Filtros
                {activeFiltersCount > 0 ? (
                  <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1 text-[11px] font-bold">
                    {activeFiltersCount}
                  </span>
                ) : null}
              </Button>
            </div>
            <div
              id="clients-filters-panel"
              className={joinClasses(
                "min-w-0 flex-wrap items-stretch gap-2 sm:items-center",
                filtersPanelOpen
                  ? "flex rounded-xl border border-border bg-white p-3"
                  : "hidden",
                "lg:flex lg:min-w-0 lg:flex-1 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0",
              )}
            >
              <div ref={gestionFilterRef} className="relative w-full sm:w-auto sm:min-w-[12rem]">
                <button
                  type="button"
                  onClick={() => setGestionFilterOpen((open) => !open)}
                  aria-expanded={gestionFilterOpen}
                  aria-haspopup="listbox"
                  className={joinClasses(
                    "flex h-10 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-sm sm:h-9",
                    ui.input,
                  )}
                >
                  <span className="truncate">{gestionFilterLabel}</span>
                  <span className="text-[10px] text-muted" aria-hidden>
                    ▾
                  </span>
                </button>
                {gestionFilterOpen ? (
                  <div
                    role="listbox"
                    aria-multiselectable="true"
                    className="absolute left-0 z-30 mt-1 w-full min-w-[14rem] rounded-xl border border-border bg-white p-2 shadow-lg sm:left-auto sm:right-0 sm:w-56"
                  >
                    <p className="px-2 pb-1.5 text-[11px] font-medium text-muted">
                      Filtrar por gestión
                    </p>
                    <ul className="space-y-0.5">
                      {CLIENT_GESTION_FILTER_OPTIONS.map((option) => {
                        const checked = gestionFilters.includes(option.value);
                        return (
                          <li key={option.value}>
                            <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-hover">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  toggleGestionFilter(option.value)
                                }
                                className="size-3.5 rounded border-border"
                              />
                              <span>{option.label}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-1.5 flex gap-1 border-t border-border pt-1.5">
                      <button
                        type="button"
                        className="flex-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted hover:bg-surface-hover"
                        onClick={() =>
                          setGestionFilters([...DEFAULT_CLIENT_GESTION_FILTERS])
                        }
                      >
                        Solo pendientes
                      </button>
                      <button
                        type="button"
                        className="flex-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted hover:bg-surface-hover"
                        onClick={() =>
                          setGestionFilters(
                            CLIENT_GESTION_FILTER_OPTIONS.map(
                              (option) => option.value,
                            ),
                          )
                        }
                      >
                        Todas
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              <label className="relative block w-full sm:w-auto sm:min-w-[12rem]">
                <span className="sr-only">Filtrar por estatus</span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as "" | ClientPipelineStatus,
                    )
                  }
                  className={joinClasses(
                    "h-10 w-full rounded-lg px-3 text-sm sm:h-9",
                    ui.input,
                  )}
                >
                  <option value="">Estatus: todos</option>
                  {CLIENT_PIPELINE_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {CLIENT_PIPELINE_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>
              {showExecutiveFilter ? (
                <label className="relative block w-full sm:w-auto sm:min-w-[12rem]">
                  <span className="sr-only">Filtrar por ejecutivo</span>
                  <select
                    value={executiveFilterId}
                    onChange={(event) =>
                      setExecutiveFilterId(event.target.value)
                    }
                    className={joinClasses(
                      "h-10 w-full rounded-lg px-3 text-sm sm:h-9",
                      ui.input,
                    )}
                  >
                    <option value="">Ejecutivo: todos</option>
                    <option value="__unassigned__">Sin asignar</option>
                    {sortedExecutives.map((executive) => (
                      <option key={executive.id} value={executive.id}>
                        {formatPersonDisplayName(executive.fullName)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {viewMode === "cards" ? (
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
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
                    className={joinClasses(
                      "h-10 min-w-0 flex-1 rounded-lg px-3 text-sm sm:h-9 sm:min-w-[11rem] sm:flex-none",
                      ui.input,
                    )}
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
                      setSortDirection((current) =>
                        current === "asc" ? "desc" : "asc",
                      )
                    }
                    className={joinClasses(touchTarget, "h-10 px-2.5 sm:h-9")}
                    aria-label={
                      sortDirection === "asc"
                        ? "Orden ascendente"
                        : "Orden descendente"
                    }
                    title={
                      sortDirection === "asc" ? "Ascendente" : "Descendente"
                    }
                  >
                    {sortDirection === "asc" ? "A→Z" : "Z→A"}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        }
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
                "px-0 sm:h-9 sm:min-h-9 sm:min-w-9 lg:min-w-0 lg:px-3",
              )}
            >
              <IconUserPlus className="size-4 lg:mr-1.5" />
              <span className="hidden lg:inline">Agregar cliente</span>
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
                  "relative border-rose-300 !bg-rose-600 px-0 !text-white shadow-sm hover:!bg-rose-500 active:scale-[0.98] sm:h-9 sm:min-h-9 sm:min-w-9 lg:min-w-0 lg:px-3",
                )}
              >
                <IconUsers className="size-4 lg:mr-1.5" />
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-900 px-1 text-[10px] font-bold text-white lg:hidden">
                  {unassignedCount}
                </span>
                <span className="hidden lg:inline">
                  {distributing
                    ? "Asignando…"
                    : `Asignar pendientes (${unassignedCount})`}
                </span>
              </Button>
            ) : null}
          </>
        }
      />

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
          <Button
            type="button"
            size="sm"
            variant={segment === "devueltos" ? "primary" : "ghost"}
            onClick={() => setSegment("devueltos")}
            className={touchTarget}
          >
            Devueltos{devueltosCount > 0 ? ` (${devueltosCount})` : ""}
          </Button>
          {canBrowseAllClients ? (
            <Button
              type="button"
              size="sm"
              variant={segment === "todos" ? "primary" : "ghost"}
              onClick={() => setSegment("todos")}
              className={touchTarget}
            >
              Todos los clientes
            </Button>
          ) : null}
        </div>
      ) : null}

      <AdminTableCard
        loading={loading}
        empty={!loading && sortedClients.length === 0}
        emptyTitle={
          segment === "derivados"
            ? "Sin clientes derivados"
            : segment === "devueltos"
              ? "Sin clientes devueltos"
              : segment === "todos"
                ? "Sin clientes"
                : "Aún no tienes clientes"
        }
        emptyDescription={
          segment === "derivados"
            ? "Cuando redirijas un cliente a otro ejecutivo, quedará aquí en seguimiento hasta el cierre."
            : segment === "devueltos"
              ? "Aquí verás clientes que otro ejecutivo te devolvió (por ejemplo Premium → Zoom o Isapres → Premium)."
              : segment === "todos" || isAdmin
                ? "Los clientes aparecerán cuando soliciten cotizaciones o cuando un ejecutivo los registre manualmente."
                : "Agrega clientes que captaste por tu cuenta o espera leads asignados desde el cotizador."
        }
        loadingMessage="Cargando clientes…"
        footer={listFooter}
        contentLayout={viewMode === "cards" ? "stack" : "scroll"}
        framed={viewMode !== "cards"}
        className={
          viewMode === "table" ? "premium-clients-table-card" : undefined
        }
      >
        {viewMode === "table" ? (
          <AdminTable
            minWidth={isAdmin ? "72rem" : "70rem"}
            className="premium-clients-table"
          >
            <AdminTableHead>
              <tr>
                <AdminTableHeaderCell {...sortProps("cliente")}>
                  Cliente
                </AdminTableHeaderCell>
                <AdminTableHeaderCell {...sortProps("zoom")}>
                  Zoom
                </AdminTableHeaderCell>
                <AdminTableHeaderCell {...sortProps("origen")}>
                  Origen
                </AdminTableHeaderCell>
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
                <AdminTableHeaderCell align="center" className="w-[1%]">
                  Acciones
                </AdminTableHeaderCell>
              </tr>
            </AdminTableHead>
            <AdminTableBody>
              {sortedClients.map((client) => (
                <AdminTableRow key={client.id} className="hover:bg-transparent">
                  <AdminTableCell
                    valign="top"
                    className="max-w-[12rem] min-w-[10.5rem] py-3.5"
                  >
                    <div className="min-w-0">
                      {renderClientIdentity(client)}
                    </div>
                  </AdminTableCell>
                  <AdminTableCell
                    valign="top"
                    className="max-w-[11.5rem] min-w-[10rem] py-3.5"
                  >
                    {renderZoomSchedule(client)}
                  </AdminTableCell>
                  <AdminTableCell
                    valign="top"
                    className="max-w-[7.5rem] min-w-[6.5rem] py-3.5"
                  >
                    <div className="min-w-0 overflow-hidden">
                      <ClientOriginBadge
                        origin={client.clientOrigin}
                        cotizadorSource={client.cotizadorSource}
                        webFormSource={client.webFormSource}
                      />
                    </div>
                  </AdminTableCell>
                  <AdminTableCell
                    valign="top"
                    className="max-w-[9rem] min-w-[7.5rem] py-3.5"
                  >
                    <div className="min-w-0 overflow-hidden">
                      <ClientPlanSummary
                        requestedPlan={client.requestedPlan}
                        advisedPlan={client.advisedPlan}
                        compact
                      />
                    </div>
                  </AdminTableCell>
                  <AdminTableCell
                    valign="top"
                    className="max-w-[10rem] min-w-[8rem] py-3.5"
                  >
                    <TableCellStack className="min-h-0 gap-1.5">
                      <p className="flex min-w-0 items-center gap-1.5 text-xs leading-tight text-foreground sm:text-sm">
                        <IconMail className="size-3.5 shrink-0 text-primary" />
                        <span className="truncate font-medium">
                          {client.email}
                        </span>
                      </p>
                      <p className="flex min-w-0 items-center gap-1.5 text-[11px] leading-tight text-muted sm:text-xs">
                        <IconPhone className="size-3.5 shrink-0 text-primary" />
                        <span className="truncate">
                          {client.phone ?? "Sin teléfono"}
                        </span>
                      </p>
                    </TableCellStack>
                  </AdminTableCell>
                  <AdminTableCell
                    valign="top"
                    className="min-w-[6rem] whitespace-nowrap py-3.5"
                  >
                    <ClientRutCell rut={client.rut} />
                  </AdminTableCell>
                  <AdminTableCell
                    valign="top"
                    className="max-w-[7rem] min-w-[6rem] py-3.5"
                  >
                    <span className="block truncate text-xs font-semibold uppercase text-primary-dark sm:text-sm">
                      {resolveRegisteredByLabel(client)}
                    </span>
                  </AdminTableCell>
                  <AdminTableCell
                    valign="top"
                    className="max-w-[9.5rem] min-w-[8rem] py-3.5"
                  >
                    {isAdmin ? (
                      <TableCellStack className="min-h-0 gap-1.5">
                        <p className="truncate text-xs font-semibold text-primary-dark sm:text-sm">
                          {resolveAssignedExecutiveLabel(client)}
                        </p>
                        {renderExecutiveAssign(client)}
                      </TableCellStack>
                    ) : (
                      <span className="block truncate text-xs font-semibold text-primary-dark sm:text-sm">
                        {resolveAssignedExecutiveLabel(client)}
                      </span>
                    )}
                  </AdminTableCell>
                  <AdminTableCell
                    valign="top"
                    className="w-[1%] whitespace-nowrap py-3.5"
                  >
                    <RegistroDateTime value={client.createdAt} />
                  </AdminTableCell>
                  <AdminTableCell
                    align="center"
                    valign="middle"
                    className="w-[1%] whitespace-nowrap px-1.5 py-3.5 sm:px-2"
                  >
                    {renderClientActions(client, { compact: true })}
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedClients.map((client) => (
              <ClientPortfolioCard
                key={client.id}
                client={client}
                isAdmin={isAdmin}
                isTrackingOnly={Boolean(
                  !isAdmin &&
                  user?.id &&
                  isTrackingOnlyForExecutive(client, user.id),
                )}
                registeredByLabel={resolveRegisteredByLabel(client)}
                assignedLabel={resolveAssignedExecutiveLabel(client)}
                assignControl={
                  isAdmin ? renderExecutiveAssign(client) : undefined
                }
                onOpenFicha={() => openClientFicha(client.id)}
              />
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
