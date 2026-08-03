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

export function canManageClientAsExecutive(
  client: { assignedExecutiveId?: string | null },
  executiveAccountId: string,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  return isClientAssignedTo(client, executiveAccountId);
}
