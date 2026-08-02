import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError } from "@/lib/api/api-error";
import { readCalendarCallEvents } from "@/lib/api/calendar-store";
import { requireExecutiveOrAdminSession } from "@/lib/auth/require-auth";
import { AUTH_REALM } from "@/lib/auth/constants";
import { assertStaffCanAccessSection } from "@/lib/auth/staff-role";
import type { ExecutiveSessionUser } from "@/lib/auth/types";

function parseRangeDate(value: string | null, label: string): Date {
  if (!value?.trim()) {
    throw new ApiError(`Indica el parámetro ${label}.`, 400, "INVALID_RANGE");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(`El parámetro ${label} no es una fecha válida.`, 400, "INVALID_RANGE");
  }
  return date;
}

/**
 * GET /api/executive/calendar/events?from=&to=
 * Fuente: User.nextCallAt. Admin ve todos; ejecutivo solo los suyos.
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
      "calendario",
    );

    const { searchParams } = new URL(request.url);
    const from = parseRangeDate(searchParams.get("from"), "from");
    const to = parseRangeDate(searchParams.get("to"), "to");

    if (to.getTime() <= from.getTime()) {
      throw new ApiError(
        "El rango del calendario no es válido.",
        400,
        "INVALID_RANGE",
      );
    }

    const events = await readCalendarCallEvents({
      from,
      to,
      executiveAccountId:
        realm === AUTH_REALM.admin ? null : user.id,
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error("GET /api/executive/calendar/events", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
