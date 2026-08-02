import { NextResponse } from "next/server";
import {
  activateStaffAccountFromInvite,
  readStaffInviteByToken,
} from "@/lib/auth/staff-invite-store";
import { apiErrorResponse, parseJsonBody } from "@/lib/api/api-error";

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token")?.trim();
    if (!token) {
      return NextResponse.json({ error: "Token requerido." }, { status: 400 });
    }

    const invite = await readStaffInviteByToken(token);
    if (!invite) {
      return NextResponse.json(
        { error: "Invitación inválida o expirada." },
        { status: 404 },
      );
    }

    return NextResponse.json(invite);
  } catch (error) {
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await parseJsonBody(request)) as Record<string, unknown>;

    const token = typeof payload.token === "string" ? payload.token : "";
    const firstName =
      typeof payload.firstName === "string" ? payload.firstName : "";
    const lastName =
      typeof payload.lastName === "string" ? payload.lastName : "";
    const rut = typeof payload.rut === "string" ? payload.rut : "";
    const password =
      typeof payload.password === "string" ? payload.password : "";

    const result = await activateStaffAccountFromInvite({
      token,
      firstName,
      lastName,
      rut,
      password,
    });

    return NextResponse.json({
      ok: true,
      realm: result.realm,
      redirectTo: result.loginPath,
    });
  } catch (error) {
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
