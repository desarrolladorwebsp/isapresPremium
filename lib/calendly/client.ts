import {
  assertCalendlyTeamReady,
  type CalendlyTeamId,
} from "@/lib/calendly/config";

const CALENDLY_API_BASE = "https://api.calendly.com";

export class CalendlyApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly teamId: CalendlyTeamId,
  ) {
    super(message);
    this.name = "CalendlyApiError";
  }
}

export async function calendlyFetch<T = unknown>(
  teamId: CalendlyTeamId,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const config = assertCalendlyTeamReady(teamId);
  const url = path.startsWith("http")
    ? path
    : `${CALENDLY_API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new CalendlyApiError(
      `Calendly ${teamId} ${response.status}: ${body.slice(0, 200) || response.statusText}`,
      response.status,
      teamId,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export interface CalendlyCurrentUser {
  uri: string;
  name: string;
  email: string;
  scheduling_url?: string;
  timezone?: string;
}

/** Smoke test / resolver user URI del token del equipo. */
export async function getCurrentUser(
  teamId: CalendlyTeamId,
): Promise<CalendlyCurrentUser> {
  const data = await calendlyFetch<{ resource: CalendlyCurrentUser }>(
    teamId,
    "/users/me",
  );
  return data.resource;
}

export interface CalendlyEventType {
  uri: string;
  name: string;
  scheduling_url: string;
  active: boolean;
}

/** Lista event types (admin/debug). */
export async function listEventTypes(
  teamId: CalendlyTeamId,
): Promise<CalendlyEventType[]> {
  const user = await getCurrentUser(teamId);
  const data = await calendlyFetch<{
    collection: CalendlyEventType[];
  }>(
    teamId,
    `/event_types?user=${encodeURIComponent(user.uri)}&count=100`,
  );
  return data.collection ?? [];
}

export interface CalendlyScheduledEvent {
  uri: string;
  name: string;
  status: string;
  start_time: string;
  end_time: string;
  location?: {
    type?: string;
    join_url?: string;
    status?: string;
    data?: { id?: number | string; password?: string };
  } | null;
  event_memberships?: Array<{ user?: string }>;
}

export async function getScheduledEvent(
  teamId: CalendlyTeamId,
  eventUriOrUuid: string,
): Promise<CalendlyScheduledEvent> {
  const path = eventUriOrUuid.startsWith("http")
    ? eventUriOrUuid
    : `/scheduled_events/${eventUriOrUuid}`;
  const data = await calendlyFetch<{ resource: CalendlyScheduledEvent }>(
    teamId,
    path,
  );
  return data.resource;
}

/**
 * Fase 1: no crear invitees por API.
 * Stub documentado para una fase posterior (POST /invitees).
 */
export async function createInviteeStub(_input: {
  teamId: CalendlyTeamId;
  eventTypeUri: string;
  email: string;
  name: string;
  startTime: string;
}): Promise<never> {
  void _input;
  throw new Error(
    "Crear invitees por API Calendly no está en fase 1. Usa scheduling URL + webhooks.",
  );
}
