import { registerLeadClient } from "@/lib/clients/register-lead-client";
import { ApiError } from "@/lib/api/api-error";
import { sendPublicLeadNotifyEmail } from "@/lib/email/send-public-lead-notify";
import { PUBLIC_API_VERSION } from "@/lib/public-api/constants";
import { publicApiOptionsResponse } from "@/lib/public-api/cors";
import {
  publicApiErrorResponse,
  publicApiJsonResponse,
} from "@/lib/public-api/json-response";
import { publicRegisterClientSchema } from "@/lib/public-api/register-client-schema";
import { requirePublicApiSecret } from "@/lib/public-api/require-api-secret";
import {
  enforceLeadEmailRateLimit,
  enforcePublicApiWriteGuard,
} from "@/lib/public-api/write-guard";

export async function OPTIONS(request: Request) {
  return publicApiOptionsResponse(request);
}

/**
 * POST /api/public/v1/clients
 * Registra (o actualiza) un lead como cliente del cotizador.
 * Autenticación: Bearer PUBLIC_API_SECRET o X-API-Key.
 * Pensado para llamadas server-to-server (no exponer la clave en el browser).
 */
export async function POST(request: Request) {
  try {
    const blocked = enforcePublicApiWriteGuard(request, "clients");
    if (blocked) return blocked;

    requirePublicApiSecret(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError("JSON inválido.", 400, "INVALID_JSON");
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new ApiError("Cuerpo JSON inválido.", 400, "INVALID_JSON");
    }

    const parsed = publicRegisterClientSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ApiError(
        first?.message ?? "Datos inválidos.",
        400,
        "INVALID_INPUT",
      );
    }

    const data = parsed.data;
    enforceLeadEmailRateLimit(data.email);

    const result = await registerLeadClient({
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      rut: data.rut,
      notes: data.notes,
      source: data.source,
      preferenciaContacto: data.preferenciaContacto,
      metadata: data.metadata,
      executiveKind: data.executiveKind,
      autoAssign: data.autoAssign,
      clientOrigin: "FORMULARIO_WEB",
    });

    let notified = false;
    if (data.notifyAdmin) {
      try {
        const notify = await sendPublicLeadNotifyEmail({
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          rut: data.rut,
          source: data.source,
          preferenciaContacto: data.preferenciaContacto,
          notes: data.notes,
          metadata: data.metadata,
        });
        notified = !notify.adminEmailFailed;
      } catch (notifyError) {
        // No tumbar el registro CRM si falla el correo interno.
        console.error(
          "POST /api/public/v1/clients notifyAdmin failed",
          notifyError,
        );
      }
    }

    return publicApiJsonResponse(
      request,
      {
        data: {
          clientId: result.clientId,
          email: result.email,
          created: result.created,
          // No exponer IDs internos de ejecutivos en la API pública.
          assigned: Boolean(result.assignedExecutiveId),
          notified,
        },
        meta: {
          version: PUBLIC_API_VERSION,
        },
      },
      result.created ? 201 : 200,
    );
  } catch (error) {
    console.error("POST /api/public/v1/clients", error);
    return publicApiErrorResponse(request, error);
  }
}
