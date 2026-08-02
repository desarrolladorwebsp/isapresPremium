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
import type {
  ClientClosedRecord,
  PremiumRedirectTargetKind,
  RedirectClientFromPremiumInput,
  RedirectClientToPremiumInput,
  UpdateClientPipelineInput,
} from "@/types/client-pipeline";
import { CLIENT_CONTACT_METHOD_LABELS } from "@/types/client-pipeline";
import type { UserRecord } from "@/types/user";
import type { ExecutiveKind, Prisma } from "@prisma/client";
import {
  appendPipelineNoteLine,
  canAccessInternalPipelineNotes,
} from "@/lib/client-pipeline/note-stamp";

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
  if (isAdmin) return;
  if (user.assignedExecutiveId !== executiveAccountId) {
    throw new ApiError(
      "No tienes permiso para gestionar este cliente.",
      403,
      "FORBIDDEN",
    );
  }
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
  assertExecutiveAccess(existing, actor.executiveAccountId, actor.isAdmin);

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
    if (
      !actor.isAdmin &&
      actor.executiveKind === "ZOOM"
    ) {
      throw new ApiError(
        "El Ejecutivo Zoom no puede registrar el cierre del negocio.",
        403,
        "FORBIDDEN",
      );
    }
    data.pipelineClosedRecord = validateClosedRecord(
      input.closedRecord,
    ) as unknown as Prisma.InputJsonValue;
  }

  const nextStatus = input.pipelineStatus ?? existing.pipelineStatus;
  if (nextStatus === "CERRADO") {
    if (!actor.isAdmin && actor.executiveKind === "ZOOM") {
      throw new ApiError(
        "El Ejecutivo Zoom no puede marcar el cliente como Cerrado.",
        403,
        "FORBIDDEN",
      );
    }
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

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    include: clientRecordInclude,
  });

  return mapDbClientRecord(user);
}

async function assertIsapresPremiumExecutive(
  executiveAccountId: string,
): Promise<void> {
  const executive = await prisma.staffAccount.findFirst({
    where: {
      id: executiveAccountId,
      role: "EXECUTIVE",
      executiveKind: "ISAPRES_PREMIUM",
      active: true,
      onboardingCompleted: true,
      assignmentsSuspended: false,
    },
    select: {
      id: true,
      subscriptionStatus: true,
      subscriptionExpiresAt: true,
    },
  });

  if (!executive) {
    throw new ApiError(
      "El ejecutivo seleccionado no es un Ejecutivo Isapres Premium elegible.",
      400,
      "INVALID_PREMIUM_EXECUTIVE",
    );
  }

  const subscriptionActive = isSubscriptionActive({
    subscriptionStatus: executive.subscriptionStatus ?? "TRIAL",
    subscriptionExpiresAt: executive.subscriptionExpiresAt,
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
 * Solo Zoom (asignado) o Admin. Estado destino: NUEVO.
 * autoAssign usa round-robin solo entre Premium elegibles.
 */
export async function redirectClientToIsapresPremium(
  userId: string,
  input: RedirectClientToPremiumInput,
  actor: {
    executiveAccountId: string;
    isAdmin: boolean;
    isZoom: boolean;
  },
): Promise<UserRecord> {
  if (!actor.isAdmin && !actor.isZoom) {
    throw new ApiError(
      "Solo un Ejecutivo Zoom o un administrador puede redirigir a Isapres Premium.",
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
    }. Atención solicitada: ${whenLabel}.`,
    actorName,
  );

  const previousAssignedId = existing.assignedExecutiveId;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      assignedExecutive: { connect: { id: targetId } },
      pipelineStatus: "NUEVO",
      pipelineNotes: nextNotes,
      lastCallOutcome: `Redirigido a Isapres Premium · ${CLIENT_CONTACT_METHOD_LABELS[input.contactMethod]} · ${whenLabel}`,
      preferredContactMethod: input.contactMethod,
      nextCallAt: appointmentAt,
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

export async function listPremiumExecutivesForRedirect(): Promise<
  Array<{ id: string; fullName: string; email: string }>
> {
  return listExecutivesForRedirect("ISAPRES_PREMIUM");
}

export async function listExecutivesForRedirect(
  executiveKind: ExecutiveKind,
): Promise<Array<{ id: string; fullName: string; email: string }>> {
  const rows = await listEligibleExecutivesForAssignment({
    executiveKind,
    withProfile: true,
  });

  return rows.map((row) => ({
    id: row.id,
    fullName: row.fullName ?? "Ejecutivo",
    email: row.email ?? "",
  }));
}

async function assertEligibleExecutiveOfKind(
  executiveAccountId: string,
  expectedKind: ExecutiveKind,
  label: string,
): Promise<void> {
  const executive = await prisma.staffAccount.findFirst({
    where: {
      id: executiveAccountId,
      role: "EXECUTIVE",
      executiveKind: expectedKind,
      active: true,
      onboardingCompleted: true,
      assignmentsSuspended: false,
    },
    select: {
      id: true,
      subscriptionStatus: true,
      subscriptionExpiresAt: true,
    },
  });

  if (!executive) {
    throw new ApiError(
      `El ejecutivo seleccionado no es un ${label} elegible.`,
      400,
      "INVALID_TARGET_EXECUTIVE",
    );
  }

  const subscriptionActive = isSubscriptionActive({
    subscriptionStatus: executive.subscriptionStatus ?? "TRIAL",
    subscriptionExpiresAt: executive.subscriptionExpiresAt,
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

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      assignedExecutive: { connect: { id: targetId } },
      pipelineStatus: nextStatus,
      pipelineNotes: nextNotes,
      lastCallOutcome: `Enviado a ${kindLabelShort} · ${reasonNote}`,
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
