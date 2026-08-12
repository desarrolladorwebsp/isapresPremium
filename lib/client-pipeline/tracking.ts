import type { ExecutiveKind } from "@prisma/client";
import { canBrowseAllClientsAsExecutive } from "@/lib/auth/staff-role";

/** Minutos antes de la reunión Premium para el llamado de confirmación Zoom. */
export const CONFIRMATION_CALL_LEAD_MINUTES = 10;

export function computeConfirmationCallAt(appointmentAt: Date): Date {
  return new Date(
    appointmentAt.getTime() - CONFIRMATION_CALL_LEAD_MINUTES * 60 * 1000,
  );
}

export function isClientAssignedTo(
  client: { assignedExecutiveId?: string | null },
  executiveAccountId: string,
): boolean {
  return client.assignedExecutiveId === executiveAccountId;
}

export function isClientTrackedBy(
  client: { trackingExecutiveId?: string | null },
  executiveAccountId: string,
): boolean {
  return client.trackingExecutiveId === executiveAccountId;
}

/** Solo seguimiento post-handoff (no es el ejecutivo asignado activo). */
export function isTrackingOnlyForExecutive(
  client: {
    assignedExecutiveId?: string | null;
    trackingExecutiveId?: string | null;
  },
  executiveAccountId: string,
): boolean {
  return (
    isClientTrackedBy(client, executiveAccountId) &&
    !isClientAssignedTo(client, executiveAccountId)
  );
}

/**
 * Marca de devolución aguas arriba (Premium → Zoom, Isapres → Premium, etc.).
 * Compatible con el texto legado `Enviado a Zoom · …`.
 */
const RETURNED_CLIENT_OUTCOME_RE =
  /^(Devuelto a (?:Ejecutivo )?(?:Zoom|Isapres Premium)|Enviado a Zoom)\b/i;

const RETURNED_CLIENT_NOTE_RE =
  /(?:Devuelto a Ejecutivo (?:Zoom|Isapres Premium)|Enviado a Ejecutivo Zoom)\b/i;

export function clientLooksReturnedUpstream(client: {
  lastCallOutcome?: string | null;
  pipelineNotes?: string | null;
  pipelineStatus?: string | null;
}): boolean {
  const outcome = client.lastCallOutcome?.trim() ?? "";
  if (RETURNED_CLIENT_OUTCOME_RE.test(outcome)) return true;
  // Fallback legado: solo mientras siga en NO_CONTESTA tras devolución a Zoom.
  if ((client.pipelineStatus ?? "NUEVO") !== "NO_CONTESTA") return false;
  return RETURNED_CLIENT_NOTE_RE.test(client.pipelineNotes ?? "");
}

/**
 * Cliente devuelto a este ejecutivo (está asignado a él tras una devolución
 * desde un rol aguas abajo: p. ej. Premium → Zoom o Isapres → Premium).
 */
export function isReturnedClientForExecutive(
  client: {
    assignedExecutiveId?: string | null;
    lastCallOutcome?: string | null;
    pipelineNotes?: string | null;
    pipelineStatus?: string | null;
  },
  executiveAccountId: string,
): boolean {
  return (
    isClientAssignedTo(client, executiveAccountId) &&
    clientLooksReturnedUpstream(client)
  );
}

export function canViewClientAsExecutive(
  client: {
    assignedExecutiveId?: string | null;
    trackingExecutiveId?: string | null;
  },
  executiveAccountId: string,
  isAdmin: boolean,
  executiveKind?: ExecutiveKind | null,
): boolean {
  if (isAdmin) return true;
  if (canBrowseAllClientsAsExecutive(executiveKind)) return true;
  return (
    isClientAssignedTo(client, executiveAccountId) ||
    isClientTrackedBy(client, executiveAccountId)
  );
}

/**
 * Puede editar datos del cliente (perfil, origen, checklist, cierre, notas, etc.)
 * en cualquier estado del pipeline.
 *
 * - Admin: siempre
 * - Zoom / Isapres Premium: asignado activo o en seguimiento (no el listado global)
 * - Otros ejecutivos: solo si están asignados
 */
export function canEditClientDataAsExecutive(
  client: {
    assignedExecutiveId?: string | null;
    trackingExecutiveId?: string | null;
  },
  executiveAccountId: string,
  isAdmin: boolean,
  executiveKind?: ExecutiveKind | null,
): boolean {
  if (isAdmin) return true;
  if (canBrowseAllClientsAsExecutive(executiveKind)) {
    return (
      isClientAssignedTo(client, executiveAccountId) ||
      isClientTrackedBy(client, executiveAccountId)
    );
  }
  return canManageClientAsExecutive(client, executiveAccountId, false);
}

/** Acciones de gestión / handoff: asignado activo o admin. */
export function canManageClientAsExecutive(
  client: { assignedExecutiveId?: string | null },
  executiveAccountId: string,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  return isClientAssignedTo(client, executiveAccountId);
}
