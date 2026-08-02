"use client";

import { useMemo, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  AdminPanel,
  AdminPanelHeader,
} from "@/components/admin/admin-data-table";
import { Button } from "@/components/ui/button";
import { ClientPipelineDrawer } from "@/components/executive/client-pipeline-drawer";
import { ClientOriginBadge } from "@/components/executive/client-origin-badge";
import { ClientPipelineStatusBadge } from "@/components/executive/client-pipeline-status-badge";
import { ClientContactMethodBadge } from "@/components/executive/client-contact-method-badge";
import { ClientRutCell } from "@/components/executive/client-rut-cell";
import {
  IconArrowLeft,
} from "@/components/executive/executive-icons";
import { useStaffSession } from "@/hooks/use-auth-session";
import { useExecutiveClientsQuery } from "@/hooks/query/use-executive-clients-query";
import { getStaffRoleLabel } from "@/lib/auth/staff-role";
import { CLIENT_PIPELINE_STATUS_DESCRIPTIONS } from "@/lib/client-pipeline/constants";
import { syncClientMutationCache } from "@/lib/query/executive-cache";
import { staffExecutiveHref } from "@/lib/staff/staff-sections";
import { touchTarget, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { ClientPipelineStatus } from "@/types/client-pipeline";
import type { UserRecord } from "@/types/user";

export interface ExecutiveClientDetailViewProps {
  clientId: string;
  onBack: () => void;
  onNotify: (message: string, tone?: "success" | "error") => void;
  /** Tras redirección fuera de la cartera (no admin). */
  onLeftPortfolio?: () => void;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "medium",
  }).format(new Date(value));
}

function SummaryField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

export function ExecutiveClientDetailView({
  clientId,
  onBack,
  onNotify,
  onLeftPortfolio,
}: ExecutiveClientDetailViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAdmin } = useStaffSession();
  const clientsQuery = useExecutiveClientsQuery();

  const client = useMemo(
    () =>
      (clientsQuery.data ?? []).find((row) => row.id === clientId) ?? null,
    [clientsQuery.data, clientId],
  );

  const loading = clientsQuery.isLoading && !clientsQuery.data;

  function handleUpdated(updated: UserRecord) {
    syncClientMutationCache(queryClient, updated);
  }

  function handleRedirected(updated: UserRecord) {
    if (isAdmin) {
      syncClientMutationCache(queryClient, updated);
      return;
    }
    syncClientMutationCache(queryClient, updated, { removeFromList: true });
    onNotify("Cliente reasignado. Ya no aparece en tu cartera.");
    onLeftPortfolio?.();
    onBack();
  }

  if (loading) {
    return (
      <AdminPanel>
        <AdminPanelHeader
          title="Ficha del cliente"
          actions={
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onBack}
              className={joinClasses(touchTarget, "gap-1.5")}
            >
              <IconArrowLeft className="size-4" />
              Volver
            </Button>
          }
        />
        <p className="rounded-2xl border border-border bg-white px-4 py-8 text-center text-sm text-muted shadow-sm">
          Cargando ficha del cliente…
        </p>
      </AdminPanel>
    );
  }

  if (!client) {
    return (
      <AdminPanel>
        <AdminPanelHeader
          title="Cliente no encontrado"
          description="Puede que el cliente ya no esté en tu cartera o el enlace no sea válido."
          actions={
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onBack}
              className={joinClasses(touchTarget, "gap-1.5")}
            >
              <IconArrowLeft className="size-4" />
              Volver a clientes
            </Button>
          }
        />
        <div className="rounded-2xl border border-dashed border-border bg-white px-4 py-8 text-center shadow-sm">
          <p className="text-sm text-muted">
            No encontramos este cliente en la lista cargada.
          </p>
          <Button type="button" className="mt-4" onClick={onBack}>
            Volver al listado
          </Button>
        </div>
      </AdminPanel>
    );
  }

  const pipelineStatus = (client.pipelineStatus ??
    "NUEVO") as ClientPipelineStatus;
  const executiveRoleLabel = client.assignedExecutiveName
    ? getStaffRoleLabel({
        realm: "executive",
        executiveKind: client.assignedExecutiveKind,
      })
    : null;

  return (
    <AdminPanel>
      <AdminPanelHeader
        compactMobile
        title={client.fullName}
        description="Ficha completa: revisa datos, gestiona el pipeline y guarda los cambios sin salir de la vista."
        actions={
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onBack}
            aria-label="Volver a clientes"
            title="Volver a clientes"
            className={joinClasses(
              touchTarget,
              "px-0 sm:h-9 sm:min-h-9 sm:min-w-0 sm:gap-1.5 sm:px-3",
            )}
          >
            <IconArrowLeft className="size-4" />
            <span className="hidden sm:inline">Volver</span>
          </Button>
        }
      />

      <div
        className={joinClasses(
          "space-y-4 rounded-2xl border bg-white px-4 py-4 shadow-sm",
          ui.border,
        )}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryField label="Ejecutivo asignado">
            {client.assignedExecutiveName && client.assignedExecutiveId ? (
              <button
                type="button"
                onClick={() =>
                  router.push(staffExecutiveHref(client.assignedExecutiveId!))
                }
                className="text-left font-semibold text-primary-dark underline-offset-2 hover:underline"
              >
                {client.assignedExecutiveName}
              </button>
            ) : client.assignedExecutiveName ? (
              <span className="font-semibold">{client.assignedExecutiveName}</span>
            ) : (
              <span className="text-muted">Sin ejecutivo asignado</span>
            )}
          </SummaryField>

          <SummaryField label="Rol del ejecutivo">
            {executiveRoleLabel ? (
              <span className="font-medium">{executiveRoleLabel}</span>
            ) : (
              <span className="text-muted">Sin rol</span>
            )}
          </SummaryField>

          <SummaryField label="Etapa del cliente">
            <div className="space-y-1.5">
              <ClientPipelineStatusBadge status={pipelineStatus} />
              <p className="text-xs leading-snug text-muted">
                {CLIENT_PIPELINE_STATUS_DESCRIPTIONS[pipelineStatus]}
              </p>
            </div>
          </SummaryField>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <ClientContactMethodBadge method={client.preferredContactMethod} />
          <ClientOriginBadge
            origin={client.clientOrigin}
            cotizadorSource={client.cotizadorSource}
          />
          <span className="text-xs text-muted">
            Registro: {formatDate(client.createdAt)}
          </span>
          <div className="ml-auto min-w-0">
            <ClientRutCell rut={client.rut} />
          </div>
          {client.email ? (
            <p className="w-full truncate text-sm text-muted sm:w-auto">
              {client.email}
              {client.phone ? ` · ${client.phone}` : ""}
            </p>
          ) : null}
        </div>
      </div>

      <ClientPipelineDrawer
        client={client}
        open
        variant="page"
        closeAfterSave={false}
        onClose={onBack}
        onUpdated={handleUpdated}
        onRedirected={handleRedirected}
        onNotify={onNotify}
      />
    </AdminPanel>
  );
}
