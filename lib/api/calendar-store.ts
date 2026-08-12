import { prisma } from "@/lib/prisma";
import type { CalendarCallEvent } from "@/types/calendar";
import { CLIENT_CONTACT_METHOD_LABELS } from "@/types/client-pipeline";
import type { ClientContactMethod } from "@/types/client-pipeline";
import type { ClientPipelineStatus } from "@/types/client-pipeline";
import type { ExecutiveKind } from "@/types/staff-account";

type CalendarClientRow = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  rut: string | null;
  pipelineStatus: string;
  nextCallAt: Date | null;
  confirmationCallAt: Date | null;
  reminderAt: Date | null;
  reminderNote: string | null;
  preferredContactMethod: string | null;
  calendlyTeam: string | null;
  zoomJoinUrl: string | null;
  assignedExecutiveId: string | null;
  trackingExecutiveId: string | null;
  assignedExecutive: {
    id: string;
    fullName: string;
    executiveKind: string | null;
  } | null;
  trackingExecutive: {
    id: string;
    fullName: string;
  } | null;
};

function mapCallEvent(
  client: CalendarClientRow,
  startsAt: Date,
  kind: "call" | "confirmation" | "reminder",
): CalendarCallEvent {
  const contactMethod =
    (client.preferredContactMethod as ClientContactMethod | null) ?? null;
  const channelLabel = contactMethod
    ? CLIENT_CONTACT_METHOD_LABELS[contactMethod]
    : "Llamado";
  const hasZoomLink = Boolean(client.zoomJoinUrl);
  const reminderLabel = client.reminderNote?.trim() || "Recordatorio";
  const title =
    kind === "confirmation"
      ? `Confirmación Zoom — ${client.fullName}`
      : kind === "reminder"
        ? `Recordatorio · ${reminderLabel} — ${client.fullName}`
        : `${hasZoomLink ? "Zoom · " : ""}${channelLabel} — ${client.fullName}`;

  return {
    id:
      kind === "confirmation"
        ? `${client.id}:confirmation`
        : kind === "reminder"
          ? `${client.id}:reminder`
          : client.id,
    clientId: client.id,
    clientName: client.fullName,
    startsAt: startsAt.toISOString(),
    title,
    kind,
    contactMethod: kind === "reminder" ? null : contactMethod,
    reminderNote: kind === "reminder" ? client.reminderNote : null,
    calendlyTeam:
      (client.calendlyTeam as CalendarCallEvent["calendlyTeam"]) ?? null,
    zoomJoinUrl: kind === "reminder" ? null : client.zoomJoinUrl ?? null,
    clientEmail: client.email ?? null,
    clientPhone: client.phone ?? null,
    clientRut: client.rut ?? null,
    pipelineStatus: (client.pipelineStatus as ClientPipelineStatus) ?? null,
    assignedExecutiveId: client.assignedExecutive?.id ?? null,
    assignedExecutiveName: client.assignedExecutive?.fullName ?? null,
    assignedExecutiveKind:
      (client.assignedExecutive?.executiveKind as ExecutiveKind | null) ?? null,
    trackingExecutiveId: client.trackingExecutive?.id ?? null,
    trackingExecutiveName: client.trackingExecutive?.fullName ?? null,
  };
}

/**
 * Llamados / reuniones (`nextCallAt`), confirmaciones Zoom
 * (`confirmationCallAt`) y recordatorios (`reminderAt`).
 * - Admin: todos en el rango.
 * - Ejecutivo: asignados o en seguimiento (tracking).
 */
export async function readCalendarCallEvents(input: {
  from: Date;
  to: Date;
  executiveAccountId: string | null;
}): Promise<CalendarCallEvent[]> {
  const clients = await prisma.user.findMany({
    where: {
      role: "CLIENT",
      AND: [
        ...(input.executiveAccountId
          ? [
              {
                OR: [
                  { assignedExecutiveId: input.executiveAccountId },
                  { trackingExecutiveId: input.executiveAccountId },
                ],
              },
            ]
          : []),
        {
          OR: [
            {
              nextCallAt: {
                gte: input.from,
                lt: input.to,
              },
            },
            {
              confirmationCallAt: {
                gte: input.from,
                lt: input.to,
              },
            },
            {
              reminderAt: {
                gte: input.from,
                lt: input.to,
              },
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      rut: true,
      pipelineStatus: true,
      nextCallAt: true,
      confirmationCallAt: true,
      reminderAt: true,
      reminderNote: true,
      preferredContactMethod: true,
      calendlyTeam: true,
      zoomJoinUrl: true,
      assignedExecutiveId: true,
      trackingExecutiveId: true,
      assignedExecutive: {
        select: {
          id: true,
          fullName: true,
          executiveKind: true,
        },
      },
      trackingExecutive: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
    orderBy: { nextCallAt: "asc" },
  });

  const events: CalendarCallEvent[] = [];

  for (const client of clients) {
    const row = client as CalendarClientRow;

    if (
      row.nextCallAt &&
      row.nextCallAt >= input.from &&
      row.nextCallAt < input.to
    ) {
      const isAssignee =
        !input.executiveAccountId ||
        row.assignedExecutiveId === input.executiveAccountId;
      if (isAssignee || !input.executiveAccountId) {
        events.push(mapCallEvent(row, row.nextCallAt, "call"));
      }
    }

    if (
      row.confirmationCallAt &&
      row.confirmationCallAt >= input.from &&
      row.confirmationCallAt < input.to
    ) {
      const isTracker =
        !input.executiveAccountId ||
        row.trackingExecutiveId === input.executiveAccountId;
      const isAssignee =
        !input.executiveAccountId ||
        row.assignedExecutiveId === input.executiveAccountId;
      if (isTracker || isAssignee) {
        events.push(mapCallEvent(row, row.confirmationCallAt, "confirmation"));
      }
    }

    if (
      row.reminderAt &&
      row.reminderAt >= input.from &&
      row.reminderAt < input.to
    ) {
      const isAssignee =
        !input.executiveAccountId ||
        row.assignedExecutiveId === input.executiveAccountId;
      const isTracker =
        !input.executiveAccountId ||
        row.trackingExecutiveId === input.executiveAccountId;
      if (isAssignee || isTracker) {
        events.push(mapCallEvent(row, row.reminderAt, "reminder"));
      }
    }
  }

  return events.sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}
