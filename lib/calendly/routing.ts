import { prisma } from "@/lib/prisma";
import {
  assertCalendlySchedulingReady,
  listReadyCalendlyTeams,
  type CalendlyTeamId,
} from "@/lib/calendly/config";
import { CalendlyConfigError } from "@/lib/calendly/config";

const ROUND_ROBIN_META_KEY = "calendly:last_team";

export interface PickCalendlyTeamOptions {
  /** Si se indica, usa ese equipo (validando scheduling URL). */
  teamId?: CalendlyTeamId | null;
  /** default: round-robin entre equipos con scheduling URL. */
  strategy?: "round_robin" | "explicit";
}

/**
 * Elige equipo Calendly.
 * - `teamId` explícito → ese equipo (debe tener scheduling URL).
 * - default → round-robin persistido en AppMeta entre equipos con URL.
 */
export async function pickCalendlyTeam(
  options: PickCalendlyTeamOptions = {},
): Promise<CalendlyTeamId> {
  if (options.teamId) {
    assertCalendlySchedulingReady(options.teamId);
    return options.teamId;
  }

  const ready = listReadyCalendlyTeams();
  if (ready.length === 0) {
    throw new CalendlyConfigError(
      "No hay equipos Calendly configurados (falta CALENDLY_EQUIPO_N_SCHEDULING_URL).",
      undefined,
      "NO_TEAMS_READY",
    );
  }

  if (ready.length === 1) {
    return ready[0]!.teamId;
  }

  const last = await prisma.appMeta.findUnique({
    where: { key: ROUND_ROBIN_META_KEY },
    select: { value: true },
  });

  const lastIndex = ready.findIndex((team) => team.teamId === last?.value);
  const nextIndex = lastIndex >= 0 ? (lastIndex + 1) % ready.length : 0;
  const picked = ready[nextIndex]!.teamId;

  await prisma.appMeta.upsert({
    where: { key: ROUND_ROBIN_META_KEY },
    create: { key: ROUND_ROBIN_META_KEY, value: picked },
    update: { value: picked },
  });

  return picked;
}

export function buildCalendlySchedulingUrl(input: {
  schedulingUrl: string;
  email?: string | null;
  name?: string | null;
}): string {
  const url = new URL(input.schedulingUrl);
  if (input.email?.trim()) {
    url.searchParams.set("email", input.email.trim().toLowerCase());
  }
  if (input.name?.trim()) {
    url.searchParams.set("name", input.name.trim());
  }
  return url.toString();
}
