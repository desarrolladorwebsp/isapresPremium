"use client";
import { formatReceptionDate } from "@/lib/client-quotation/reception-date";

import { Bell } from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStaffSession } from "@/hooks/use-auth-session";
import { activeClientPortfolio, showActiveClientPortfolio } from "@/lib/executive/active-client-portfolio";
import { ClientPipelineStatusBadge } from "@/components/executive/client-pipeline-status-badge";
import { IsapreMultiFilter } from "@/components/executive/isapre-multi-filter";
import { useExecutiveAccountsQuery } from "@/hooks/query/use-executive-accounts-query";
import { useExecutiveClientsQuery } from "@/hooks/query/use-executive-clients-query";
import { useSentQuotationsQuery } from "@/hooks/query/use-sent-quotations-query";
import {
  AdminFormModal,
  AdminRefreshButton,
} from "@/components/admin/admin-data-table";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  buildAgendaMonthOptions,
  countExecutiveAgendaStats,
  type AgendaStatBucket,
  type ExecutiveAgendaStatItem,
} from "@/lib/client-pipeline/agenda-stats";
import { santiagoMonthKey } from "@/lib/client-pipeline/agenda-urgency";
import {
  ADMIN_EXECUTIVE_FILTER_ALL,
  ADMIN_EXECUTIVE_FILTER_UNASSIGNED,
  buildAdminExecutiveFilterOptions,
  filterAgendaItemsByExecutive,
  filterClientsByExecutive,
  groupAgendaItemsByExecutive,
} from "@/lib/executive/dashboard-executive-filter";
import {
  DASHBOARD_KPI_HELP,
  groupNewClientItemsByIntake,
} from "@/lib/executive/dashboard-kpi";
import {
  filterActiveQuotations,
  filterOutcomeQuotations,
  filterSentQuotations,
  groupQuotationsByIsapre,
  groupActiveQuotationsByIsapre,
  groupActiveQuotationsByClient,
  type ActiveQuotationClient,
  sentQuotationIsapreOptions,
  type QuotationOutcomeStatus,
  type SentQuotationKpiRow,
} from "@/lib/executive/sent-quotation-kpi";
import { CLIENT_QUOTATION_STATUS_LABELS } from "@/types/client-quotation";
import { staffClientHref } from "@/lib/staff/staff-sections";
import { joinClasses } from "@/lib/utils";
import {
  IconClipboard,
  IconClipboardCheck,
  IconClock,
  IconEye,
  IconInfo,
  IconUsers,
} from "@/components/executive/executive-icons";
import type { StaffAccountRecord } from "@/types/staff-account";
import type { UserRecord } from "@/types/user";

const MONTH_OPTIONS = [{ value: "", label: "Todos los meses" }, ...buildAgendaMonthOptions(11)];

type QuotationKpiList = "sent" | "active" | QuotationOutcomeStatus;

const QUOTATION_LIST_COPY: Record<
  QuotationKpiList,
  { title: string; description: string; empty: string; dateLabel: string }
> = {
  sent: {
    title: "Cotizaciones enviadas",
    description:
      "Documentos enviados por email o WhatsApp. Cada uno cuenta una vez, aunque incluya varias isapres.",
    empty: "No hay cotizaciones enviadas con estos filtros.",
    dateLabel: "Enviada",
  },
  active: {
    title: "Cotizaciones activas",
    description: "Clientes con alguna cotización enviada pendiente de aceptación o rechazo. Cada cliente aparece una vez con sus documentos agrupados. Respeta mes de envío, ejecutivo e isapres; Todos los meses incluye las pendientes anteriores.",
    empty: "No hay cotizaciones activas con estos filtros.",
    dateLabel: "Enviada",
  },
  ACCEPTED: {
    title: "Cotizaciones aceptadas",
    description: "Documentos que el cliente aceptó. El caso sigue con el ejecutivo de Isapres.",
    empty: "No hay cotizaciones aceptadas con estos filtros.",
    dateLabel: "Aceptada",
  },
  RECEIVED: {
    title: "Cotizaciones recepcionadas",
    description: "La Isapre aceptó y la contratación terminó. El período corresponde a la fecha efectiva de recepción, aunque se registre después.",
    empty: "No hay cotizaciones recepcionadas con estos filtros.",
    dateLabel: "Recepcionada",
  },
  REJECTED: {
    title: "Cotizaciones rechazadas",
    description: "Documentos que el cliente rechazó en el período.",
    empty: "No hay cotizaciones rechazadas con estos filtros.",
    dateLabel: "Rechazada",
  },
};

interface DashboardStats {
  clients: number;
  derived: number;
  enviadoIsapre: number;
  closed: number;
  noAnswer: number;
  inFollowUp: number;
  gestionesHoy: number;
  gestionesAtrasadas: number;
  gestionesFuturas: number;
  clientesNuevos: number;
  recordatoriosHoy: number;
  agendaItems: Record<AgendaStatBucket, ExecutiveAgendaStatItem[]>;
}

function DashboardHeroDecoration() {
  return (
    <svg
      className="premium-dash-hero-deco"
      viewBox="0 0 280 220"
      fill="none"
      aria-hidden
    >
      <path
        d="M40 180c40-50 90-70 140-55 45 14 70 50 90 95"
        stroke="#1AC9EA"
        strokeOpacity="0.35"
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path
        d="M20 120c55-40 110-45 165-20 40 18 65 48 80 85"
        stroke="#1289F8"
        strokeOpacity="0.22"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <g transform="translate(165 45)">
        <path
          d="M40 8c18 10 32 28 32 52 0 34-22 58-32 68-10-10-32-34-32-68 0-24 14-42 32-52z"
          fill="#1AC9EA"
          fillOpacity="0.12"
          stroke="#1AC9EA"
          strokeOpacity="0.45"
          strokeWidth="3"
        />
        <path
          d="M40 38v36M22 56h36"
          stroke="#0D6DEE"
          strokeOpacity="0.55"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

function countByStatus(clients: UserRecord[], status: string): number {
  return clients.filter((client) => client.pipelineStatus === status).length;
}

const BUCKET_COPY: Record<
  AgendaStatBucket,
  { title: string; description: string; showDate: boolean }
> = {
  dueToday: {
    title: "Gestiones de hoy",
    description: "Llamados y confirmaciones de hoy, anualidades disponibles y clientes pendientes de revisión.",
    showDate: true,
  },
  overdue: {
    title: "Gestiones atrasadas",
    description:
      "Zoom sin confirmar, clientes nuevos sin gestión o anualidades pendientes de meses anteriores.",
    showDate: true,
  },
  upcoming: {
    title: "Gestiones futuras",
    description: "Qué queda agendado para los próximos días.",
    showDate: true,
  },
  remindersToday: {
    title: "Recordatorios de hoy",
    description: "Recordatorios libres agendados para hoy (hora de Chile) en el mes seleccionado. Muestran la nota y el responsable actual; los clientes En pausa o con proceso cerrado no cuentan.",
    showDate: true,
  },
  newClients: {
    title: "Clientes nuevos",
    description: "Sin primer contacto. Agrupados por cómo llegaron a tu cartera.",
    showDate: true,
  },
};

export interface DashboardHomeState {
  adminExecutiveFilter: string;
  selectedMonth: string;
  selectedIsapreIds: string[];
  openBucket: AgendaStatBucket | null;
  quotationList: QuotationKpiList | null;
  activeClientsOpen: boolean;
  activeClientsPage: number;
}

export function createDashboardHomeState(): DashboardHomeState {
  return {
    adminExecutiveFilter: ADMIN_EXECUTIVE_FILTER_ALL,
    selectedMonth: santiagoMonthKey(new Date()) ?? MONTH_OPTIONS[0]?.value ?? "",
    selectedIsapreIds: [],
    openBucket: null,
    quotationList: null,
    activeClientsOpen: false,
    activeClientsPage: 1,
  };
}

export function ExecutiveDashboardHome({
  state,
  onStateChange,
}: {
  state: DashboardHomeState;
  onStateChange: Dispatch<SetStateAction<DashboardHomeState>>;
}) {
  const router = useRouter();
  const { user, executiveKind, isAdmin } = useStaffSession();
  const isLimited =
    !isAdmin &&
    (executiveKind === "ISAPRES" || executiveKind === "ZOOM");

  const clientsQuery = useExecutiveClientsQuery();
  const quotationsQuery = useSentQuotationsQuery();
  const executivesQuery = useExecutiveAccountsQuery({ enabled: isAdmin });

  const clients = clientsQuery.data;
  const executiveAccounts = useMemo(
    () => executivesQuery.data ?? [],
    [executivesQuery.data],
  );
  const sessionUserId = user?.id ?? null;

  const [helpOpen, setHelpOpen] = useState(false);
  const { adminExecutiveFilter, selectedMonth, selectedIsapreIds, openBucket, quotationList, activeClientsOpen, activeClientsPage } = state;

  function updateHomeState<K extends keyof DashboardHomeState>(
    key: K,
    value: DashboardHomeState[K],
  ) {
    onStateChange((current) => ({
      ...current, [key]: value,
      ...(key === "adminExecutiveFilter" ? { activeClientsPage: 1 } : {}),
    }));
  }

  const unfilteredAgenda = useMemo(() => {
    if (!clients) return null;
    if (!isAdmin) {
      if (!sessionUserId) return null;
      return countExecutiveAgendaStats({
        clients,
        executiveId: sessionUserId,
        isAdmin: false,
        monthKey: selectedMonth || null,
      });
    }
    return countExecutiveAgendaStats({
      clients,
      executiveId: null,
      isAdmin: true,
      monthKey: selectedMonth || null,
    });
  }, [clients, isAdmin, sessionUserId, selectedMonth]);

  const stats = useMemo<DashboardStats | null>(() => {
    if (!clients || !unfilteredAgenda) return null;
    const scopedClients =
      !isAdmin && sessionUserId
        ? clients.filter((client) => client.assignedExecutiveId === sessionUserId)
        : isAdmin
          ? filterClientsByExecutive(clients, adminExecutiveFilter)
          : clients;
    const derivedCount =
      !isAdmin && sessionUserId
        ? clients.filter(
            (client) =>
              client.trackingExecutiveId === sessionUserId &&
              client.assignedExecutiveId !== sessionUserId,
          ).length
        : 0;

    const agendaFilter = isAdmin
      ? adminExecutiveFilter
      : ADMIN_EXECUTIVE_FILTER_ALL;
    const agendaItems = {
      remindersToday: filterAgendaItemsByExecutive(
        unfilteredAgenda.items.remindersToday,
        agendaFilter,
      ),
      dueToday: filterAgendaItemsByExecutive(
        unfilteredAgenda.items.dueToday,
        agendaFilter,
      ),
      overdue: filterAgendaItemsByExecutive(
        unfilteredAgenda.items.overdue,
        agendaFilter,
      ),
      upcoming: filterAgendaItemsByExecutive(
        unfilteredAgenda.items.upcoming,
        agendaFilter,
      ),
      newClients: filterAgendaItemsByExecutive(
        unfilteredAgenda.items.newClients,
        agendaFilter,
      ),
    };

    return {
      clients: scopedClients.length,
      derived: derivedCount,
      enviadoIsapre: countByStatus(scopedClients, "ENVIADO_ISAPRE"),
      closed: countByStatus(scopedClients, "RECEPCIONADO"),
      noAnswer: countByStatus(scopedClients, "NO_CONTESTA"),
      inFollowUp: countByStatus(scopedClients, "EN_SEGUIMIENTO"),
      gestionesHoy: agendaItems.dueToday.length,
      gestionesAtrasadas: agendaItems.overdue.length,
      gestionesFuturas: agendaItems.upcoming.length,
      clientesNuevos: agendaItems.newClients.length,
      recordatoriosHoy: agendaItems.remindersToday.length,
      agendaItems,
    };
  }, [
    clients,
    isAdmin,
    sessionUserId,
    adminExecutiveFilter,
    unfilteredAgenda,
  ]);

  const activeClients = useMemo(() => activeClientPortfolio({
    clients: clients ?? [], isAdmin, executiveId: sessionUserId, adminExecutiveFilter,
  }), [clients, isAdmin, sessionUserId, adminExecutiveFilter]);
  const showActiveClients = showActiveClientPortfolio(selectedMonth);
  const activePageSize = 50;
  const activePageCount = Math.max(1, Math.ceil(activeClients.length / activePageSize));
  const currentActivePage = Math.max(1, Math.min(activeClientsPage, activePageCount));
  const activePageStart = (currentActivePage - 1) * activePageSize;
  const visibleActiveClients = activeClients.slice(activePageStart, activePageStart + activePageSize);

  const executiveFilterOptions = useMemo(() => {
    if (!isAdmin) return [];
    return buildAdminExecutiveFilterOptions({
      accounts: executiveAccounts,
      clients: clients ?? [],
      selectedId: adminExecutiveFilter,
    }).map(({ value, label }) => ({ value, label }));
  }, [isAdmin, executiveAccounts, clients, adminExecutiveFilter]);

  const accountsById = useMemo(() => {
    const map = new Map<string, StaffAccountRecord>();
    for (const account of executiveAccounts) {
      map.set(account.id, account);
    }
    return map;
  }, [executiveAccounts]);

  const groupedOpenItems = useMemo(() => {
    if (!isAdmin || adminExecutiveFilter || !openBucket || !stats) {
      return [];
    }
    if (openBucket === "newClients") return [];
    return groupAgendaItemsByExecutive(
      stats.agendaItems[openBucket],
      accountsById,
    );
  }, [isAdmin, adminExecutiveFilter, openBucket, stats, accountsById]);

  const newClientOriginGroups = useMemo(() => {
    if (openBucket !== "newClients" || !stats) return [];
    return groupNewClientItemsByIntake(stats.agendaItems.newClients);
  }, [openBucket, stats]);

  const quotationExecutiveIds = useMemo(() => {
    if (!isAdmin) return [];
    if (
      !adminExecutiveFilter ||
      adminExecutiveFilter === ADMIN_EXECUTIVE_FILTER_UNASSIGNED
    ) {
      return adminExecutiveFilter === ADMIN_EXECUTIVE_FILTER_UNASSIGNED
        ? [ADMIN_EXECUTIVE_FILTER_UNASSIGNED]
        : [];
    }
    return [adminExecutiveFilter];
  }, [isAdmin, adminExecutiveFilter]);

  const quotationFilter = useMemo(
    () => ({
      quotations: quotationsQuery.data ?? [],
      period: selectedMonth ? { kind: "month" as const, monthKey: selectedMonth } : undefined,
      selectedExecutiveIds: quotationExecutiveIds,
      selectedIsapreIds,
    }),
    [
      quotationsQuery.data,
      selectedMonth,
      quotationExecutiveIds,
      selectedIsapreIds,
    ],
  );
  const sentQuotations = useMemo(
    () => filterSentQuotations(quotationFilter),
    [quotationFilter],
  );
  const activeQuotations = useMemo(
    () => filterActiveQuotations(quotationFilter),
    [quotationFilter],
  );
  const activeQuotationClients = useMemo(
    () => groupActiveQuotationsByClient(activeQuotations),
    [activeQuotations],
  );
  const activeQuotationIsapreGroups = useMemo(
    () => groupActiveQuotationsByIsapre(activeQuotations),
    [activeQuotations],
  );
  const receivedQuotations = useMemo(
    () => filterOutcomeQuotations({ ...quotationFilter, status: "RECEIVED" }),
    [quotationFilter],
  );
  const acceptedQuotations = useMemo(
    () => filterOutcomeQuotations({ ...quotationFilter, status: "ACCEPTED" }),
    [quotationFilter],
  );
  const rejectedQuotations = useMemo(
    () => filterOutcomeQuotations({ ...quotationFilter, status: "REJECTED" }),
    [quotationFilter],
  );
  const openQuotations =
    quotationList === "active"
      ? activeQuotations
      : quotationList === "RECEIVED"
      ? receivedQuotations
      : quotationList === "ACCEPTED"
        ? acceptedQuotations
        : quotationList === "REJECTED"
          ? rejectedQuotations
          : sentQuotations;
  const isapreOptions = useMemo(
    () => sentQuotationIsapreOptions(quotationsQuery.data ?? []),
    [quotationsQuery.data],
  );
  const quotationIsapreGroups = useMemo(
    () =>
      quotationList && quotationList !== "active"
        ? groupQuotationsByIsapre(openQuotations)
        : [],
    [quotationList, openQuotations],
  );

  const loadingStats = clientsQuery.isLoading && !clientsQuery.data;
  const loadingQuotations =
    quotationsQuery.isLoading && !quotationsQuery.data;
  const isFetching =
    clientsQuery.isFetching ||
    quotationsQuery.isFetching ||
    (isAdmin && executivesQuery.isFetching);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 19) return "Buenas tardes";
    return "Buenas noches";
  }, []);

  const firstName = user?.fullName?.split(" ")[0];

  const heroHint = isLimited
    ? executiveKind === "ISAPRES"
      ? "Revisa tus gestiones del día, clientes nuevos y cierra contratos cuando corresponda."
      : "Revisa gestiones de hoy, atrasadas y confirmaciones Zoom pendientes."
    : "Prioriza gestiones de hoy y atrasadas; usa el menú para clientes, calendario y cotizador.";

  const gestionCards: Array<{
    bucket: AgendaStatBucket;
    label: string;
    hint: string;
    value: number | undefined;
    icon: ReactNode;
    tone: "today" | "overdue" | "upcoming" | "new";
  }> = [
    {
      bucket: "remindersToday",
      label: "Recordatorios de hoy",
      hint: "Notas agendadas para hoy, hora de Chile",
      value: stats?.recordatoriosHoy,
      icon: <Bell className="size-6" />,
      tone: "today",
    },
    {
      bucket: "dueToday",
      label: "Gestiones hoy",
      hint: "Llamados, anualidades y clientes por revisar",
      value: stats?.gestionesHoy,
      icon: <IconClock className="size-6" />,
      tone: "today",
    },
    {
      bucket: "overdue",
      label: "Atrasadas",
      hint: "Gestiones y revisiones pendientes anteriores",
      value: stats?.gestionesAtrasadas,
      icon: <IconClipboard className="size-6" />,
      tone: "overdue",
    },
    {
      bucket: "upcoming",
      label: "Futuras",
      hint: "Agendadas para los próximos días",
      value: stats?.gestionesFuturas,
      icon: <IconClock className="size-6" />,
      tone: "upcoming",
    },
    {
      bucket: "newClients",
      label: "Clientes nuevos",
      hint: "Sin primer contacto, según origen de ingreso",
      value: stats?.clientesNuevos,
      icon: <IconUsers className="size-6" />,
      tone: "new",
    },
  ];

  function renderAgendaCard(item: (typeof gestionCards)[number]) {
    return (
            <button
              key={item.label}
              type="button"
              disabled={loadingStats}
              onClick={() => updateHomeState("openBucket", item.bucket)}
              className={joinClasses(
                "premium-dash-stat-card w-full text-left transition hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                item.tone === "today" && "ring-1 ring-amber-300/70",
                item.tone === "overdue" && "ring-1 ring-danger/35",
                item.tone === "upcoming" && "ring-1 ring-border",
                item.tone === "new" && "ring-1 ring-sky-300/60",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="premium-dash-stat-label">{item.label}</p>
                <span className="premium-dash-stat-icon shrink-0" aria-hidden>
                  {item.icon}
                </span>
              </div>
              <p
                className={joinClasses(
                  "premium-dash-stat-value mt-3 tabular-nums",
                  item.tone === "today" && "text-amber-800",
                  item.tone === "overdue" && "text-danger",
                  item.tone === "new" && "text-sky-800",
                )}
              >
                {loadingStats
                  ? "—"
                  : item.value === undefined
                    ? "—"
                    : item.value}
              </p>
              <p className="premium-dash-stat-hint mt-1.5">{item.hint}</p>
            </button>

    );
  }

  const secondaryCards: Array<{
    label: string;
    hint: string;
    value: number | undefined;
    icon: ReactNode;
  }> = isLimited
    ? executiveKind === "ISAPRES"
      ? [
          {
            label: "Mis clientes",
            hint: "Clientes asignados a tu cartera",
            value: stats?.clients,
            icon: <IconUsers className="size-6" />,
          },
          {
            label: "Enviado a Isapre",
            hint: "En gestión / contratación Isapre",
            value: stats?.enviadoIsapre,
            icon: <IconClipboard className="size-6" />,
          },
          {
            label: "Recepcionados",
            hint: "Negocios recepcionados en tu cartera",
            value: stats?.closed,
            icon: <IconClock className="size-6" />,
          },
        ]
      : [
          {
            label: "Mis clientes",
            hint: "Clientes asignados a tu cartera",
            value: stats?.clients,
            icon: <IconUsers className="size-6" />,
          },
          {
            label: "Derivados",
            hint: "En seguimiento hasta el cierre",
            value: stats?.derived,
            icon: <IconClipboard className="size-6" />,
          },
          {
            label: "No contesta",
            hint: "Pendientes de contacto",
            value: stats?.noAnswer,
            icon: <IconClock className="size-6" />,
          },
        ]
    : [
        {
          label: "Mis clientes",
          hint: "Total de clientes registrados",
          value: stats?.clients,
          icon: <IconUsers className="size-6" />,
        },
      ];

  const openItems = openBucket && stats ? stats.agendaItems[openBucket] : [];
  const openCopy = openBucket ? BUCKET_COPY[openBucket] : null;
  const showNewClientOriginList =
    openBucket === "newClients" && newClientOriginGroups.length > 0;
  const showGroupedKpiList =
    !showNewClientOriginList &&
    isAdmin &&
    !adminExecutiveFilter &&
    groupedOpenItems.length > 0;

  function renderMonthFilter() {
    return (
      <label className="block w-[10.5rem] shrink-0 space-y-1 sm:w-44">
        <span className="text-xs font-medium text-muted">Mes</span>
        <Select
          value={selectedMonth}
          options={MONTH_OPTIONS}
          onChange={(event) => updateHomeState("selectedMonth", event.target.value)}
          className="h-9"
        />
      </label>
    );
  }

  function renderExecutiveFilter() {
    if (!isAdmin) return null;
    return (
      <label className="block min-w-0 flex-1 space-y-1 sm:w-72 sm:flex-none">
        <span className="text-xs font-medium text-muted">Ejecutivo</span>
        <Select
          value={adminExecutiveFilter}
          options={executiveFilterOptions}
          onChange={(event) => updateHomeState("adminExecutiveFilter", event.target.value)}
          className="h-9"
          aria-label="Filtrar por ejecutivo"
        />
      </label>
    );
  }

  async function handleRefresh() {
    await Promise.all([
      clientsQuery.refetch(),
      quotationsQuery.refetch(),
      isAdmin ? executivesQuery.refetch() : Promise.resolve(),
    ]);
  }

  function formatSentAt(value: string) {
    return new Intl.DateTimeFormat("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Santiago",
    }).format(new Date(value));
  }

  function renderQuotationRow(row: SentQuotationKpiRow, index: number) {
    return (
      <li
        key={row.id}
        className={joinClasses(
          "flex items-start gap-3 px-5 py-3.5 transition-colors sm:px-6",
          index % 2 === 1 ? "bg-bg-layout/55" : "bg-transparent",
          "hover:bg-primary/8",
        )}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {row.clientName}
          </p>
          <p className="text-xs leading-relaxed text-foreground/90">
            {row.number}
            {" · "}
            {CLIENT_QUOTATION_STATUS_LABELS[row.status]}
            {row.isapres.length ? ` · ${row.isapres.join(", ")}` : ""}
          </p>
          <p className="text-xs text-muted">
            {QUOTATION_LIST_COPY[quotationList ?? "sent"].dateLabel}{" "}
            <span className="font-medium tabular-nums text-foreground/90">
              {quotationList === "RECEIVED" && row.receivedAt ? formatReceptionDate(row.receivedAt) : formatSentAt(
                (quotationList === "RECEIVED"
                  ? row.receivedAt
                  : quotationList === "ACCEPTED"
                    ? row.acceptedAt
                    : quotationList === "REJECTED"
                      ? row.rejectedAt
                      : row.sentAt) ?? row.sentAt,
              )}
            </span>
          </p>
          {isAdmin && adminExecutiveFilter ? (
            <p className="text-xs text-foreground/90">
              <span className="text-muted">Responsable: </span>
              <span className="font-semibold">{row.executiveName}</span>
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant="primary"
          aria-label={`Ver ficha de ${row.clientName}`}
          title="Ver ficha"
          onClick={() => openClientFicha(row.clientId)}
          className="size-9 shrink-0 px-0"
        >
          <IconEye className="size-5 text-white" />
        </Button>
      </li>
    );
  }

  function renderActiveQuotationClient(group: ActiveQuotationClient, index: number) {
    return (
      <li key={group.clientId} className={joinClasses(
        "flex items-start gap-3 px-5 py-3.5 sm:px-6",
        index % 2 === 1 ? "bg-bg-layout/55" : "bg-transparent",
      )}>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-semibold text-foreground">{group.clientName}</p>
          <p className="text-xs text-muted">
            {group.items.length} {group.items.length === 1 ? "cotización pendiente" : "cotizaciones pendientes"}
          </p>
          <ul className="space-y-2">
            {group.items.map(row => (
              <li key={row.id} className="rounded-lg border border-border/70 bg-white px-3 py-2 text-xs">
                <p className="font-semibold text-primary-dark">{row.number}</p>
                <p className="mt-1 text-muted">Enviada {formatSentAt(row.sentAt)}</p>
                {row.isapres.length ? <p className="mt-1 break-words">{row.isapres.join(", ")}</p> : null}
                <p className="mt-1 text-muted">Emitida por: {row.executiveName}</p>
              </li>
            ))}
          </ul>
        </div>
        <Button type="button" size="sm" variant="primary"
          aria-label={`Ver ficha de ${group.clientName}`} title="Ver ficha"
          onClick={() => openClientFicha(group.clientId)} className="size-9 shrink-0 px-0">
          <IconEye className="size-5 text-white" />
        </Button>
      </li>
    );
  }

  function openClientFicha(clientId: string) {
    router.push(staffClientHref(clientId));
  }

  function renderAgendaItemRow(
    row: ExecutiveAgendaStatItem,
    index: number,
    options?: { showResponsible?: boolean },
  ) {
    const showResponsible = options?.showResponsible ?? true;
    return (
      <li
        key={row.id}
        className={joinClasses(
          "flex items-start gap-3 px-5 py-3.5 transition-colors sm:px-6",
          index % 2 === 1 ? "bg-bg-layout/55" : "bg-transparent",
          "hover:bg-primary/8",
        )}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {row.clientName}
          </p>
          <p className="text-xs leading-relaxed text-foreground/90">
            {row.action || row.title}
          </p>
          <p className="text-xs text-muted">
            {row.title}
            {openCopy?.showDate && row.whenLabel ? (
              <>
                {" · "}
                <span className="font-medium tabular-nums text-foreground/90">
                  {row.whenLabel}
                </span>
              </>
            ) : null}
          </p>
          {showResponsible ? (
            <p className="text-xs text-foreground/90">
              <span className="text-muted">Responsable: </span>
              <span className="font-semibold">
                {row.responsibleName ?? "Sin asignar"}
              </span>
              {row.responsibleRole ? (
                <span className="text-muted"> · {row.responsibleRole}</span>
              ) : null}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant="primary"
          aria-label={`Ver ficha de ${row.clientName}`}
          title="Ver ficha"
          onClick={() => openClientFicha(row.clientId)}
          className="size-9 shrink-0 px-0"
        >
          <IconEye className="size-5 text-white" />
        </Button>
      </li>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-7">
      <section className="premium-dash-hero p-5 sm:p-8">
        <DashboardHeroDecoration />
        <div className="relative z-[1] flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <p className="premium-dash-kicker">Dashboard</p>
            <h1 className="premium-dash-greeting mt-2 text-2xl sm:text-3xl lg:text-[2rem]">
              {greeting}
              {firstName ? (
                <>
                  ,{" "}
                  <span className="premium-dash-greeting-name">{firstName}</span>
                </>
              ) : null}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-[0.95rem]">
              {heroHint}
            </p>
          </div>
          <div className="shrink-0 self-start">
            <AdminRefreshButton
              compactMobile
              loading={isFetching && !loadingStats}
              onClick={() => void handleRefresh()}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-primary-dark">
                Gestiones pendientes
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-xs font-semibold text-primary-dark"
                onClick={() => setHelpOpen(true)}
                aria-label="Qué miden estos indicadores"
              >
                <IconInfo className="size-4" />
                Qué miden
              </Button>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {selectedMonth ? "Totales del mes seleccionado." : "Totales de todos los meses."} Haz clic en una tarjeta para ver qué
              gestión corresponde a cada cliente.
            </p>
          </div>
          <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto sm:flex-nowrap sm:justify-end">
            {renderMonthFilter()}
            {renderExecutiveFilter()}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          {gestionCards.filter(item => item.bucket !== "newClients").map(renderAgendaCard)}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-primary-dark">
              Cotizaciones
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Usa el mes seleccionado arriba
              {isAdmin ? " y el ejecutivo de la vista general" : ""}. El filtro
              de isapre aplica a todas. «Activas» cuenta clientes únicos. Elige «Todos los meses» para incluir pendientes anteriores.
            </p>
          </div>
          <div className="w-full sm:max-w-xs lg:w-72">
            <IsapreMultiFilter
              options={isapreOptions}
              selectedIds={selectedIsapreIds}
              onChange={(ids) => updateHomeState("selectedIsapreIds", ids)}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 sm:gap-4">
          {(
            [
              {
                id: "sent" as const,
                label: "Cotizaciones enviadas",
                value: sentQuotations.length,
                hint: selectedIsapreIds.length
                  ? "Con al menos una isapre elegida"
                  : "Email o WhatsApp, aunque cambien de estado",
                ring: "ring-sky-300/60",
                valueClass: "text-sky-800",
                icon: <IconClipboard className="size-6" />,
              },
              {
                id: "active" as const,
                label: "Cotizaciones activas",
                value: activeQuotationClients.length,
                hint: selectedMonth ? "Clientes sin respuesta del mes elegido" : "Clientes sin respuesta de todos los meses",
                ring: "ring-amber-300/70",
                valueClass: "text-amber-800",
                icon: <IconClock className="size-6" />,
              },
              {
                id: "ACCEPTED" as const,
                label: "Aceptadas",
                value: acceptedQuotations.length,
                hint: "El cliente aceptó y sigue con Isapres",
                ring: "ring-emerald-300/70",
                valueClass: "text-emerald-800",
                icon: <IconClipboardCheck className="size-6" />,
              },
              {
                id: "RECEIVED" as const,
                label: "Recepcionadas",
                value: receivedQuotations.length,
                hint: "La Isapre aceptó y el proceso terminó",
                ring: "ring-amber-300/70",
                valueClass: "text-amber-800",
                icon: <IconClipboard className="size-6" />,
              },
              {
                id: "REJECTED" as const,
                label: "Rechazadas",
                value: rejectedQuotations.length,
                hint: "El cliente rechazó la propuesta",
                ring: "ring-danger/35",
                valueClass: "text-danger",
                icon: <IconClipboard className="size-6" />,
              },
            ]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={loadingQuotations}
              onClick={() => updateHomeState("quotationList", item.id)}
              className={joinClasses(
                "premium-dash-stat-card w-full text-left ring-1 transition hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                item.ring,
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="premium-dash-stat-label">{item.label}</p>
                <span className="premium-dash-stat-icon shrink-0" aria-hidden>
                  {item.icon}
                </span>
              </div>
              <p
                className={joinClasses(
                  "premium-dash-stat-value mt-3 tabular-nums",
                  item.valueClass,
                )}
              >
                {loadingQuotations ? "—" : item.value}
              </p>
              <p className="premium-dash-stat-hint mt-1.5">{item.hint}</p>
            </button>
          ))}
        </div>
        {quotationsQuery.isError ? (
          <p className="text-xs text-danger">
            No se pudieron cargar las cotizaciones.
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-primary-dark">Cartera</h2>
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {secondaryCards.map((item) => (
            <div key={item.label} className="premium-dash-stat-card">
              <div className="flex items-start justify-between gap-3">
                <p className="premium-dash-stat-label">{item.label}</p>
                <span className="premium-dash-stat-icon shrink-0" aria-hidden>
                  {item.icon}
                </span>
              </div>
              <p
                className={joinClasses(
                  "premium-dash-stat-value mt-3 tabular-nums",
                )}
              >
                {loadingStats
                  ? "—"
                  : item.value === undefined
                    ? "—"
                    : item.value}
              </p>
              <p className="premium-dash-stat-hint mt-1.5">{item.hint}</p>
            </div>
          ))}
          {showActiveClients ? (
            <button type="button" disabled={loadingStats || clientsQuery.isError}
              onClick={() => onStateChange(current => ({ ...current, activeClientsOpen: true, activeClientsPage: 1 }))}
              className="premium-dash-stat-card w-full text-left transition hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
              <div className="flex items-start justify-between gap-3">
                <p className="premium-dash-stat-label">Clientes activos</p>
                <span className="premium-dash-stat-icon shrink-0" aria-hidden><IconUsers className="size-6" /></span>
              </div>
              <p className="premium-dash-stat-value mt-3 tabular-nums">
                {loadingStats || clientsQuery.isError ? "—" : activeClients.length}
              </p>
              <p className="premium-dash-stat-hint mt-1.5">Cartera actual, sin perdidos ni pausados</p>
            </button>
          ) : null}
          {gestionCards.filter(item => item.bucket === "newClients").map(renderAgendaCard)}
        </div>
      </section>

      <AdminFormModal
        open={activeClientsOpen && showActiveClients}
        title="Clientes activos"
        description="Cartera actual del ejecutivo seleccionado. Cada cliente cuenta una vez, sin limitar por fecha de registro. Incluye Enviados a Isapre y Recepcionados; excluye Perdidos y En pausa."
        onClose={() => updateHomeState("activeClientsOpen", false)}
        size="xl">
        {activeClients.length ? (
          <div className="space-y-3">
            <nav aria-label="Paginación de clientes activos" className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <p>Mostrando {activePageStart + 1}–{Math.min(activePageStart + activePageSize, activeClients.length)} de {activeClients.length} clientes</p>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="ghost" disabled={currentActivePage === 1}
                  onClick={() => updateHomeState("activeClientsPage", currentActivePage - 1)}>Anterior</Button>
                <span>Página {currentActivePage} de {activePageCount}</span>
                <Button type="button" size="sm" variant="ghost" disabled={currentActivePage === activePageCount}
                  onClick={() => updateHomeState("activeClientsPage", currentActivePage + 1)}>Siguiente</Button>
              </div>
            </nav>
            <ul className="divide-y divide-border/70">
              {visibleActiveClients.map(client => (
                <li key={client.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0 space-y-1.5">
                    <p className="break-words text-sm font-semibold text-foreground">{client.fullName || "Cliente sin nombre"}</p>
                    <ClientPipelineStatusBadge status={client.pipelineStatus} />
                    <p className="text-xs text-muted">Responsable: {client.assignedExecutiveName?.trim() || "Sin asignar"}</p>
                  </div>
                  <Button type="button" size="sm" variant="primary" className="size-9 shrink-0 px-0"
                    aria-label={`Ver ficha de ${client.fullName || "cliente sin nombre"}`} title="Ver ficha"
                    onClick={() => openClientFicha(client.id)}><IconEye className="size-5 text-white" /></Button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted">
            No hay clientes activos con este filtro de ejecutivo.
          </p>
        )}
      </AdminFormModal>

      <AdminFormModal
        open={Boolean(openBucket && openCopy)}
        title={openCopy?.title ?? "Gestiones"}
        description={openCopy?.description}
        onClose={() => updateHomeState("openBucket", null)}
        size="xl"
      >
        {openItems.length > 0 ? (
          showNewClientOriginList ? (
            <div className="space-y-3 sm:space-y-4">
              {newClientOriginGroups.map((group) => (
                <section
                  key={group.source}
                  className="overflow-hidden rounded-xl border border-border/80 bg-white"
                >
                  <header className="flex items-center justify-between gap-3 border-b border-border/80 bg-[color-mix(in_srgb,var(--dash-navy,#092558)_7%,white)] px-4 py-2.5 sm:px-5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[color:var(--dash-navy,#092558)]">
                        {group.title}
                      </p>
                      <p className="text-[11px] text-muted">{group.hint}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center rounded-full bg-[color:var(--dash-navy,#092558)] px-2 py-0.5 text-xs font-bold tabular-nums text-white">
                      {group.items.length}
                    </span>
                  </header>
                  <ul className="divide-y divide-border/70">
                    {group.items.map((row, index) =>
                      renderAgendaItemRow(row, index),
                    )}
                  </ul>
                </section>
              ))}
            </div>
          ) : showGroupedKpiList ? (
            <div className="space-y-3 sm:space-y-4">
              {groupedOpenItems.map((group) => (
                <section
                  key={group.key}
                  className="overflow-hidden rounded-xl border border-border/80 bg-white"
                >
                  <header className="flex items-center justify-between gap-3 border-b border-border/80 bg-[color-mix(in_srgb,var(--dash-navy,#092558)_7%,white)] px-4 py-2.5 sm:px-5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[color:var(--dash-navy,#092558)]">
                        {group.name}
                      </p>
                      {group.roleLabel ? (
                        <p className="truncate text-[11px] text-muted">
                          {group.roleLabel}
                        </p>
                      ) : null}
                    </div>
                    <span className="inline-flex shrink-0 items-center rounded-full bg-[color:var(--dash-navy,#092558)] px-2 py-0.5 text-xs font-bold tabular-nums text-white">
                      {group.count}
                    </span>
                  </header>
                  <ul className="divide-y divide-border/70">
                    {group.items.map((row, index) =>
                      renderAgendaItemRow(row, index, {
                        showResponsible: false,
                      }),
                    )}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <ul className="-mx-5 -my-4 min-h-[min(62vh,32rem)] divide-y divide-border/70 sm:-mx-6">
              {openItems.map((row, index) =>
                renderAgendaItemRow(row, index),
              )}
            </ul>
          )
        ) : (
          <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted">
            No hay gestiones en esta categoría.
          </p>
        )}
      </AdminFormModal>

      <AdminFormModal
        open={quotationList !== null}
        title={QUOTATION_LIST_COPY[quotationList ?? "sent"].title}
        description={QUOTATION_LIST_COPY[quotationList ?? "sent"].description}
        onClose={() => updateHomeState("quotationList", null)}
        size="xl"
      >
        {openQuotations.length > 0 ? (
          quotationList === "active" ? (
            <div className="space-y-3 sm:space-y-4">
              {activeQuotationIsapreGroups.map((group) => (
                <section
                  key={group.isapreId}
                  className="overflow-hidden rounded-xl border border-border/80 bg-white"
                >
                  <header className="flex items-center justify-between gap-3 border-b border-border/80 bg-[color-mix(in_srgb,var(--dash-navy,#092558)_7%,white)] px-4 py-2.5 sm:px-5">
                    <p className="truncate text-sm font-semibold text-[color:var(--dash-navy,#092558)]">
                      {group.isapreName}
                    </p>
                    <span className="inline-flex shrink-0 items-center rounded-full bg-[color:var(--dash-navy,#092558)] px-2 py-0.5 text-xs font-bold tabular-nums text-white">
                      {group.clients.length}
                    </span>
                  </header>
                  <ul className="-mx-5 -my-4 divide-y divide-border/70 sm:-mx-6">
                    {group.clients.map((client, index) =>
                      renderActiveQuotationClient(client, index),
                    )}
                  </ul>
                </section>
              ))}
            </div>
          ) : quotationIsapreGroups.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {quotationIsapreGroups.map((group) => (
                <section
                  key={group.isapreId}
                  className="overflow-hidden rounded-xl border border-border/80 bg-white"
                >
                  <header className="flex items-center justify-between gap-3 border-b border-border/80 bg-[color-mix(in_srgb,var(--dash-navy,#092558)_7%,white)] px-4 py-2.5 sm:px-5">
                    <p className="truncate text-sm font-semibold text-[color:var(--dash-navy,#092558)]">
                      {group.isapreName}
                    </p>
                    <span className="inline-flex shrink-0 items-center rounded-full bg-[color:var(--dash-navy,#092558)] px-2 py-0.5 text-xs font-bold tabular-nums text-white">
                      {group.items.length}
                    </span>
                  </header>
                  <ul className="divide-y divide-border/70">
                    {group.items.map((row, index) =>
                      renderQuotationRow(row, index),
                    )}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <ul className="-mx-5 -my-4 min-h-[min(62vh,32rem)] divide-y divide-border/70 sm:-mx-6">
              {openQuotations.map((row, index) =>
                renderQuotationRow(row, index),
              )}
            </ul>
          )
        ) : (
          <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted">
            {QUOTATION_LIST_COPY[quotationList ?? "sent"].empty}
          </p>
        )}
      </AdminFormModal>

      <AdminFormModal
        open={helpOpen}
        title="Qué miden estos indicadores"
        description="Explicación para el ejecutivo. No cambia cómo gestionas al cliente; solo aclara el número de cada tarjeta."
        onClose={() => setHelpOpen(false)}
        size="lg"
      >
        <ul className="space-y-3">
          {DASHBOARD_KPI_HELP.map((item) => (
            <li
              key={item.label}
              className="rounded-xl border border-border/80 bg-white px-4 py-3"
            >
              <p className="text-sm font-semibold text-primary-dark">
                {item.label}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {item.measure}
              </p>
            </li>
          ))}
        </ul>
      </AdminFormModal>
    </div>
  );
}
