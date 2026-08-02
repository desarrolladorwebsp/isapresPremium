/**
 * Configuración multi-cuenta Calendly (Equipo 1 / 2 / 3).
 *
 * Setup:
 * 1. Conectar Zoom en cada cuenta Calendly (Integrations → Zoom).
 * 2. Crear un Event Type con location Zoom.
 * 3. En cada cuenta: Webhooks → invitee.created + invitee.canceled →
 *    `https://TU_DOMINIO/api/webhooks/calendly?team=EQUIPO_N`
 *    (usar la signing key de cada webhook en env).
 * 4. Copiar Personal Access Token y Scheduling URL del event type a env.
 */

import {
  CALENDLY_TEAM_IDS,
  CALENDLY_TEAM_LABELS,
  isCalendlyTeamId,
  type CalendlyTeamId,
} from "@/lib/calendly/labels";

export {
  CALENDLY_TEAM_IDS,
  CALENDLY_TEAM_LABELS,
  isCalendlyTeamId,
  type CalendlyTeamId,
};

export interface CalendlyTeamConfig {
  teamId: CalendlyTeamId;
  label: string;
  token: string;
  schedulingUrl: string;
  webhookSigningKey: string | null;
  /** URI del user Calendly (opcional; ayuda a inferir equipo). */
  userUri: string | null;
}

export class CalendlyConfigError extends Error {
  constructor(
    message: string,
    readonly teamId?: CalendlyTeamId,
    readonly code = "CALENDLY_CONFIG",
  ) {
    super(message);
    this.name = "CalendlyConfigError";
  }
}

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function teamEnvPrefix(teamId: CalendlyTeamId): string {
  return `CALENDLY_${teamId}`;
}

/**
 * Lee config de un equipo. No lanza si faltan vars (boot safe).
 * Usa `assertCalendlyTeamReady` antes de llamar a la API.
 */
export function getCalendlyTeamConfig(
  teamId: CalendlyTeamId,
): CalendlyTeamConfig {
  const prefix = teamEnvPrefix(teamId);
  const sharedSigning = readEnv("CALENDLY_WEBHOOK_SIGNING_KEY");

  return {
    teamId,
    label: CALENDLY_TEAM_LABELS[teamId],
    token: readEnv(`${prefix}_TOKEN`) ?? "",
    schedulingUrl: readEnv(`${prefix}_SCHEDULING_URL`) ?? "",
    webhookSigningKey:
      readEnv(`${prefix}_WEBHOOK_SIGNING_KEY`) ?? sharedSigning,
    userUri: readEnv(`${prefix}_USER_URI`),
  };
}

export function listCalendlyTeams(): CalendlyTeamConfig[] {
  return CALENDLY_TEAM_IDS.map(getCalendlyTeamConfig);
}

/** Equipos con scheduling URL listos para links / widget (token opcional). */
export function listReadyCalendlyTeams(): CalendlyTeamConfig[] {
  return listCalendlyTeams().filter((team) => Boolean(team.schedulingUrl));
}

/**
 * Exige scheduling URL (para widget / link).
 * Token solo se exige al llamar a la API Calendly (`assertCalendlyTeamReady`).
 */
export function assertCalendlySchedulingReady(
  teamId: CalendlyTeamId,
): CalendlyTeamConfig {
  const config = getCalendlyTeamConfig(teamId);
  if (!config.schedulingUrl) {
    throw new CalendlyConfigError(
      `Falta ${teamEnvPrefix(teamId)}_SCHEDULING_URL en el entorno.`,
      teamId,
      "MISSING_SCHEDULING_URL",
    );
  }
  return config;
}

export function assertCalendlyTeamReady(
  teamId: CalendlyTeamId,
): CalendlyTeamConfig {
  const config = assertCalendlySchedulingReady(teamId);
  if (!config.token) {
    throw new CalendlyConfigError(
      `Falta ${teamEnvPrefix(teamId)}_TOKEN en el entorno.`,
      teamId,
      "MISSING_TOKEN",
    );
  }
  return config;
}

export function shouldSkipCalendlyWebhookVerify(): boolean {
  return process.env.CALENDLY_WEBHOOK_SKIP_VERIFY === "true";
}
