"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AdminPanel,
  AdminPanelHeader,
} from "@/components/admin/admin-data-table";
import { Button } from "@/components/ui/button";
import { ClientFichaCapsule } from "@/components/executive/client-ficha-capsule";
import {
  ClientPipelineDrawer,
  type ClientFichaModal,
  type ClientPipelineLaunchRequest,
} from "@/components/executive/client-pipeline-drawer";
import { ClientPipelineStatusBadge } from "@/components/executive/client-pipeline-status-badge";
import { ClientRutCell } from "@/components/executive/client-rut-cell";
import { IconArrowLeft } from "@/components/executive/executive-icons";
import { useStaffSession } from "@/hooks/use-auth-session";
import { useExecutiveClientsQuery } from "@/hooks/query/use-executive-clients-query";
import { isValidRut } from "@/lib/auth/rut";
import { resolveClientChecklist } from "@/lib/client-pipeline/constants";
import {
  canEditClientDataAsExecutive,
  isTrackingOnlyForExecutive,
} from "@/lib/client-pipeline/tracking";
import {
  clientNoteDisplayText,
  listClientNoteLines,
  listPipelineModificationLines,
} from "@/lib/client-pipeline/note-stamp";
import { resolveCurrentCoverageLabel } from "@/lib/client-profile/current-coverage";
import { formatPersonDisplayName } from "@/lib/format-person-name";
import { syncClientMutationCache } from "@/lib/query/executive-cache";
import {
  isStaffClientFlowId,
  isStaffClientGestionAction,
  staffClientHref,
  staffExecutiveHref,
  STAFF_CLIENT_FLOW_QUERY,
  STAFF_CLIENT_GESTION_QUERY,
  STAFF_EXECUTIVE_ID_QUERY,
} from "@/lib/staff/staff-sections";
import { touchTarget, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { CompanyAgreementLookupResult } from "@/types/company-agreement";
import type { ClientPipelineStatus } from "@/types/client-pipeline";
import type { UserRecord } from "@/types/user";

export interface ExecutiveClientDetailViewProps {
  clientId: string;
  onBack: () => void;
  onNotify: (message: string, tone?: "success" | "error") => void;
  /** Tras redirección fuera de la cartera (no admin). */
  onLeftPortfolio?: () => void;
}

/** Toggle temporal: las cápsulas de ficha quedan en el código pero ocultas. */
const SHOW_FICHA_CAPSULES = false;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
    timeStyle: "short",
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
      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-dark/70">
        {label}
      </p>
      <div className="text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

function IconBuilding({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 21V5a1 1 0 011-1h8a1 1 0 011 1v16M14 9h5a1 1 0 011 1v11M9 8h.01M9 12h.01M9 16h.01M17 13h.01M17 17h.01" strokeLinecap="round" />
    </svg>
  );
}

function IconFamily({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="9" cy="7" r="3" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M3 20v-1a5 5 0 0110 0v1M14.5 20v-.8a4 4 0 013.5-3.95" strokeLinecap="round" />
    </svg>
  );
}

function IconPlan({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" strokeLinecap="round" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" strokeLinecap="round" />
    </svg>
  );
}

function IconDocs({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 3v5h5M9 13h6M9 17h4" strokeLinecap="round" />
    </svg>
  );
}

function IconHistory({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 3v5h5M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPrevision({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7l8-4z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 12.5l1.8 1.8 3.7-3.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconNotes({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 3v5h5M9 13h6M9 17h4" strokeLinecap="round" />
    </svg>
  );
}

function buildCapsuleBullets(
  client: UserRecord,
  convenioLabel: string,
): {
  employer: string[];
  prevision: string[];
  family: string[];
  plan: string[];
  docs: string[];
  historial: string[];
  notas: string[];
} {
  const profile = client.clientProfile;
  const titulares =
    1 + (profile?.additionalTitulares?.length ?? 0);
  const cargas = profile?.dependents?.length ?? 0;
  const plan = client.advisedPlan ?? client.requestedPlan;
  const checklist = resolveClientChecklist(client.checklist);
  const docsDone = checklist.items.filter((item) => item.checked).length;
  const docsTotal = checklist.items.length;
  const noteLines = listClientNoteLines(client.pipelineNotes);
  const modificationLines = listPipelineModificationLines(client.pipelineNotes);
  const lastNote = noteLines[0];
  const lastNotePreview = lastNote
    ? clientNoteDisplayText(lastNote)
    : null;
  const previsionLabel = resolveCurrentCoverageLabel(
    profile?.currentIsapre,
    "Sin previsión registrada",
  );
  const planPrice = profile?.currentPlanPrice?.trim();
  const planPriceLabel = planPrice
    ? `${planPrice} ${profile?.currentPlanPriceCurrency === "CLP" ? "CLP" : "UF"}`
    : "Sin precio del plan";
  const voluntario = profile?.voluntaryAdditional?.trim();
  const voluntarioLabel = voluntario
    ? `Voluntario: ${voluntario} ${profile?.voluntaryAdditionalCurrency === "CLP" ? "CLP" : "UF"}`
    : "Sin adicional voluntario";

  return {
    employer: [
      profile?.employerRut?.trim()
        ? `RUT: ${profile.employerRut.trim()}`
        : "Sin RUT empleador",
      profile?.rentaImponible?.trim()
        ? `Renta: ${profile.rentaImponible.trim()}`
        : "Sin renta imponible",
      convenioLabel,
    ],
    prevision: [
      previsionLabel,
      planPriceLabel,
      voluntarioLabel,
      profile?.anualidad ? "Con anualidad" : "Sin anualidad",
    ],
    family: [
      `${titulares} titular${titulares === 1 ? "" : "es"}`,
      `${cargas} carga${cargas === 1 ? "" : "s"}`,
      profile?.firstNames?.trim() || profile?.lastNames?.trim()
        ? `Titular: ${[profile?.firstNames, profile?.lastNames].filter(Boolean).join(" ") || client.fullName}`
        : `Titular: ${client.fullName}`,
    ],
    plan: [
      plan?.isapre?.trim() || "Sin isapre",
      plan?.planName?.trim() || "Sin plan elegido",
      plan?.basePriceUf != null
        ? `UF ${plan.basePriceUf}`
        : plan?.finalPriceUf != null
          ? `UF ${plan.finalPriceUf}`
          : "Sin precio UF",
    ],
    docs: [
      `Checklist ${docsDone}/${docsTotal}`,
      "RUT, liquidación, plan u otros",
      "Vista previa en la ficha",
    ],
    historial: [
      modificationLines.length === 0
        ? "Sin movimientos aún"
        : `${modificationLines.length} movimiento${modificationLines.length === 1 ? "" : "s"}`,
      "Contacto, reagendar, derivaciones",
      "Sin incluir notas libres",
    ],
    notas: [
      noteLines.length === 0
        ? "Sin notas aún"
        : `${noteLines.length} nota${noteLines.length === 1 ? "" : "s"}`,
      lastNotePreview
        ? `Última: ${lastNotePreview.length > 42 ? `${lastNotePreview.slice(0, 42)}…` : lastNotePreview}`
        : "Agrega comentarios del ejecutivo",
      "Distintas del historial de sistema",
    ],
  };
}

export function ExecutiveClientDetailView({
  clientId,
  onBack,
  onNotify,
  onLeftPortfolio,
}: ExecutiveClientDetailViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const queryClient = useQueryClient();
  const { isAdmin, user, executiveKind } = useStaffSession();
  const clientsQuery = useExecutiveClientsQuery();
  const [fichaModal, setFichaModal] = useState<ClientFichaModal>(null);
  const [pendingFamilyAdd, setPendingFamilyAdd] = useState<
    "titular" | "carga" | null
  >(null);
  const [convenioLabel, setConvenioLabel] = useState("Sin RUT empleador");
  const [protocolFlowActive, setProtocolFlowActive] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [launchRequest, setLaunchRequest] =
    useState<ClientPipelineLaunchRequest | null>(null);

  useEffect(() => {
    const flowRaw = searchParams.get(STAFF_CLIENT_FLOW_QUERY)?.trim() ?? "";
    const gestionRaw =
      searchParams.get(STAFF_CLIENT_GESTION_QUERY)?.trim() ?? "";
    if (!isStaffClientFlowId(flowRaw) && !isStaffClientGestionAction(gestionRaw)) {
      return;
    }

    const flow = isStaffClientFlowId(flowRaw)
      ? flowRaw
      : executiveKind === "ZOOM"
        ? "zoom"
        : executiveKind === "ISAPRES"
          ? "isapres"
          : "premium";
    const gestion = isStaffClientGestionAction(gestionRaw) ? gestionRaw : null;
    setLaunchRequest({ flow, gestion });

    const executiveId =
      searchParams.get(STAFF_EXECUTIVE_ID_QUERY)?.trim() || undefined;
    router.replace(staffClientHref(clientId, { executiveId }), {
      scroll: false,
    });
  }, [clientId, executiveKind, router, searchParams]);

  const client = useMemo(
    () =>
      (clientsQuery.data ?? []).find((row) => row.id === clientId) ?? null,
    [clientsQuery.data, clientId],
  );

  const employerRut = client?.clientProfile?.employerRut?.trim() ?? "";

  useEffect(() => {
    setProtocolFlowActive(false);
    setHasUnsavedChanges(false);
  }, [clientId]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedChanges]);

  function requestLeave(leave: () => void) {
    if (!hasUnsavedChanges) {
      leave();
      return;
    }
    const confirmed = window.confirm(
      "Hay cambios sin guardar. Si sales ahora, se perderán. ¿Salir de todos modos?",
    );
    if (confirmed) leave();
  }

  useEffect(() => {
    if (!employerRut) {
      setConvenioLabel("Sin RUT empleador");
      return;
    }
    if (!isValidRut(employerRut)) {
      setConvenioLabel("RUT empleador inválido");
      return;
    }

    let cancelled = false;
    setConvenioLabel("Verificando convenio…");
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams({ rut: employerRut });
          const response = await fetch(
            `/api/company-agreements/lookup?${params}`,
          );
          const payload = (await response.json().catch(() => null)) as
            | (CompanyAgreementLookupResult & { error?: string })
            | null;
          if (cancelled) return;
          if (!response.ok) {
            setConvenioLabel("No se pudo verificar convenio");
            return;
          }
          const match = payload?.matches[0] ?? null;
          if (!match) {
            setConvenioLabel("Sin convenio");
            return;
          }
          const name = match.companyName.trim() || "Empresa con convenio";
          const discount =
            match.discountPercent == null
              ? null
              : Number.isInteger(match.discountPercent)
                ? `${match.discountPercent}%`
                : `${match.discountPercent.toLocaleString("es-CL", {
                    maximumFractionDigits: 2,
                  })}%`;
          setConvenioLabel(
            discount ? `En convenio · ${name} · ${discount}` : `En convenio · ${name}`,
          );
        } catch {
          if (!cancelled) setConvenioLabel("No se pudo verificar convenio");
        }
      })();
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [employerRut]);

  const loading = clientsQuery.isLoading && !clientsQuery.data;

  function handleUpdated(updated: UserRecord) {
    syncClientMutationCache(queryClient, updated);
  }

  function handleRedirected(updated: UserRecord) {
    if (isAdmin) {
      syncClientMutationCache(queryClient, updated);
      onNotify("Cliente reasignado.");
      return;
    }
    const stillVisible =
      Boolean(user?.id) &&
      (updated.assignedExecutiveId === user?.id ||
        updated.trackingExecutiveId === user?.id);
    syncClientMutationCache(queryClient, updated, {
      removeFromList: !stillVisible,
    });
    if (stillVisible) {
      onNotify(
        "Cliente derivado. Queda en Derivados hasta el cierre del negocio.",
      );
      return;
    }
    onNotify("Cliente reasignado. Ya no aparece en tu cartera.");
    onLeftPortfolio?.();
    onBack();
  }

  function openFamilyModal() {
    setPendingFamilyAdd(null);
    setFichaModal("family");
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
  const isTrackingOnly = Boolean(
    user?.id && !isAdmin && isTrackingOnlyForExecutive(client, user.id),
  );
  const canEditClientData = Boolean(
    user?.id &&
      canEditClientDataAsExecutive(client, user.id, isAdmin, executiveKind),
  );
  const bullets = buildCapsuleBullets(client, convenioLabel);
  const noteLinesCount = listClientNoteLines(client.pipelineNotes).length;
  const assignedLabel = formatPersonDisplayName(
    client.assignedExecutiveName,
    "Sin ejecutivo asignado",
  );

  return (
    <AdminPanel className={protocolFlowActive ? "space-y-0" : undefined}>
      <div
        className={joinClasses(
          "min-w-0",
          protocolFlowActive ? "" : "space-y-5",
        )}
      >
          {protocolFlowActive ? null : (
          <div
            className={joinClasses(
              "rounded-2xl border bg-white px-4 py-4 shadow-card sm:px-5",
              ui.border,
            )}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
              <div className="min-w-0 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-dark/65">
                  Ficha del cliente
                </p>
                <h2 className="truncate text-xl font-bold text-primary-dark sm:text-2xl">
                  {client.fullName}
                </h2>
                {isTrackingOnly ? (
                  <span className="inline-flex w-fit rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
                    Derivado · seguimiento
                  </span>
                ) : null}
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-primary-dark/10 bg-primary-dark/[0.03] p-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:border-0 lg:bg-transparent lg:p-0 lg:border-l lg:border-primary-dark/15 lg:pl-6">
                <SummaryField label="Estado">
                  <ClientPipelineStatusBadge status={pipelineStatus} />
                </SummaryField>
                <SummaryField label="RUT">
                  <ClientRutCell rut={client.rut} />
                </SummaryField>
                <SummaryField label="Ejecutivo asignado">
                  {client.assignedExecutiveName && client.assignedExecutiveId ? (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          staffExecutiveHref(client.assignedExecutiveId!),
                        )
                      }
                      className="text-left font-semibold text-primary-dark underline-offset-2 hover:underline"
                    >
                      {assignedLabel}
                    </button>
                  ) : (
                    <span
                      className={
                        client.assignedExecutiveName
                          ? "font-semibold"
                          : "text-muted"
                      }
                    >
                      {assignedLabel}
                    </span>
                  )}
                </SummaryField>
                <SummaryField label="Fecha de creación">
                  <span className="tabular-nums text-primary-dark">
                    {formatDate(client.createdAt)}
                  </span>
                </SummaryField>
              </div>
            </div>
          </div>
          )}

          {/* Cápsulas de ficha: ocultas temporalmente (no borrar). */}
          {SHOW_FICHA_CAPSULES && !protocolFlowActive ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <ClientFichaCapsule
              icon={<IconFamily />}
              title="Grupo familiar"
              description="Titulares y cargas del grupo familiar."
              bullets={bullets.family}
              ctaLabel={
                canEditClientData ? "Editar grupo familiar" : "Ver grupo familiar"
              }
              onClick={() => openFamilyModal()}
            />
            <ClientFichaCapsule
              icon={<IconBuilding />}
              title="Empleador"
              description="RUT del empleador, convenio y renta imponible."
              bullets={bullets.employer}
              ctaLabel={canEditClientData ? "Editar empleador" : "Ver empleador"}
              onClick={() => setFichaModal("employer")}
            />
            <ClientFichaCapsule
              icon={<IconPrevision />}
              title="Previsión actual"
              description="Isapre, Fonasa o sin previsión, costo y anualidad."
              bullets={bullets.prevision}
              ctaLabel={
                canEditClientData ? "Editar previsión" : "Ver previsión"
              }
              onClick={() => setFichaModal("prevision")}
            />
            <ClientFichaCapsule
              icon={<IconPlan />}
              title="Plan elegido"
              description="Plan asesorado o cotizado para este cliente."
              bullets={bullets.plan}
              ctaLabel={canEditClientData ? "Editar plan" : "Ver plan"}
              onClick={() => setFichaModal("plan")}
            />
            <ClientFichaCapsule
              icon={<IconDocs />}
              title="Documentos"
              description="Checklist y archivos adjuntos de la ficha."
              bullets={bullets.docs}
              ctaLabel={
                canEditClientData ? "Gestionar documentos" : "Ver documentos"
              }
              onClick={() => setFichaModal("docs")}
            />
            <ClientFichaCapsule
              icon={<IconHistory />}
              title="Historial modificaciones"
              description="Registro de contacto, reagendar, derivaciones y cierres."
              bullets={bullets.historial}
              ctaLabel="Ver historial"
              onClick={() => setFichaModal("historial")}
            />
            <ClientFichaCapsule
              icon={<IconNotes />}
              title="Notas cliente"
              description="Notas libres del ejecutivo. Distintas del historial de modificaciones."
              bullets={bullets.notas}
              ctaLabel={
                canEditClientData
                  ? noteLinesCount > 0
                    ? "Ver y agregar notas"
                    : "Agregar nota"
                  : "Ver notas"
              }
              onClick={() => setFichaModal("notas")}
            />
          </div>
          ) : null}

          <ClientPipelineDrawer
            client={client}
            open
            variant="page"
            layout="operations"
            closeAfterSave={false}
            fichaModal={fichaModal}
            onFichaModalChange={setFichaModal}
            pendingFamilyAdd={pendingFamilyAdd}
            onPendingFamilyAddConsumed={() => setPendingFamilyAdd(null)}
            onActiveFlowChange={(flow) => setProtocolFlowActive(Boolean(flow))}
            onUnsavedChangesChange={setHasUnsavedChanges}
            launchRequest={launchRequest}
            onLaunchConsumed={() => setLaunchRequest(null)}
            onClose={() => requestLeave(onBack)}
            onUpdated={handleUpdated}
            onRedirected={handleRedirected}
            onNotify={onNotify}
          />
      </div>
    </AdminPanel>
  );
}
