import { NextResponse } from "next/server";
import { apiErrorResponse, parseJsonBody } from "@/lib/api/api-error";
import { completeExecutiveOnboarding } from "@/lib/auth/account-store";
import { requireExecutiveOrAdminSession } from "@/lib/auth/require-auth";
import { AUTH_REALM } from "@/lib/auth/constants";

export async function POST(request: Request) {
  try {
    const { realm, user } = await requireExecutiveOrAdminSession(request, {
      allowIncompleteOnboarding: true,
    });

    if (realm !== AUTH_REALM.executive) {
      return NextResponse.json(
        { error: "Solo ejecutivos pueden completar este perfil." },
        { status: 403 },
      );
    }

    const payload = (await parseJsonBody(request)) as Record<string, unknown>;
    const firstName = typeof payload.firstName === "string" ? payload.firstName : "";
    const lastName = typeof payload.lastName === "string" ? payload.lastName : "";
    const phone = typeof payload.phone === "string" ? payload.phone : "";
    const rut = typeof payload.rut === "string" ? payload.rut : "";

    const updated = await completeExecutiveOnboarding(user.id, {
      firstName,
      lastName,
      phone,
      rut,
    });

    return NextResponse.json({
      ok: true,
      user: updated,
      redirectTo: "/cotizador/ejecutivos",
    });
  } catch (error) {
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
