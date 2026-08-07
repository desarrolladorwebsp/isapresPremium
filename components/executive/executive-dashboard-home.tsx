"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStaffSession } from "@/hooks/use-auth-session";
import { useExecutiveClientsQuery } from "@/hooks/query/use-executive-clients-query";
import { useExecutiveQuotesQuery } from "@/hooks/query/use-executive-quotes-query";
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
import { staffClientHref } from "@/lib/staff/staff-sections";
import { joinClasses } from "@/lib/utils";
import {
  IconClipboard,
  IconClock,
  IconEye,
  IconUsers,
} from "@/components/executive/executive-icons";
import type { UserRecord } from "@/types/user";

const ADMIN_FILTER_ALL = "";
const ADMIN_FILTER_UNASSIGNED = "__unassigned__";
const MONTH_OPTIONS = buildAgendaMonthOptions(11);

interface DashboardStats {
  clients: number;
  derived: number;
  quotes: number;
  pendingQuotes: number;
  inDocumentation: number;
  closed: number;
  noAnswer: number;
  inFollowUp: number;
  gestionesHoy: number;
  gestionesVencidas: number;
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

/** Nombre + apellido (primer y último token) para el filtro admin. */
function shortExecutiveDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Sin nombre";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

const BUCKET_COPY: Record<
  AgendaStatBucket,
  { title: string; description: string; showDate: boolean }
> = {
  dueToday: {
    title: "Gestiones de hoy",
    description: "Llamados y confirmaciones pendientes para hoy.",
    showDate: true,
  },
  overdue: {
    title: "Gestiones vencidas",
    description: "Pendientes con fecha pasada o sin reagendar.",
    showDate: true,
  },
  upcoming: {
    title: "Gestiones futuras",
    description: "Agendadas para los próximos días.",
    showDate: true,
  },
  newClients: {
    title: "Clientes nuevos",
    description: "Asignados sin primer contacto ni agenda.",
    showDate: false,
  },
};

export function ExecutiveDashboardHome() {
  const router = useRouter();
  const { user, executiveKind, isAdmin, allowedSections } = useStaffSession();
  const isLimited =
    !isAdmin &&
    (executiveKind === "ISAPRES" || executiveKind === "ZOOM");
  const canSeeQuotes = isAdmin || allowedSections.includes("cotizaciones");

  const clientsQuery = useExecutiveClientsQuery();
  const quotesQuery = useExecutiveQuotesQuery({ enabled: canSeeQuotes });

  const clients = clientsQuery.data;
  const quotes = quotesQuery.data;

  const [openBucket, setOpenBucket] = useState<AgendaStatBucket | null>(null);
  /** Solo admin: `""` = todos, `__unassigned__` = sin ejecutivo. */
  const [adminExecutiveFilter, setAdminExecutiveFilter] =
    useState(ADMIN_FILTER_ALL);
  const [selectedMonth, setSelectedMonth] = useState(
    () => santiagoMonthKey(new Date()) ?? MONTH_OPTIONS[0]?.value ?? "",
  );

  const unfilteredAgenda = useMemo(() => {
    if (!clients) return null;
    if (!isAdmin) {
      if (!user?.id) return null;
      return countExecutiveAgendaStats({
        clients,
        executiveId: user.id,
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
  }, [clients, isAdmin, user?.id, selectedMonth]);

  const stats = useMemo<DashboardStats | null>(() => {
    if (!clients || !unfilteredAgenda) return null;
    const quoteRows = quotes ?? [];
    const activeClients =
      !isAdmin && user?.id
        ? clients.filter((client) => client.assignedExecutiveId === user.id)
        : clients;
    const derivedCount =
      !isAdmin && user?.id
        ? clients.filter(
            (client) =>
              client.trackingExecutiveId === user.id &&
              client.assignedExecutiveId !== user.id,
          ).length
        : 0;

    function filterItems(
      rows: ExecutiveAgendaStatItem[],
    ): ExecutiveAgendaStatItem[] {
      if (!isAdmin || !adminExecutiveFilter) return rows;
      if (adminExecutiveFilter === ADMIN_FILTER_UNASSIGNED) {
        return rows.filter((row) => !row.responsibleId);
      }
      return rows.filter((row) => row.responsibleId === adminExecutiveFilter);
    }

    const agendaItems = {
      dueToday: filterItems(unfilteredAgenda.items.dueToday),
      overdue: filterItems(unfilteredAgenda.items.overdue),
      upcoming: filterItems(unfilteredAgenda.items.upcoming),
      newClients: filterItems(unfilteredAgenda.items.newClients),
    };

    return {
      clients: activeClients.length,
      derived: derivedCount,
      quotes: canSeeQuotes ? quoteRows.length : 0,
      pendingQuotes: canSeeQuotes
        ? quoteRows.filter((quote) => quote.status === "PENDING").length
        : 0,
      inDocumentation: countByStatus(activeClients, "DOCUMENTACION"),
      closed: countByStatus(activeClients, "CERRADO"),
      noAnswer: countByStatus(activeClients, "NO_CONTESTA"),
      inFollowUp: countByStatus(activeClients, "EN_SEGUIMIENTO"),
      gestionesHoy: agendaItems.dueToday.length,
      gestionesVencidas: agendaItems.overdue.length,
      gestionesFuturas: agendaItems.upcoming.length,
      clientesNuevos: agendaItems.newClients.length,
      agendaItems,
    };
  }, [
    clients,
    quotes,
    canSeeQuotes,
    isAdmin,
    user?.id,
    adminExecutiveFilter,
    unfilteredAgenda,
  ]);

  const executiveFilterOptions = useMemo(() => {
    if (!isAdmin) return [];
    if (!unfilteredAgenda) {
      return [{ value: ADMIN_FILTER_ALL, label: "Todos" }];
    }

    const sourceItems = openBucket
      ? unfilteredAgenda.items[openBucket]
      : [
          ...unfilteredAgenda.items.dueToday,
          ...unfilteredAgenda.items.overdue,
          ...unfilteredAgenda.items.upcoming,
          ...unfilteredAgenda.items.newClients,
        ];

    const byExecutive = new Map<string, { name: string; count: number }>();
    let unassignedCount = 0;
    for (const item of sourceItems) {
      if (!item.responsibleId) {
        unassignedCount += 1;
        continue;
      }
      const name = item.responsibleName?.trim() || "Sin nombre";
      const current = byExecutive.get(item.responsibleId);
      if (current) {
        current.count += 1;
      } else {
        byExecutive.set(item.responsibleId, { name, count: 1 });
      }
    }

    if (
      adminExecutiveFilter &&
      adminExecutiveFilter !== ADMIN_FILTER_UNASSIGNED &&
      !byExecutive.has(adminExecutiveFilter) &&
      clients
    ) {
      const match = clients.find(
        (client) =>
          client.assignedExecutiveId === adminExecutiveFilter ||
          client.trackingExecutiveId === adminExecutiveFilter,
      );
      const name =
        match?.assignedExecutiveId === adminExecutiveFilter
          ? match.assignedExecutiveName
          : match?.trackingExecutiveName;
      byExecutive.set(adminExecutiveFilter, {
        name: name?.trim() || "Ejecutivo",
        count: 0,
      });
    }

    const executiveOptions = Array.from(byExecutive.entries())
      .map(([value, row]) => ({
        value,
        label: `${shortExecutiveDisplayName(row.name)} (${row.count})`,
        sortName: shortExecutiveDisplayName(row.name),
      }))
      .sort((a, b) => a.sortName.localeCompare(b.sortName, "es"))
      .map(({ value, label }) => ({ value, label }));

    return [
      { value: ADMIN_FILTER_ALL, label: "Todos" },
      {
        value: ADMIN_FILTER_UNASSIGNED,
        label: `Sin asignar (${unassignedCount})`,
      },
      ...executiveOptions,
    ];
  }, [
    isAdmin,
    unfilteredAgenda,
    openBucket,
    adminExecutiveFilter,
    clients,
  ]);

  const loadingStats = clientsQuery.isLoading && !clientsQuery.data;
  const isFetching =
    clientsQuery.isFetching || (canSeeQuotes && quotesQuery.isFetching);

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
      : "Revisa gestiones de hoy, vencidas y confirmaciones Zoom pendientes."
    : "Prioriza gestiones de hoy y vencidas; usa el menú para clientes, calendario y cotizador.";

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
      label: "Vencidas",
      hint: "Gestiones sin resolver con fecha pasada",
      value: stats?.gestionesVencidas,
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
      hint: "Asignados sin primer contacto ni agenda",
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
            label: "En documentación",
            hint: "Listos o en proceso de contratación",
            value: stats?.inDocumentation,
            icon: <IconClipboard className="size-6" />,
          },
          {
            label: "Cerrados",
            hint: "Negocios cerrados en tu cartera",
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
        {
          label: "Cotizaciones",
          hint: "Solicitudes asociadas a tu gestión",
          value: stats?.quotes,
          icon: <IconClipboard className="size-6" />,
        },
        {
          label: "Prospectos pendientes",
          hint: "Cotizaciones por gestionar",
          value: stats?.pendingQuotes,
          icon: <IconClock className="size-6" />,
        },
      ];

  const openItems = openBucket && stats ? stats.agendaItems[openBucket] : [];
  const openCopy = openBucket ? BUCKET_COPY[openBucket] : null;

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
      <label
        className={joinClasses(
          "block min-w-0 shrink-0 space-y-1",
          options?.compact ? "w-[13.5rem] sm:w-60" : "w-[13.5rem] sm:w-60",
        )}
      >
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
        />
      </label>
    );
  }

  async function handleRefresh() {
    await Promise.all([
      clientsQuery.refetch(),
      canSeeQuotes ? quotesQuery.refetch() : Promise.resolve(),
    ]);
  }

  function openClientFicha(clientId: string) {
    setOpenBucket(null);
    router.push(staffClientHref(clientId));
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
          <div>
            <h2 className="text-sm font-semibold text-primary-dark">
              Gestiones pendientes
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Totales del mes seleccionado. Haz clic en una tarjeta para ver la
              lista de clientes y el responsable.
            </p>
          </div>
          <div className="flex flex-nowrap items-end gap-2 sm:justify-end">
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
          <div className="flex flex-nowrap items-end justify-end gap-2">
            {renderMonthFilter({ compact: true, hideLabel: true })}
            {isAdmin
              ? renderExecutiveFilter({ compact: true, hideLabel: true })
              : null}
          </div>
        }
      >
        {openItems.length > 0 ? (
          <ul className="-mx-5 -my-4 min-h-[min(62vh,32rem)] divide-y divide-border/70 sm:-mx-6">
            {openItems.map((row, index) => (
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
                  <p className="text-xs text-foreground/90">
                    <span className="text-muted">Responsable: </span>
                    <span className="font-semibold">
                      {row.responsibleName ?? "Sin asignar"}
                    </span>
                    {row.responsibleRole ? (
                      <span className="text-muted">
                        {" "}
                        · {row.responsibleRole}
                      </span>
                    ) : null}
                  </p>
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
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted">
            No hay gestiones en esta categoría.
          </p>
        )}
      </AdminFormModal>
    </div>
  );
}
