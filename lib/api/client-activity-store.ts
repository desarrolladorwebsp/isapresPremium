import { prisma } from "@/lib/prisma";
import type {
  ClientActivityActor,
  ClientActivityRecord,
  ClientActivityType,
} from "@/types/client-activity";
import type { ClientActivity as DbClientActivity } from "@prisma/client";

function mapDbActivity(activity: DbClientActivity): ClientActivityRecord {
  return {
    id: activity.id,
    userId: activity.userId,
    activityType: activity.activityType as ClientActivityType,
    previousValue: activity.previousValue,
    newValue: activity.newValue,
    actorRealm: activity.actorRealm as ClientActivityRecord["actorRealm"],
    actorId: activity.actorId,
    actorName: activity.actorName,
    description: activity.description,
    createdAt: activity.createdAt.toISOString(),
  };
}

export async function logClientActivity(input: {
  userId: string;
  activityType: ClientActivityType;
  previousValue?: string | null;
  newValue?: string | null;
  actor?: ClientActivityActor;
  description?: string | null;
}): Promise<void> {
  await prisma.clientActivity.create({
    data: {
      userId: input.userId,
      activityType: input.activityType,
      previousValue: input.previousValue ?? null,
      newValue: input.newValue ?? null,
      actorRealm: input.actor?.realm ?? null,
      actorId: input.actor?.id ?? null,
      actorName: input.actor?.name ?? null,
      description: input.description ?? null,
    },
  });
}

export async function readClientActivities(
  userId: string,
): Promise<ClientActivityRecord[]> {
  const activities = await prisma.clientActivity.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return activities.map(mapDbActivity);
}
