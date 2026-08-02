import type { CalendlyTeam } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getScheduledEvent } from "@/lib/calendly/client";
import {
  CALENDLY_TEAM_LABELS,
  type CalendlyTeamId,
} from "@/lib/calendly/config";
import {
  extractZoomFromLocation,
  normalizeInviteeEmail,
  parseInviteeCreatedFields,
  type CalendlyWebhookPayload,
} from "@/lib/calendly/payload";
import { extractUuidFromUri } from "@/lib/calendly/webhook";

const DEFAULT_TZ = "America/Santiago";

function formatWhenLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: DEFAULT_TZ,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function stampNow(): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: DEFAULT_TZ,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
}

function appendPipelineNote(
  existing: string | null | undefined,
  line: string,
): string {
  const prev = existing?.trim();
  return prev ? `${prev}\n${line}` : line;
}

/**
 * Matching de cliente: email normalizado (lowercase/trim).
 * No crea leads nuevos si no hay User — solo log + booking huérfano.
 */
async function findClientByEmail(email: string | null) {
  if (!email) return null;
  return prisma.user.findFirst({
    where: {
      role: "CLIENT",
      email: { equals: email, mode: "insensitive" },
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      nextCallAt: true,
      pipelineNotes: true,
      zoomJoinUrl: true,
    },
  });
}

export type BookingSyncResult =
  | { ok: true; action: "created" | "updated" | "canceled" | "ignored"; bookingId?: string; userId?: string | null; unmatchedEmail?: string | null }
  | { ok: false; reason: string };

export async function syncInviteeCreated(input: {
  teamId: CalendlyTeamId;
  body: CalendlyWebhookPayload;
}): Promise<BookingSyncResult> {
  let fields;
  try {
    fields = parseInviteeCreatedFields(input.body);
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Payload inválido",
    };
  }

  // Si el webhook no trae join_url aún, intentar Scheduled Event API.
  if (!fields.zoomJoinUrl && fields.eventUuid) {
    try {
      const event = await getScheduledEvent(input.teamId, fields.eventUuid);
      const zoom = extractZoomFromLocation({ location: event.location });
      fields = {
        ...fields,
        zoomJoinUrl: zoom.zoomJoinUrl,
        zoomMeetingId: fields.zoomMeetingId ?? zoom.zoomMeetingId,
        endAt: fields.endAt ?? (event.end_time ? new Date(event.end_time) : null),
      };
    } catch (error) {
      console.warn("[calendly] no se pudo enriquecer location Zoom", {
        team: input.teamId,
        eventUuid: fields.eventUuid,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const client = await findClientByEmail(fields.inviteeEmail);
  if (!client && fields.inviteeEmail) {
    console.info(
      "[calendly] invitee.created sin User matched",
      { team: input.teamId, email: `${fields.inviteeEmail.slice(0, 2)}***` },
    );
  } else if (!fields.inviteeEmail) {
    console.info("[calendly] invitee.created sin email en payload", {
      team: input.teamId,
      eventUuid: fields.eventUuid,
    });
  }

  const existing = await prisma.calendlyBooking.findUnique({
    where: { eventUuid: fields.eventUuid },
    select: { id: true },
  });

  const booking = await prisma.calendlyBooking.upsert({
    where: { eventUuid: fields.eventUuid },
    create: {
      userId: client?.id ?? null,
      calendlyTeam: input.teamId as CalendlyTeam,
      eventUuid: fields.eventUuid,
      inviteeUuid: fields.inviteeUuid,
      inviteeEmail: fields.inviteeEmail,
      startAt: fields.startAt,
      endAt: fields.endAt,
      status: "SCHEDULED",
      zoomJoinUrl: fields.zoomJoinUrl,
      zoomMeetingId: fields.zoomMeetingId,
      cancelUrl: fields.cancelUrl,
      rescheduleUrl: fields.rescheduleUrl,
    },
    update: {
      userId: client?.id ?? undefined,
      inviteeUuid: fields.inviteeUuid,
      inviteeEmail: fields.inviteeEmail,
      startAt: fields.startAt,
      endAt: fields.endAt,
      status: "SCHEDULED",
      zoomJoinUrl: fields.zoomJoinUrl,
      zoomMeetingId: fields.zoomMeetingId,
      cancelUrl: fields.cancelUrl,
      rescheduleUrl: fields.rescheduleUrl,
      calendlyTeam: input.teamId as CalendlyTeam,
    },
  });

  if (client) {
    const whenLabel = formatWhenLabel(fields.startAt);
    const teamLabel = CALENDLY_TEAM_LABELS[input.teamId];
    const note = `[${stampNow()}] Reunión Zoom via Calendly (${teamLabel}): ${whenLabel}.${
      fields.zoomJoinUrl ? " Link Zoom guardado." : ""
    }`;

    await prisma.user.update({
      where: { id: client.id },
      data: {
        nextCallAt: fields.startAt,
        preferredContactMethod: "ZOOM",
        calendlyTeam: input.teamId as CalendlyTeam,
        zoomJoinUrl: fields.zoomJoinUrl,
        lastCallOutcome: `Calendly agendado · ${whenLabel}`,
        pipelineNotes: appendPipelineNote(client.pipelineNotes, note),
      },
    });
  }

  return {
    ok: true,
    action: existing ? "updated" : "created",
    bookingId: booking.id,
    userId: client?.id ?? null,
    unmatchedEmail: client ? null : fields.inviteeEmail,
  };
}

export async function syncInviteeCanceled(input: {
  teamId: CalendlyTeamId;
  body: CalendlyWebhookPayload;
}): Promise<BookingSyncResult> {
  const invitee = input.body.payload;
  const eventUuid =
    extractUuidFromUri(invitee.scheduled_event?.uri) ??
    extractUuidFromUri(invitee.event);
  const inviteeUuid = extractUuidFromUri(invitee.uri);
  const email = normalizeInviteeEmail(invitee.email);

  if (!eventUuid && !inviteeUuid) {
    return { ok: false, reason: "Cancelación sin event/invitee UUID." };
  }

  const booking = await prisma.calendlyBooking.findFirst({
    where: {
      OR: [
        ...(eventUuid ? [{ eventUuid }] : []),
        ...(inviteeUuid ? [{ inviteeUuid }] : []),
      ],
    },
  });

  if (!booking) {
    // Idempotente: no hay fila que cancelar.
    console.info("[calendly] invitee.canceled sin booking local", {
      team: input.teamId,
      eventUuid,
      inviteeUuid,
      email: email ? `${email.slice(0, 2)}***` : null,
    });
    return { ok: true, action: "ignored" };
  }

  await prisma.calendlyBooking.update({
    where: { id: booking.id },
    data: { status: "CANCELED" },
  });

  if (booking.userId) {
    const user = await prisma.user.findUnique({
      where: { id: booking.userId },
      select: {
        id: true,
        nextCallAt: true,
        zoomJoinUrl: true,
        pipelineNotes: true,
      },
    });

    if (user) {
      const sameSlot =
        user.nextCallAt &&
        booking.startAt.getTime() === user.nextCallAt.getTime();
      const sameJoin =
        booking.zoomJoinUrl &&
        user.zoomJoinUrl &&
        booking.zoomJoinUrl === user.zoomJoinUrl;

      const teamLabel = CALENDLY_TEAM_LABELS[input.teamId];
      const note = `[${stampNow()}] Reunión Calendly cancelada (${teamLabel}).`;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(sameSlot ? { nextCallAt: null } : {}),
          ...(sameJoin || sameSlot ? { zoomJoinUrl: null } : {}),
          lastCallOutcome: "Calendly cancelado",
          pipelineNotes: appendPipelineNote(user.pipelineNotes, note),
        },
      });
    }
  }

  return {
    ok: true,
    action: "canceled",
    bookingId: booking.id,
    userId: booking.userId,
  };
}

export async function handleCalendlyWebhookEvent(input: {
  teamId: CalendlyTeamId;
  body: CalendlyWebhookPayload;
}): Promise<BookingSyncResult> {
  switch (input.body.event) {
    case "invitee.created":
      return syncInviteeCreated(input);
    case "invitee.canceled":
      return syncInviteeCanceled(input);
    default:
      console.info("[calendly] evento no manejado", { event: input.body.event });
      return { ok: true, action: "ignored" };
  }
}
