"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStaffSession } from "@/hooks/use-auth-session";
import { useExecutiveAccountsQuery } from "@/hooks/query/use-executive-accounts-query";
import { useExecutiveClientsQuery } from "@/hooks/query/use-executive-clients-query";
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
  buildAdminExecutiveFilterOptions,
  filterAgendaItemsByExecutive,
  filterClientsByExecutive,
  groupAgendaItemsByExecutive,
} from "@/lib/executive/dashboard-executive-filter";
import {
  DASHBOARD_KPI_HELP,
  groupNewClientItemsByIntake,
} from "@/lib/executive/dashboard-kpi";
import { staffClientHref } from "@/lib/staff/staff-sections";
import { joinClasses } from "@/lib/utils";
import {
  IconClipboard,
  IconClock,
  IconEye,
  IconInfo,
  IconUsers,
} from "@/components/executive/executive-icons";
import type { StaffAccountRecord } from "@/types/staff-account";
import type { UserRecord } from "@/types/user";

const MONTH_OPTIONS = buildAgendaMonthOptions(11);

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
    description: "Qué tienes que hacer hoy con cada cliente.",
    showDate: true,
  },
  overdue: {
    title: "Gestiones atrasadas",
    description:
      "Zoom no confirmado o cliente nuevo de un día anterior sin gestión.",
    showDate: true,
  },
  upcoming: {
    title: "Gestiones futuras",
    description: "Qué queda agendado para los próximos días.",
    showDate: true,
  },
  newClients: {
    title: "Clientes nuevos",
    description: "Sin primer contacto. Agrupados por cómo llegaron a tu cartera.",
    showDate: true,
  },
};

export function ExecutiveDashboardHome() {
  const router = useRouter();
  const { user, executiveKind, isAdmin } = useStaffSession();
  const isLimited =
    !isAdmin &&
    (executiveKind === "ISAPRES" || executiveKind === "ZOOM");

  const clientsQuery = useExecutiveClientsQuery();
  const executivesQuery = useExecutiveAccountsQuery({ enabled: isAdmin });

  const clients = clientsQuery.data;
  const executiveAccounts = useMemo(
    () => executivesQuery.data ?? [],
    [executivesQuery.data],
  );
  const sessionUserId = user?.id ?? null;

  const [openBucket, setOpenBucket] = useState<AgendaStatBucket | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  /** Solo admin: `""` = todos, `__unassigned__` = sin ejecutivo. */
  const [adminExecutiveFilter, setAdminExecutiveFilter] = useState(
    ADMIN_EXECUTIVE_FILTER_ALL,
  );
  const [selectedMonth, setSelectedMonth] = useState(
    () => santiagoMonthKey(new Date()) ?? MONTH_OPTIONS[0]?.value ?? "",
  );

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
      agendaItems,
    };
  }, [
    clients,
    isAdmin,
    sessionUserId,
    adminExecutiveFilter,
    unfilteredAgenda,
  ]);

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

  const loadingStats = clientsQuery.isLoading && !clientsQuery.data;
  const isFetching =
    clientsQuery.isFetching ||
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
      bucket: "dueToday",
      label: "Gestiones hoy",
      hint: "Llamados y confirmaciones para hoy",
      value: stats?.gestionesHoy,
      icon: <IconClock className="size-6" />,
      tone: "today",
    },
    {
      bucket: "overdue",
      label: "Atrasadas",
      hint: "Zoom no gestionado o nuevo sin contacto",
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

  function renderMonthFilter(options?: { compact?: boolean; hideLabel?: boolean }) {
    return (
      <label
        className={joinClasses(
          "block shrink-0 space-y-1",
          options?.compact ? "w-[10.5rem] sm:w-44" : "w-[10.5rem] sm:w-44",
        )}
      >
        {options?.hideLabel ? (
          <span className="sr-only">Mes</span>
        ) : (
          <span className="text-xs font-medium text-muted">Mes</span>
        )}
        <Select
          value={selectedMonth}
          options={MONTH_OPTIONS}
          onChange={(event) => setSelectedMonth(event.target.value)}
          className="h-9"
        />
      </label>
    );
  }

  function renderExecutiveFilter(options?: {
    compact?: boolean;
    hideLabel?: boolean;
  }) {
    if (!isAdmin) return null;
    return (
      <label className="block min-w-0 flex-1 space-y-1 sm:w-72 sm:flex-none">
        {options?.hideLabel ? (
          <span className="sr-only">Ejecutivo</span>
        ) : (
          <span className="text-xs font-medium text-muted">Ejecutivo</span>
        )}
        <Select
          value={adminExecutiveFilter}
          options={executiveFilterOptions}
          onChange={(event) => setAdminExecutiveFilter(event.target.value)}
          className="h-9"
          aria-label="Filtrar por ejecutivo"
        />
      </label>
    );
  }

  async function handleRefresh() {
    await Promise.all([
      clientsQuery.refetch(),
      isAdmin ? executivesQuery.refetch() : Promise.resolve(),
    ]);
  }

  function openClientFicha(clientId: string) {
    setOpenBucket(null);
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
              Totales del mes seleccionado. Haz clic en una tarjeta para ver qué
              gestión corresponde a cada cliente.
            </p>
          </div>
          <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto sm:flex-nowrap sm:justify-end">
            {renderMonthFilter()}
            {renderExecutiveFilter()}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          {gestionCards.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={loadingStats}
              onClick={() => setOpenBucket(item.bucket)}
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
          ))}
        </div>
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
        </div>
      </section>

      <AdminFormModal
        open={Boolean(openBucket && openCopy)}
        title={openCopy?.title ?? "Gestiones"}
        description={openCopy?.description}
        onClose={() => setOpenBucket(null)}
        size="xl"
        headerAside={
          <div className="flex max-w-[min(100%,24rem)] flex-wrap items-end justify-end gap-2 sm:max-w-none sm:flex-nowrap">
            {renderMonthFilter({ compact: true, hideLabel: true })}
            {isAdmin
              ? renderExecutiveFilter({ compact: true, hideLabel: true })
              : null}
          </div>
        }
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
