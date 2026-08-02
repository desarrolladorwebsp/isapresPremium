import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError } from "@/lib/api/api-error";
import { requireExecutiveOrAdminSession } from "@/lib/auth/require-auth";
import { AUTH_REALM } from "@/lib/auth/constants";
import { assertStaffCanAccessSection } from "@/lib/auth/staff-role";
import type { ExecutiveSessionUser } from "@/lib/auth/types";
import {
  CALENDLY_TEAM_LABELS,
  assertCalendlySchedulingReady,
  getCalendlyTeamConfig,
  isCalendlyTeamId,
  type CalendlyTeamId,
} from "@/lib/calendly/config";
import { CalendlyConfigError } from "@/lib/calendly/config";
import {
  buildCalendlySchedulingUrl,
  pickCalendlyTeam,
} from "@/lib/calendly/routing";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/executive/calendly/scheduling-link?team=EQUIPO_1
 * GET /api/executive/calendly/scheduling-link?auto=1
 * Opcional: &clientId=… para prefill email/nombre.
 *
 * Solo requiere SCHEDULING_URL (el widget/embed). El TOKEN hace falta
 * para API Calendly / enriquecimiento Zoom en webhooks.
 */
export async function GET(request: Request) {
  try {
    const { realm, user } = await requireExecutiveOrAdminSession(request);

    assertStaffCanAccessSection(
      {
        realm,
        executiveKind:
          realm === AUTH_REALM.executive
            ? (user as ExecutiveSessionUser).executiveKind
            : null,
      },
      "clientes",
    );

    const { searchParams } = new URL(request.url);
    const teamParam = searchParams.get("team")?.trim();
    const clientId = searchParams.get("clientId")?.trim() || null;

    let teamId: CalendlyTeamId;
    if (teamParam) {
      if (!isCalendlyTeamId(teamParam)) {
        throw new ApiError(
          "Equipo Calendly inválido. Usa EQUIPO_1, EQUIPO_2 o EQUIPO_3.",
          400,
          "INVALID_TEAM",
        );
      }
      teamId = await pickCalendlyTeam({ teamId: teamParam });
    } else {
      teamId = await pickCalendlyTeam({ strategy: "round_robin" });
    }

    let config;
    try {
      config = assertCalendlySchedulingReady(teamId);
    } catch (error) {
      if (error instanceof CalendlyConfigError) {
        throw new ApiError(error.message, 503, error.code);
      }
      throw error;
    }

    let email: string | null = null;
    let name: string | null = null;
    if (clientId) {
      const client = await prisma.user.findFirst({
        where: {
          id: clientId,
          role: "CLIENT",
          ...(realm === AUTH_REALM.admin
            ? {}
            : { assignedExecutiveId: user.id }),
        },
        select: { email: true, fullName: true },
      });
      if (!client) {
        throw new ApiError("Cliente no encontrado.", 404, "CLIENT_NOT_FOUND");
      }
      email = client.email;
      name = client.fullName;
    }

    const schedulingUrl = buildCalendlySchedulingUrl({
      schedulingUrl: config.schedulingUrl,
      email,
      name,
    });

    return NextResponse.json({
      teamId,
      teamLabel: CALENDLY_TEAM_LABELS[teamId],
      schedulingUrl,
      prefill: email || name ? { email, name } : null,
      configuredTeams: (
        ["EQUIPO_1", "EQUIPO_2", "EQUIPO_3"] as CalendlyTeamId[]
      )
        .map((id) => {
          const c = getCalendlyTeamConfig(id);
          return {
            teamId: id,
            label: c.label,
            ready: Boolean(c.schedulingUrl),
          };
        })
        .filter((t) => t.ready),
    });
  } catch (error) {
    if (error instanceof CalendlyConfigError) {
      const { body, status } = apiErrorResponse(
        new ApiError(error.message, 503, error.code),
      );
      return NextResponse.json(body, { status });
    }
    console.error("GET /api/executive/calendly/scheduling-link", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
