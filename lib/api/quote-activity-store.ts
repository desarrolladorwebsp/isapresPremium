import { prisma } from "@/lib/prisma";
import { QUOTE_STATUS_LABELS } from "@/lib/quote-status";
import type {
  QuoteActivityActor,
  QuoteActivityRecord,
  QuoteActivityType,
} from "@/types/quote-activity";
import type { QuoteActivity as DbQuoteActivity } from "@prisma/client";

function mapDbActivity(activity: DbQuoteActivity): QuoteActivityRecord {
  return {
    id: activity.id,
    quoteId: activity.quoteId,
    activityType: activity.activityType as QuoteActivityType,
    previousValue: activity.previousValue,
    newValue: activity.newValue,
    actorRealm: activity.actorRealm as QuoteActivityRecord["actorRealm"],
    actorId: activity.actorId,
    actorName: activity.actorName,
    description: activity.description,
    createdAt: activity.createdAt.toISOString(),
  };
}

export async function logQuoteActivity(input: {
  quoteId: string;
  activityType: QuoteActivityType;
  previousValue?: string | null;
  newValue?: string | null;
  actor?: QuoteActivityActor;
  description?: string | null;
}): Promise<void> {
  await prisma.quoteActivity.create({
    data: {
      quoteId: input.quoteId,
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

export async function readQuoteActivities(
  quoteId: string,
): Promise<QuoteActivityRecord[]> {
  const activities = await prisma.quoteActivity.findMany({
    where: { quoteId },
    orderBy: { createdAt: "desc" },
  });

  return activities.map(mapDbActivity);
}

export async function readLatestActivitiesByQuoteIds(
  quoteIds: string[],
): Promise<Map<string, QuoteActivityRecord>> {
  if (quoteIds.length === 0) return new Map();

  const activities = await prisma.quoteActivity.findMany({
    where: { quoteId: { in: quoteIds } },
    orderBy: { createdAt: "desc" },
  });

  const map = new Map<string, QuoteActivityRecord>();
  for (const activity of activities) {
    if (!map.has(activity.quoteId)) {
      map.set(activity.quoteId, mapDbActivity(activity));
    }
  }

  return map;
}

export function formatStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return (
    QUOTE_STATUS_LABELS[status as keyof typeof QUOTE_STATUS_LABELS] ?? status
  );
}

export async function resolveExecutiveName(
  executiveId: string | null | undefined,
): Promise<string | null> {
  if (!executiveId) return null;

  const executive = await prisma.staffAccount.findFirst({
    where: { id: executiveId, role: "EXECUTIVE" },
    select: { fullName: true },
  });

  return executive?.fullName ?? null;
}
