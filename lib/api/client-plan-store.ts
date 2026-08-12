import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api/api-error";
import { logClientActivity } from "@/lib/api/client-activity-store";
import { formatClientPlanLabel } from "@/lib/client-plan/format";
import { advancePipelineStatus } from "@/lib/client-pipeline/constants";
import { canEditClientDataAsExecutive } from "@/lib/client-pipeline/tracking";
import {
  clientRecordInclude,
  mapDbClientRecord,
  readClientOrThrow,
  type ClientRecordWithPlans,
} from "@/lib/api/user-store";
import type { ClientActivityActor } from "@/types/client-activity";
import type { ClientPipelineStatus } from "@/types/client-pipeline";
import type {
  AssignClientPlanInput,
  UpdateClientAdvisedPlanInput,
} from "@/types/client-plan";
import type { UserRecord } from "@/types/user";
import type { ExecutiveKind } from "@prisma/client";

type PlanActor = {
  executiveAccountId: string;
  isAdmin: boolean;
  executiveKind?: ExecutiveKind | null;
  actor?: ClientActivityActor;
};

function assertCanEditClientData(
  user: ClientRecordWithPlans,
  actor: PlanActor,
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

async function resolvePlanLabel(planCode: string | null): Promise<string | null> {
  if (!planCode) return null;

  const plan = await prisma.plan.findUnique({
    where: { uniqueCode: planCode },
    select: {
      uniqueCode: true,
      planName: true,
      isapreRef: { select: { name: true } },
    },
  });

  if (!plan) return planCode;

  return formatClientPlanLabel({
    planCode: plan.uniqueCode,
    planName: plan.planName,
    isapre: plan.isapreRef.name,
  });
}

async function assertPlanExists(planCode: string): Promise<void> {
  const plan = await prisma.plan.findUnique({
    where: { uniqueCode: planCode },
    select: { uniqueCode: true },
  });
  if (!plan) {
    throw new ApiError("El plan seleccionado no existe.", 400, "INVALID_PLAN");
  }
}

async function reloadClient(userId: string): Promise<UserRecord> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: clientRecordInclude,
  });
  return mapDbClientRecord(user);
}

/**
 * Agrega un plan a la lista de propuestas del cliente.
 * Por defecto también lo marca como elegido.
 */
export async function assignClientPlan(
  userId: string,
  input: AssignClientPlanInput,
  actor: PlanActor,
): Promise<UserRecord> {
  const existing = await readClientOrThrow(userId);
  assertCanEditClientData(existing, actor);

  const planCode = input.planCode.trim();
  if (!planCode) {
    throw new ApiError("Debes indicar el código del plan.", 400, "INVALID_PLAN");
  }
  await assertPlanExists(planCode);

  const setAsChosen = input.setAsChosen !== false;
  const alreadyAssigned = (existing.assignedPlans ?? []).some(
    (row) => row.planCode === planCode,
  );

  if (!alreadyAssigned) {
    await prisma.clientAssignedPlan.create({
      data: {
        userId,
        planCode,
        notes: input.notes?.trim() || null,
        assignedById: actor.executiveAccountId,
      },
    });
  }

  const currentStatus = existing.pipelineStatus as ClientPipelineStatus;
  const nextStatus = setAsChosen
    ? advancePipelineStatus(currentStatus, "EN_SEGUIMIENTO")
    : currentStatus;

  if (setAsChosen && existing.advisedPlanCode !== planCode) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        advisedPlanCode: planCode,
        ...(nextStatus !== currentStatus
          ? { pipelineStatus: nextStatus }
          : {}),
      },
    });
  } else if (nextStatus !== currentStatus) {
    await prisma.user.update({
      where: { id: userId },
      data: { pipelineStatus: nextStatus },
    });
  }

  const label = await resolvePlanLabel(planCode);
  if (!alreadyAssigned) {
    await logClientActivity({
      userId,
      activityType: "PLAN_ASSIGNED",
      previousValue: null,
      newValue: planCode,
      actor: actor.actor,
      description:
        input.notes?.trim() ||
        `Plan agregado a la propuesta: ${label ?? planCode}.`,
    });
  }
  if (setAsChosen && existing.advisedPlanCode !== planCode) {
    await logClientActivity({
      userId,
      activityType: "PLAN_CHANGED",
      previousValue: existing.advisedPlanCode,
      newValue: planCode,
      actor: actor.actor,
      description: `Plan elegido: ${label ?? planCode}.`,
    });
  }

  return reloadClient(userId);
}

/** Quita un plan de la lista. Si era el elegido, limpia advisedPlanCode. */
export async function unassignClientPlan(
  userId: string,
  planCodeRaw: string,
  actor: PlanActor,
): Promise<UserRecord> {
  const existing = await readClientOrThrow(userId);
  assertCanEditClientData(existing, actor);

  const planCode = planCodeRaw.trim();
  if (!planCode) {
    throw new ApiError("Debes indicar el código del plan.", 400, "INVALID_PLAN");
  }

  const deleted = await prisma.clientAssignedPlan.deleteMany({
    where: { userId, planCode },
  });
  if (deleted.count === 0) {
    throw new ApiError("Ese plan no está asignado al cliente.", 404, "NOT_FOUND");
  }

  if (existing.advisedPlanCode === planCode) {
    await prisma.user.update({
      where: { id: userId },
      data: { advisedPlanCode: null },
    });
  }

  const label = await resolvePlanLabel(planCode);
  await logClientActivity({
    userId,
    activityType: "PLAN_UNASSIGNED",
    previousValue: planCode,
    newValue: null,
    actor: actor.actor,
    description: `Plan eliminado de la propuesta: ${label ?? planCode}.`,
  });
  if (existing.advisedPlanCode === planCode) {
    await logClientActivity({
      userId,
      activityType: "ADVISED_PLAN_CLEARED",
      previousValue: planCode,
      newValue: null,
      actor: actor.actor,
      description: `Se quitó el plan elegido (${label ?? planCode}).`,
    });
  }

  return reloadClient(userId);
}

/**
 * Marca (o limpia) el plan elegido.
 * Si el código no está en assignedPlans, lo asigna primero (compatibilidad).
 */
export async function updateClientAdvisedPlan(
  userId: string,
  input: UpdateClientAdvisedPlanInput,
  actor: PlanActor,
): Promise<UserRecord> {
  const existing = await readClientOrThrow(userId);
  assertCanEditClientData(existing, actor);

  const nextPlanCode = input.planCode?.trim() || null;
  const previousPlanCode = existing.advisedPlanCode;

  if (nextPlanCode === previousPlanCode) {
    return mapDbClientRecord(existing);
  }

  if (nextPlanCode) {
    await assertPlanExists(nextPlanCode);
    const alreadyAssigned = (existing.assignedPlans ?? []).some(
      (row) => row.planCode === nextPlanCode,
    );
    if (!alreadyAssigned) {
      await prisma.clientAssignedPlan.create({
        data: {
          userId,
          planCode: nextPlanCode,
          notes: input.notes?.trim() || null,
          assignedById: actor.executiveAccountId,
        },
      });
      await logClientActivity({
        userId,
        activityType: "PLAN_ASSIGNED",
        previousValue: null,
        newValue: nextPlanCode,
        actor: actor.actor,
        description: `Plan agregado a la propuesta: ${
          (await resolvePlanLabel(nextPlanCode)) ?? nextPlanCode
        }.`,
      });
    }
  }

  const [previousLabel, nextLabel] = await Promise.all([
    resolvePlanLabel(previousPlanCode),
    resolvePlanLabel(nextPlanCode),
  ]);

  const currentStatus = existing.pipelineStatus as ClientPipelineStatus;
  const nextStatus = nextPlanCode
    ? advancePipelineStatus(currentStatus, "EN_SEGUIMIENTO")
    : currentStatus;

  await prisma.user.update({
    where: { id: userId },
    data: {
      advisedPlanCode: nextPlanCode,
      ...(nextStatus !== currentStatus
        ? { pipelineStatus: nextStatus }
        : {}),
    },
  });

  await logClientActivity({
    userId,
    activityType: nextPlanCode ? "PLAN_CHANGED" : "ADVISED_PLAN_CLEARED",
    previousValue: previousPlanCode,
    newValue: nextPlanCode,
    actor: actor.actor,
    description:
      input.notes?.trim() ||
      (nextPlanCode
        ? `Plan elegido: ${nextLabel ?? nextPlanCode}.`
        : previousLabel
          ? `Se quitó el plan elegido (${previousLabel}).`
          : "Se quitó el plan elegido."),
  });

  return reloadClient(userId);
}
