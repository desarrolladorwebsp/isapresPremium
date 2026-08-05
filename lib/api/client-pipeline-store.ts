import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api/api-error";
import {
  clientRecordInclude,
  mapDbClientRecord,
  readClientOrThrow,
  type ClientRecordWithPlans,
} from "@/lib/api/user-store";
import {
  CLIENT_PIPELINE_STATUS_OPTIONS,
  parseClientClosedRecord,
} from "@/lib/client-pipeline/constants";
import { normalizeClientProfileInput } from "@/lib/client-profile/constants";
import {
  listEligibleExecutivesForAssignment,
  pickExecutiveRoundRobin,
} from "@/lib/api/lead-assignment";
import { queueExecutiveClientAssignmentEmail } from "@/lib/email/notify-executive-client-assignment";
import { isSubscriptionActive } from "@/lib/auth/subscription";
import { adminCanReceiveAssignmentsForKind } from "@/lib/auth/staff-role";
import {
  canEditClientDataAsExecutive,
  canManageClientAsExecutive,
  canViewClientAsExecutive,
  computeConfirmationCallAt,
  CONFIRMATION_CALL_LEAD_MINUTES,
  isClientTrackedBy,
} from "@/lib/client-pipeline/tracking";
import type { StaffRealm } from "@/types/staff-account";
import type {
  ClientClosedRecord,
  PremiumRedirectTargetKind,
  RedirectClientFromPremiumInput,
  RedirectClientToPremiumInput,
  UpdateClientPipelineInput,
} from "@/types/client-pipeline";
import { CLIENT_CONTACT_METHOD_LABELS } from "@/types/client-pipeline";
import type { UserRecord } from "@/types/user";
import { CLIENT_ORIGIN_OPTIONS, isClientOrigin } from "@/types/user";
import type { ExecutiveKind, Prisma } from "@prisma/client";
import {
  appendPipelineNoteLine,
  canAccessInternalPipelineNotes,
} from "@/lib/client-pipeline/note-stamp";

function clientOriginLabel(origin: string): string {
  return (
    CLIENT_ORIGIN_OPTIONS.find((option) => option.value === origin)?.label ??
    origin
  );
}

async function resolveActorDisplayName(
  executiveAccountId: string,
  isAdmin: boolean,
): Promise<string> {
  const staff = await prisma.staffAccount.findUnique({
    where: { id: executiveAccountId },
    select: { fullName: true },
  });
  return staff?.fullName?.trim() || (isAdmin ? "Administrador" : "Ejecutivo");
}

function assertExecutiveAccess(
  user: ClientRecordWithPlans,
  executiveAccountId: string,
  isAdmin: boolean,
): void {
  if (!canManageClientAsExecutive(user, executiveAccountId, isAdmin)) {
    throw new ApiError(
      "No tienes permiso para gestionar este cliente.",
      403,
      "FORBIDDEN",
    );
  }
}

function assertCanEditClientData(
  user: ClientRecordWithPlans,
  actor: {
    executiveAccountId: string;
    isAdmin: boolean;
    executiveKind?: ExecutiveKind | null;
  },
): void {
  if (
    !canEditClientDataAsExecutive(
      user,
      actor.executiveAccountId,
      actor.isAdmin,
      actor.executiveKind,
    )
  ) {
    throw new ApiError(
      "No tienes permiso para editar los datos de este cliente.",
      403,
      "FORBIDDEN",
    );
  }
}

function assertExecutiveCanView(
  user: ClientRecordWithPlans,
  executiveAccountId: string,
  isAdmin: boolean,
): void {
  if (!canViewClientAsExecutive(user, executiveAccountId, isAdmin)) {
    throw new ApiError(
      "No tienes permiso para ver este cliente.",
      403,
      "FORBIDDEN",
    );
  }
}

function clearTrackingFields(): Prisma.UserUpdateInput {
  return {
    trackingExecutive: { disconnect: true },
    confirmationCallAt: null,
  };
}

function validateClosedRecord(
  record: ClientClosedRecord | null | undefined,
): ClientClosedRecord | null {
  if (!record) return null;
  if (!record.isapre.trim()) {
    throw new ApiError(
      "Indica la Isapre al cerrar el cliente.",
      400,
      "INVALID_CLOSED_RECORD",
    );
  }
  if (!record.closedAt.trim()) {
    throw new ApiError(
      "Indica la fecha de cierre.",
      400,
      "INVALID_CLOSED_RECORD",
    );
  }
  return {
    isapre: record.isapre.trim(),
    planCode: record.planCode?.trim() || null,
    planName: record.planName?.trim() || null,
    closedAt: record.closedAt.trim(),
    finalPriceUf: record.finalPriceUf?.trim() || null,
    finalPriceClp: record.finalPriceClp?.trim() || null,
    isapreReference: record.isapreReference?.trim() || null,
    notes: record.notes?.trim() || null,
  };
}

function parseNextCallAt(value: string | null): Date | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(
      "La fecha del próximo llamado no es válida.",
      400,
      "INVALID_NEXT_CALL_AT",
    );
  }
  return date;
}

export async function updateClientPipeline(
  userId: string,
  input: UpdateClientPipelineInput,
  actor: {
    executiveAccountId: string;
    isAdmin: boolean;
    executiveKind?: ExecutiveKind | null;
  },
): Promise<UserRecord> {
  const existing = await readClientOrThrow(userId);
  assertCanEditClientData(existing, actor);

  const canNotes = canAccessInternalPipelineNotes({
    isAdmin: actor.isAdmin,
    executiveKind: actor.executiveKind,
  });

  const data: Prisma.UserUpdateInput = {};

  if (input.pipelineStatus !== undefined) {
    if (!CLIENT_PIPELINE_STATUS_OPTIONS.includes(input.pipelineStatus)) {
      throw new ApiError("Estado de cliente inválido.", 400, "INVALID_STATUS");
    }
    data.pipelineStatus = input.pipelineStatus;
  }

  if (input.checklist !== undefined) {
    data.pipelineChecklist = {
      items: input.checklist.items,
      updatedAt: new Date().toISOString(),
    } as unknown as Prisma.InputJsonValue;
  }

  if (input.pipelineNotes !== undefined) {
    if (!canNotes) {
      throw new ApiError(
        "No tienes permiso para ver o editar notas internas.",
        403,
        "FORBIDDEN",
      );
    }
    data.pipelineNotes = input.pipelineNotes?.trim() || null;
  }

  if (input.nextCallAt !== undefined) {
    data.nextCallAt = parseNextCallAt(input.nextCallAt);
  }

  if (input.lastCallOutcome !== undefined) {
    data.lastCallOutcome = input.lastCallOutcome?.trim() || null;
  }

  if (input.preferredContactMethod !== undefined) {
    if (
      input.preferredContactMethod !== null &&
      input.preferredContactMethod !== "ZOOM" &&
      input.preferredContactMethod !== "WHATSAPP"
    ) {
      throw new ApiError(
        "Método de contacto inválido.",
        400,
        "INVALID_CONTACT_METHOD",
      );
    }
    data.preferredContactMethod = input.preferredContactMethod;
  }

  if (input.clientOrigin !== undefined) {
    if (!isClientOrigin(input.clientOrigin)) {
      throw new ApiError("Origen de cliente inválido.", 400, "INVALID_ORIGIN");
    }
    const previousOrigin = existing.clientOrigin;
    if (input.clientOrigin !== previousOrigin) {
      data.clientOrigin = input.clientOrigin;
      const actorName = await resolveActorDisplayName(
        actor.executiveAccountId,
        actor.isAdmin,
      );
      const noteBody = `Origen cambiado de "${clientOriginLabel(previousOrigin)}" a "${clientOriginLabel(input.clientOrigin)}".`;
      const notesBase =
        input.pipelineNotes !== undefined
          ? input.pipelineNotes
          : existing.pipelineNotes;
      data.pipelineNotes = appendPipelineNoteLine(
        notesBase,
        noteBody,
        actorName,
      );
    }
  }

  if (input.clientProfile !== undefined) {
    try {
      const normalized = normalizeClientProfileInput(input.clientProfile, {
        requireTitularRut: false,
      });
      if (normalized.email !== existing.email) {
        const emailTaken = await prisma.user.findUnique({
          where: { email: normalized.email },
          select: { id: true },
        });
        if (emailTaken && emailTaken.id !== userId) {
          throw new ApiError(
            "Ya existe otro cliente con ese correo electrónico.",
            409,
            "EMAIL_EXISTS",
          );
        }
        data.email = normalized.email;
      }
      data.fullName = normalized.fullName;
      data.phone = normalized.phone;
      data.rut = normalized.rut;
      data.clientProfile = normalized.profile as unknown as Prisma.InputJsonValue;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        error instanceof Error ? error.message : "Perfil inválido.",
        400,
        "INVALID_PROFILE",
      );
    }
  }

  if (input.closedRecord !== undefined) {
    data.pipelineClosedRecord = validateClosedRecord(
      input.closedRecord,
    ) as unknown as Prisma.InputJsonValue;
  }

  const nextStatus = input.pipelineStatus ?? existing.pipelineStatus;
  if (nextStatus === "CERRADO") {
    const closed =
      input.closedRecord !== undefined
        ? validateClosedRecord(input.closedRecord)
        : parseClientClosedRecord(existing.pipelineClosedRecord);
    if (!closed) {
      throw new ApiError(
        "Completa el registro de cierre antes de marcar como Cerrado.",
        400,
        "INVALID_CLOSED_RECORD",
      );
    }
    data.pipelineClosedRecord = closed as unknown as Prisma.InputJsonValue;
  }

  if (nextStatus === "CERRADO" || nextStatus === "PERDIDO") {
    Object.assign(data, clearTrackingFields());
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    include: clientRecordInclude,
  });

  return mapDbClientRecord(user);
}

/**
 * Marca el llamado de confirmación Zoom (5–10 min antes) como realizado.
 * Disponible para el ejecutivo en seguimiento (tracker) o el asignado.
 */
export async function markClientConfirmationCall(
  userId: string,
  input: { outcome?: string | null },
  actor: {
    executiveAccountId: string;
    isAdmin: boolean;
  },
): Promise<UserRecord> {
  const existing = await readClientOrThrow(userId);
  assertExecutiveCanView(existing, actor.executiveAccountId, actor.isAdmin);

  if (
    !actor.isAdmin &&
    !canManageClientAsExecutive(
      existing,
      actor.executiveAccountId,
      false,
    ) &&
    !isClientTrackedBy(existing, actor.executiveAccountId)
  ) {
    throw new ApiError(
      "No tienes permiso para registrar la confirmación de este cliente.",
      403,
      "FORBIDDEN",
    );
  }

  const actorName = await resolveActorDisplayName(
    actor.executiveAccountId,
    actor.isAdmin,
  );
  const outcome =
    input.outcome?.trim() ||
    "Confirmación Zoom realizada (recordatorio previo a reunión Premium).";

  const nextNotes = appendPipelineNoteLine(
    existing.pipelineNotes,
    outcome,
    actorName,
  );

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      confirmationCallAt: null,
      lastCallOutcome: outcome,
      pipelineNotes: nextNotes,
    },
    include: clientRecordInclude,
  });

  return mapDbClientRecord(user);
}

async function assertIsapresPremiumExecutive(
  executiveAccountId: string,
): Promise<void> {
  const account = await prisma.staffAccount.findFirst({
    where: {
      id: executiveAccountId,
      active: true,
      assignmentsSuspended: false,
      OR: [
        {
          role: "EXECUTIVE",
          executiveKind: "ISAPRES_PREMIUM",
          onboardingCompleted: true,
        },
        { role: "ADMIN" },
      ],
    },
    select: {
      id: true,
      role: true,
      subscriptionStatus: true,
      subscriptionExpiresAt: true,
    },
  });

  if (!account) {
    throw new ApiError(
      "El seleccionado no es un Ejecutivo Isapres Premium ni un administrador elegible.",
      400,
      "INVALID_PREMIUM_EXECUTIVE",
    );
  }

  if (account.role === "ADMIN") return;

  const subscriptionActive = isSubscriptionActive({
    subscriptionStatus: account.subscriptionStatus ?? "TRIAL",
    subscriptionExpiresAt: account.subscriptionExpiresAt,
  });

  if (!subscriptionActive) {
    throw new ApiError(
      "El ejecutivo Isapres Premium seleccionado no tiene suscripción activa.",
      400,
      "INVALID_PREMIUM_EXECUTIVE",
    );
  }
}

/**
 * Redirige un cliente a un Ejecutivo Isapres Premium.
 * Flujo Zoom (Zoom o Premium en adaptación) o Admin. Estado destino: NUEVO.
 * autoAssign usa round-robin solo entre Premium elegibles.
 */
export async function redirectClientToIsapresPremium(
  userId: string,
  input: RedirectClientToPremiumInput,
  actor: {
    executiveAccountId: string;
    isAdmin: boolean;
    /** Actor autorizado al flujo Zoom (Zoom o Isapres Premium). */
    canRunZoomWorkflow: boolean;
  },
): Promise<UserRecord> {
  if (!actor.isAdmin && !actor.canRunZoomWorkflow) {
    throw new ApiError(
      "Solo un Ejecutivo Zoom, Isapres Premium o un administrador puede redirigir a Isapres Premium.",
      403,
      "FORBIDDEN",
    );
  }

  if (input.contactMethod !== "ZOOM" && input.contactMethod !== "WHATSAPP") {
    throw new ApiError(
      "Selecciona el método de contacto: Zoom o WhatsApp.",
      400,
      "INVALID_INPUT",
    );
  }

  const existing = await readClientOrThrow(userId);
  assertExecutiveAccess(existing, actor.executiveAccountId, actor.isAdmin);

  let targetId = input.executiveAccountId?.trim() || null;

  if (input.autoAssign) {
    targetId = await pickExecutiveRoundRobin({
      executiveKind: "ISAPRES_PREMIUM",
    });
    if (!targetId) {
      throw new ApiError(
        "No hay ejecutivos Isapres Premium disponibles para asignar.",
        400,
        "NO_PREMIUM_AVAILABLE",
      );
    }
  }

  if (!targetId) {
    throw new ApiError(
      "Selecciona un Ejecutivo Isapres Premium o usa la asignación automática.",
      400,
      "INVALID_INPUT",
    );
  }

  if (targetId === actor.executiveAccountId && !actor.isAdmin) {
    throw new ApiError(
      "Debes redirigir el cliente a otro ejecutivo Isapres Premium.",
      400,
      "INVALID_INPUT",
    );
  }

  await assertIsapresPremiumExecutive(targetId);

  const actorName = await resolveActorDisplayName(
    actor.executiveAccountId,
    actor.isAdmin,
  );

  const appointmentAt = new Date(input.appointmentAt);
  if (Number.isNaN(appointmentAt.getTime())) {
    throw new ApiError(
      "La fecha de atención solicitada no es válida.",
      400,
      "INVALID_INPUT",
    );
  }

  const whenLabel = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(appointmentAt);

  const nextNotes = appendPipelineNoteLine(
    existing.pipelineNotes,
    `Redirigido a Ejecutivo Isapres Premium. Contacto: ${
      CLIENT_CONTACT_METHOD_LABELS[input.contactMethod]
    }. Atención solicitada: ${whenLabel}. Confirmación Zoom ~${CONFIRMATION_CALL_LEAD_MINUTES} min antes.`,
    actorName,
  );

  const previousAssignedId = existing.assignedExecutiveId;
  /** Quien tenía el cliente (o el actor Zoom) sigue en seguimiento hasta el cierre. */
  const trackerId =
    previousAssignedId && previousAssignedId !== targetId
      ? previousAssignedId
      : !actor.isAdmin && actor.executiveAccountId !== targetId
        ? actor.executiveAccountId
        : existing.trackingExecutiveId &&
            existing.trackingExecutiveId !== targetId
          ? existing.trackingExecutiveId
          : null;

  const confirmationCallAt = computeConfirmationCallAt(appointmentAt);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      assignedExecutive: { connect: { id: targetId } },
      ...(trackerId
        ? { trackingExecutive: { connect: { id: trackerId } } }
        : {}),
      pipelineStatus: "NUEVO",
      pipelineNotes: nextNotes,
      lastCallOutcome: `Redirigido a Isapres Premium · ${CLIENT_CONTACT_METHOD_LABELS[input.contactMethod]} · ${whenLabel}`,
      preferredContactMethod: input.contactMethod,
      nextCallAt: appointmentAt,
      confirmationCallAt,
    },
    include: clientRecordInclude,
  });

  await prisma.quote.updateMany({
    where: { userId, executiveAccountId: null },
    data: { executiveAccountId: targetId },
  });

  if (previousAssignedId !== targetId) {
    queueExecutiveClientAssignmentEmail({
      clientUserId: userId,
      executiveAccountId: targetId,
      assignmentType: "manual",
    });
  }

  return mapDbClientRecord(user);
}

export type RedirectEligibleStaff = {
  id: string;
  fullName: string;
  email: string;
  executiveKind: ExecutiveKind | null;
  realm: StaffRealm;
};

export async function listPremiumExecutivesForRedirect(): Promise<
  RedirectEligibleStaff[]
> {
  return listExecutivesForRedirect("ISAPRES_PREMIUM");
}

export async function listExecutivesForRedirect(
  executiveKind: ExecutiveKind,
): Promise<RedirectEligibleStaff[]> {
  const rows = await listEligibleExecutivesForAssignment({
    executiveKind,
    withProfile: true,
  });

  return rows.map((row) => ({
    id: row.id,
    fullName: row.fullName ?? (row.realm === "admin" ? "Administrador" : "Ejecutivo"),
    email: row.email ?? "",
    executiveKind: row.executiveKind ?? executiveKind,
    realm: row.realm ?? "executive",
  }));
}

async function assertEligibleExecutiveOfKind(
  executiveAccountId: string,
  expectedKind: ExecutiveKind,
  label: string,
): Promise<void> {
  const includeAdmin = adminCanReceiveAssignmentsForKind(expectedKind);

  const account = await prisma.staffAccount.findFirst({
    where: {
      id: executiveAccountId,
      active: true,
      assignmentsSuspended: false,
      OR: [
        {
          role: "EXECUTIVE",
          executiveKind: expectedKind,
          onboardingCompleted: true,
        },
        ...(includeAdmin ? [{ role: "ADMIN" as const }] : []),
      ],
    },
    select: {
      id: true,
      role: true,
      subscriptionStatus: true,
      subscriptionExpiresAt: true,
    },
  });

  if (!account) {
    throw new ApiError(
      includeAdmin
        ? `El seleccionado no es un ${label} ni un administrador elegible.`
        : `El ejecutivo seleccionado no es un ${label} elegible.`,
      400,
      "INVALID_TARGET_EXECUTIVE",
    );
  }

  if (account.role === "ADMIN") return;

  const subscriptionActive = isSubscriptionActive({
    subscriptionStatus: account.subscriptionStatus ?? "TRIAL",
    subscriptionExpiresAt: account.subscriptionExpiresAt,
  });

  if (!subscriptionActive) {
    throw new ApiError(
      `El ${label} seleccionado no tiene suscripción activa.`,
      400,
      "INVALID_TARGET_EXECUTIVE",
    );
  }
}

/**
 * Reasigna un cliente desde Isapres Premium hacia Zoom o Isapres.
 *
 * Estados destino (documentados):
 * - ZOOM → `NO_CONTESTA` (motivo: sin contacto; reinicia el ciclo en Zoom).
 * - ISAPRES → `DOCUMENTACION` (listo para cierre/contratación).
 *
 * Solo Premium (asignado) o Admin.
 */
export async function redirectClientFromIsapresPremium(
  userId: string,
  input: RedirectClientFromPremiumInput,
  actor: {
    executiveAccountId: string;
    isAdmin: boolean;
    isPremium: boolean;
  },
  targetKind: PremiumRedirectTargetKind,
): Promise<UserRecord> {
  if (!actor.isAdmin && !actor.isPremium) {
    throw new ApiError(
      "Solo un Ejecutivo Isapres Premium o un administrador puede realizar esta reasignación.",
      403,
      "FORBIDDEN",
    );
  }

  if (targetKind !== "ZOOM" && targetKind !== "ISAPRES") {
    throw new ApiError("Destino de reasignación inválido.", 400, "INVALID_INPUT");
  }

  const existing = await readClientOrThrow(userId);
  assertExecutiveAccess(existing, actor.executiveAccountId, actor.isAdmin);

  const kindLabel =
    targetKind === "ZOOM" ? "Ejecutivo Zoom" : "Ejecutivo Isapres";
  const kindLabelShort = targetKind === "ZOOM" ? "Zoom" : "Isapres";

  let targetId = input.executiveAccountId?.trim() || null;

  if (input.autoAssign) {
    targetId = await pickExecutiveRoundRobin({ executiveKind: targetKind });
    if (!targetId) {
      throw new ApiError(
        `No hay ${kindLabel} disponibles para asignar.`,
        400,
        "NO_TARGET_AVAILABLE",
      );
    }
  }

  if (!targetId) {
    throw new ApiError(
      `Selecciona un ${kindLabel} o usa la asignación automática.`,
      400,
      "INVALID_INPUT",
    );
  }

  if (targetId === actor.executiveAccountId && !actor.isAdmin) {
    throw new ApiError(
      `Debes reasignar el cliente a otro ${kindLabel}.`,
      400,
      "INVALID_INPUT",
    );
  }

  await assertEligibleExecutiveOfKind(targetId, targetKind, kindLabel);

  const actorName = await resolveActorDisplayName(
    actor.executiveAccountId,
    actor.isAdmin,
  );

  // ZOOM: sin contacto → NO_CONTESTA. ISAPRES: aceptó cotización → DOCUMENTACION.
  const nextStatus = targetKind === "ZOOM" ? "NO_CONTESTA" : "DOCUMENTACION";
  const reasonNote =
    targetKind === "ZOOM"
      ? "Sin contacto con el cliente."
      : "Derivado a Isapres para cierre.";

  const nextNotes = appendPipelineNoteLine(
    existing.pipelineNotes,
    `Enviado a ${kindLabel}. ${reasonNote}`,
    actorName,
  );

  const previousAssignedId = existing.assignedExecutiveId;
  /** Si vuelve a Zoom, el assignee recupera la cartera activa (sin tracking). */
  const clearTracking = targetKind === "ZOOM";
  /**
   * Si va a Isapres: conserva el tracker Zoom existente; si no hay, deja a
   * Premium en seguimiento hasta el cierre.
   */
  const trackerId = !clearTracking
    ? existing.trackingExecutiveId &&
      existing.trackingExecutiveId !== targetId
      ? existing.trackingExecutiveId
      : previousAssignedId && previousAssignedId !== targetId
        ? previousAssignedId
        : null
    : null;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      assignedExecutive: { connect: { id: targetId } },
      pipelineStatus: nextStatus,
      pipelineNotes: nextNotes,
      lastCallOutcome: `Enviado a ${kindLabelShort} · ${reasonNote}`,
      ...(clearTracking
        ? clearTrackingFields()
        : trackerId
          ? {
              trackingExecutive: { connect: { id: trackerId } },
              confirmationCallAt: null,
            }
          : { confirmationCallAt: null }),
    },
    include: clientRecordInclude,
  });

  await prisma.quote.updateMany({
    where: { userId, executiveAccountId: null },
    data: { executiveAccountId: targetId },
  });

  if (previousAssignedId !== targetId) {
    queueExecutiveClientAssignmentEmail({
      clientUserId: userId,
      executiveAccountId: targetId,
      assignmentType: "manual",
    });
  }

  return mapDbClientRecord(user);
}
