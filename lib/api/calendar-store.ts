import { prisma } from "@/lib/prisma";
import type { CalendarCallEvent } from "@/types/calendar";
import { CLIENT_CONTACT_METHOD_LABELS } from "@/types/client-pipeline";
import type { ClientContactMethod } from "@/types/client-pipeline";

/**
 * Llamados / reuniones agendadas (`nextCallAt`) para el calendario.
 * - Admin (`executiveAccountId` null): todos los clientes con llamado en el rango.
 * - Ejecutivo: solo clientes asignados a ese ejecutivo.
 * Si hay Zoom join URL (Calendly), se expone para badge / Unirse.
 */
export async function readCalendarCallEvents(input: {
  from: Date;
  to: Date;
  executiveAccountId: string | null;
}): Promise<CalendarCallEvent[]> {
  const clients = await prisma.user.findMany({
    where: {
      role: "CLIENT",
      nextCallAt: {
        gte: input.from,
        lt: input.to,
      },
      ...(input.executiveAccountId
        ? { assignedExecutiveId: input.executiveAccountId }
        : {}),
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      rut: true,
      pipelineStatus: true,
      nextCallAt: true,
      preferredContactMethod: true,
      calendlyTeam: true,
      zoomJoinUrl: true,
      assignedExecutive: {
        select: {
          id: true,
          fullName: true,
          executiveKind: true,
        },
      },
    },
    orderBy: { nextCallAt: "asc" },
  });

  return clients.flatMap((client) => {
    if (!client.nextCallAt) return [];
    const contactMethod =
      (client.preferredContactMethod as ClientContactMethod | null) ?? null;
    const channelLabel = contactMethod
      ? CLIENT_CONTACT_METHOD_LABELS[contactMethod]
      : "Llamado";
    const hasZoomLink = Boolean(client.zoomJoinUrl);
    return [
      {
        id: client.id,
        clientId: client.id,
        clientName: client.fullName,
        startsAt: client.nextCallAt.toISOString(),
        title: `${hasZoomLink ? "Zoom · " : ""}${channelLabel} — ${client.fullName}`,
        kind: "call" as const,
        contactMethod,
        calendlyTeam:
          (client.calendlyTeam as CalendarCallEvent["calendlyTeam"]) ?? null,
        zoomJoinUrl: client.zoomJoinUrl ?? null,
        clientEmail: client.email ?? null,
        clientPhone: client.phone ?? null,
        clientRut: client.rut ?? null,
        pipelineStatus:
          (client.pipelineStatus as CalendarCallEvent["pipelineStatus"]) ?? null,
        assignedExecutiveId: client.assignedExecutive?.id ?? null,
        assignedExecutiveName: client.assignedExecutive?.fullName ?? null,
        assignedExecutiveKind:
          (client.assignedExecutive
            ?.executiveKind as CalendarCallEvent["assignedExecutiveKind"]) ??
          null,
      },
    ];
  });
}
