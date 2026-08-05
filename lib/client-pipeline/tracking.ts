import type { ExecutiveKind } from "@prisma/client";

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

export function canViewClientAsExecutive(
  client: {
    assignedExecutiveId?: string | null;
    trackingExecutiveId?: string | null;
  },
  executiveAccountId: string,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
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
 * - Zoom / Isapres Premium: si puede ver al cliente (asignado o seguimiento)
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
  if (executiveKind === "ZOOM" || executiveKind === "ISAPRES_PREMIUM") {
    return canViewClientAsExecutive(client, executiveAccountId, false);
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
