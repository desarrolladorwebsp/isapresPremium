import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api/api-error";
import { logClientActivity } from "@/lib/api/client-activity-store";
import { formatClientPlanLabel } from "@/lib/client-plan/format";
import { advancePipelineStatus } from "@/lib/client-pipeline/constants";
import { canEditClientDataAsExecutive } from "@/lib/client-pipeline/tracking";
import {
  mapDbClientRecord,
  readClientOrThrow,
  type ClientRecordWithPlans,
} from "@/lib/api/user-store";
import type { ClientActivityActor } from "@/types/client-activity";
import type { ClientPipelineStatus } from "@/types/client-pipeline";
import type { UpdateClientAdvisedPlanInput } from "@/types/client-plan";
import type { UserRecord } from "@/types/user";
import type { ExecutiveKind } from "@prisma/client";

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

export async function updateClientAdvisedPlan(
  userId: string,
  input: UpdateClientAdvisedPlanInput,
  actor: {
    executiveAccountId: string;
    isAdmin: boolean;
    executiveKind?: ExecutiveKind | null;
    actor?: ClientActivityActor;
  },
): Promise<UserRecord> {
  const existing = await readClientOrThrow(userId);
  assertCanEditClientData(existing, actor);

  const nextPlanCode = input.planCode?.trim() || null;
  const previousPlanCode = existing.advisedPlanCode;

  if (nextPlanCode === previousPlanCode) {
    return mapDbClientRecord(existing);
  }

  if (nextPlanCode) {
    const plan = await prisma.plan.findUnique({
      where: { uniqueCode: nextPlanCode },
      select: { uniqueCode: true },
    });

    if (!plan) {
      throw new ApiError("El plan seleccionado no existe.", 400, "INVALID_PLAN");
    }
  }

  const [previousLabel, nextLabel] = await Promise.all([
    resolvePlanLabel(previousPlanCode),
    resolvePlanLabel(nextPlanCode),
  ]);

  const currentStatus = existing.pipelineStatus as ClientPipelineStatus;
  const nextStatus = nextPlanCode
    ? advancePipelineStatus(currentStatus, "PROPUESTA_ENVIADA")
    : currentStatus;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      advisedPlanCode: nextPlanCode,
      ...(nextStatus !== currentStatus
        ? { pipelineStatus: nextStatus }
        : {}),
    },
    include: {
      assignedExecutive: {
        select: { id: true, fullName: true, email: true, executiveKind: true },
      },
      quotes: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          plan: {
            select: {
              uniqueCode: true,
              planName: true,
              basePriceUf: true,
              isapreRef: { select: { name: true } },
            },
          },
        },
      },
      advisedPlan: {
        select: {
          uniqueCode: true,
          planName: true,
          basePriceUf: true,
          isapreRef: { select: { name: true } },
        },
      },
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
        ? `Plan asesorado actualizado a ${nextLabel ?? nextPlanCode}.`
        : previousLabel
          ? `Se quitó el plan asesorado (${previousLabel}).`
          : "Se quitó el plan asesorado."),
  });

  return mapDbClientRecord(user);
}
