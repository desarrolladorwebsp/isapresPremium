import { extractUuidFromUri } from "@/lib/calendly/webhook";

export type CalendlyWebhookEventName =
  | "invitee.created"
  | "invitee.canceled"
  | string;

export interface CalendlyWebhookPayload {
  event: CalendlyWebhookEventName;
  created_at?: string;
  created_by?: string;
  payload: {
    uri?: string;
    email?: string;
    name?: string;
    status?: string;
    timezone?: string;
    cancel_url?: string;
    reschedule_url?: string;
    event?: string;
    scheduled_event?: {
      uri?: string;
      name?: string;
      status?: string;
      start_time?: string;
      end_time?: string;
      location?: {
        type?: string;
        join_url?: string;
        status?: string;
        location?: string;
        data?: { id?: number | string; password?: string };
      } | null;
    };
  };
}

export function normalizeInviteeEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim().toLowerCase();
  return trimmed || null;
}

export function extractZoomFromLocation(
  scheduledEvent:
    | CalendlyWebhookPayload["payload"]["scheduled_event"]
    | null
    | undefined,
): { zoomJoinUrl: string | null; zoomMeetingId: string | null } {
  const loc = scheduledEvent?.location;
  if (!loc) {
    return { zoomJoinUrl: null, zoomMeetingId: null };
  }

  return {
    zoomJoinUrl: loc.join_url?.trim() || null,
    zoomMeetingId: loc.data?.id != null ? String(loc.data.id) : null,
  };
}

export function parseInviteeCreatedFields(body: CalendlyWebhookPayload): {
  eventUuid: string;
  inviteeUuid: string;
  inviteeEmail: string | null;
  inviteeName: string | null;
  startAt: Date;
  endAt: Date | null;
  cancelUrl: string | null;
  rescheduleUrl: string | null;
  zoomJoinUrl: string | null;
  zoomMeetingId: string | null;
} {
  const invitee = body.payload;
  const scheduled = invitee.scheduled_event;
  const eventUri = scheduled?.uri ?? invitee.event;
  const eventUuid = extractUuidFromUri(eventUri);
  const inviteeUuid = extractUuidFromUri(invitee.uri);

  if (!eventUuid) {
    throw new Error("Webhook sin event UUID (scheduled_event.uri / payload.event).");
  }
  if (!inviteeUuid) {
    throw new Error("Webhook sin invitee UUID (payload.uri).");
  }

  const startRaw = scheduled?.start_time;
  if (!startRaw) {
    throw new Error("Webhook sin start_time en scheduled_event.");
  }
  const startAt = new Date(startRaw);
  if (Number.isNaN(startAt.getTime())) {
    throw new Error("start_time inválido en webhook Calendly.");
  }

  const endRaw = scheduled?.end_time;
  const endAt = endRaw ? new Date(endRaw) : null;
  if (endAt && Number.isNaN(endAt.getTime())) {
    throw new Error("end_time inválido en webhook Calendly.");
  }

  const zoom = extractZoomFromLocation(scheduled);

  return {
    eventUuid,
    inviteeUuid,
    inviteeEmail: normalizeInviteeEmail(invitee.email),
    inviteeName: invitee.name?.trim() || null,
    startAt,
    endAt,
    cancelUrl: invitee.cancel_url?.trim() || null,
    rescheduleUrl: invitee.reschedule_url?.trim() || null,
    zoomJoinUrl: zoom.zoomJoinUrl,
    zoomMeetingId: zoom.zoomMeetingId,
  };
}

export function redactCalendlyPayloadForLog(
  body: CalendlyWebhookPayload,
): Record<string, unknown> {
  return {
    event: body.event,
    created_by: body.created_by ?? null,
    inviteeUri: body.payload?.uri ?? null,
    eventUri: body.payload?.scheduled_event?.uri ?? body.payload?.event ?? null,
    email: body.payload?.email
      ? `${body.payload.email.slice(0, 2)}***`
      : null,
    status: body.payload?.status ?? null,
    start_time: body.payload?.scheduled_event?.start_time ?? null,
    locationType: body.payload?.scheduled_event?.location?.type ?? null,
    hasJoinUrl: Boolean(body.payload?.scheduled_event?.location?.join_url),
  };
}
