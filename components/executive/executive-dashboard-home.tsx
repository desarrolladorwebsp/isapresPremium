"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { useStaffSession } from "@/hooks/use-auth-session";
import { useExecutiveClientsQuery } from "@/hooks/query/use-executive-clients-query";
import { useExecutiveQuotesQuery } from "@/hooks/query/use-executive-quotes-query";
import { AdminRefreshButton } from "@/components/admin/admin-data-table";
import { joinClasses } from "@/lib/utils";
import {
  IconClipboard,
  IconClock,
  IconUsers,
} from "@/components/executive/executive-icons";
import type { UserRecord } from "@/types/user";

interface DashboardStats {
  clients: number;
  quotes: number;
  pendingQuotes: number;
  inDocumentation: number;
  closed: number;
  noAnswer: number;
  inFollowUp: number;
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

export function ExecutiveDashboardHome() {
  const { user, executiveKind, isAdmin, allowedSections } = useStaffSession();
  const isLimited =
    !isAdmin &&
    (executiveKind === "ISAPRES" || executiveKind === "ZOOM");
  const canSeeQuotes = isAdmin || allowedSections.includes("cotizaciones");

  const clientsQuery = useExecutiveClientsQuery();
  const quotesQuery = useExecutiveQuotesQuery({ enabled: canSeeQuotes });

  const clients = clientsQuery.data;
  const quotes = quotesQuery.data;

  const stats = useMemo<DashboardStats | null>(() => {
    if (!clients) return null;
    const quoteRows = quotes ?? [];
    return {
      clients: clients.length,
      quotes: canSeeQuotes ? quoteRows.length : 0,
      pendingQuotes: canSeeQuotes
        ? quoteRows.filter((quote) => quote.status === "PENDING").length
        : 0,
      inDocumentation: countByStatus(clients, "DOCUMENTACION"),
      closed: countByStatus(clients, "CERRADO"),
      noAnswer: countByStatus(clients, "NO_CONTESTA"),
      inFollowUp: countByStatus(clients, "EN_SEGUIMIENTO"),
    };
  }, [clients, quotes, canSeeQuotes]);

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
      ? "Revisa tus clientes asignados, el calendario y cierra el contrato cuando corresponda."
      : "Revisa tus clientes asignados y el calendario de llamados."
    : "Usa el menú de navegación para acceder al cotizador, tus clientes y cotizaciones.";

  const statCards: Array<{
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
            label: "No contesta",
            hint: "Pendientes de contacto",
            value: stats?.noAnswer,
            icon: <IconClipboard className="size-6" />,
          },
          {
            label: "En seguimiento",
            hint: "Clientes con llamado o seguimiento",
            value: stats?.inFollowUp,
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

  async function handleRefresh() {
    await Promise.all([
      clientsQuery.refetch(),
      canSeeQuotes ? quotesQuery.refetch() : Promise.resolve(),
    ]);
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

      <section className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        {statCards.map((item) => (
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
      </section>
    </div>
  );
}
