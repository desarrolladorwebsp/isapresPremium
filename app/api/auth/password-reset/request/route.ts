import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { apiErrorResponse, parseJsonBody } from "@/lib/api/api-error";
import { PASSWORD_RESET_RATE_LIMIT } from "@/lib/auth/constants";
import {
  createPasswordResetTokenForEmail,
  getPasswordResetRequestMessage,
} from "@/lib/auth/password-reset-store";
import { normalizeEmail } from "@/lib/auth/password";
import { sendPasswordResetEmail } from "@/lib/email/send-password-reset";
import { checkRateLimit, readClientIp } from "@/lib/security/rate-limit";

function isValidPayload(payload: unknown): payload is { email: string } {
  if (!payload || typeof payload !== "object") return false;
  const data = payload as Record<string, unknown>;
  return typeof data.email === "string" && data.email.trim().length > 0;
}

export async function POST(request: Request) {
  try {
    const payload = await parseJsonBody(request);
    const genericMessage = getPasswordResetRequestMessage();

    if (!isValidPayload(payload)) {
      return NextResponse.json(
        { error: "Indica un correo válido." },
        { status: 400 },
      );
    }

    const email = normalizeEmail(payload.email);
    const ip = readClientIp(request);
    const windowMs = PASSWORD_RESET_RATE_LIMIT.windowMinutes * 60 * 1000;
    const limit = PASSWORD_RESET_RATE_LIMIT.maxAttempts;

    const ipLimit = checkRateLimit(`password-reset:ip:${ip}`, {
      limit,
      windowMs,
    });
    const emailLimit = checkRateLimit(`password-reset:email:${email}`, {
      limit,
      windowMs,
    });

    if (!ipLimit.allowed || !emailLimit.allowed) {
      // Misma respuesta genérica: no filtrar ni revelar rate-limit como señal útil.
      return NextResponse.json({ ok: true, message: genericMessage });
    }

    const created = await createPasswordResetTokenForEmail(email);

    if (created) {
      try {
        await sendPasswordResetEmail({
          email: created.email,
          resetToken: created.token,
          request,
        });
      } catch (error) {
        // No filtrar existencia de cuenta ni fallos de entrega al cliente.
        console.error("POST /api/auth/password-reset/request email", error);
      }
    }

    return NextResponse.json({ ok: true, message: genericMessage });
  } catch (error) {
    console.error("POST /api/auth/password-reset/request", error);
    // Tabla ausente u otro fallo de esquema: mensaje claro (sin textos de “plan”).
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2010")
    ) {
      return NextResponse.json(
        {
          error:
            "El servicio de recuperación no está listo en el servidor. Intenta de nuevo en unos minutos.",
        },
        { status: 503 },
      );
    }
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
