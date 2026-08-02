import { NextResponse } from "next/server";
import { apiErrorResponse, parseJsonBody } from "@/lib/api/api-error";
import {
  readPasswordResetToken,
  resetStaffPasswordWithToken,
} from "@/lib/auth/password-reset-store";
import { clearAllStaffSessionCookies } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token")?.trim();
    if (!token) {
      return NextResponse.json(
        { error: "El enlace no es válido o expiró. Solicita uno nuevo." },
        { status: 400 },
      );
    }

    const reset = await readPasswordResetToken(token);
    if (!reset) {
      return NextResponse.json(
        { error: "El enlace no es válido o expiró. Solicita uno nuevo." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      email: reset.email,
      expiresAt: reset.expiresAt,
    });
  } catch (error) {
    console.error("GET /api/auth/password-reset", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

function isValidPayload(payload: unknown): payload is {
  token: string;
  newPassword: string;
  confirmPassword: string;
} {
  if (!payload || typeof payload !== "object") return false;
  const data = payload as Record<string, unknown>;
  return (
    typeof data.token === "string" &&
    data.token.trim().length > 0 &&
    typeof data.newPassword === "string" &&
    data.newPassword.length > 0 &&
    typeof data.confirmPassword === "string" &&
    data.confirmPassword.length > 0
  );
}

export async function POST(request: Request) {
  try {
    const payload = await parseJsonBody(request);

    if (!isValidPayload(payload)) {
      return NextResponse.json(
        {
          error:
            "Token, nueva contraseña y confirmación son obligatorios.",
        },
        { status: 400 },
      );
    }

    await resetStaffPasswordWithToken({
      token: payload.token,
      newPassword: payload.newPassword,
      confirmPassword: payload.confirmPassword,
    });

    // No auto-login; invalida cookies de sesión en este navegador.
    await clearAllStaffSessionCookies();

    return NextResponse.json({
      ok: true,
      message: "Contraseña actualizada, inicia sesión",
    });
  } catch (error) {
    console.error("POST /api/auth/password-reset", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
