import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, isApiError } from "@/lib/api/api-error";
import { handleCalendlyWebhookEvent } from "@/lib/calendly/booking-store";
import {
  redactCalendlyPayloadForLog,
  type CalendlyWebhookPayload,
} from "@/lib/calendly/payload";
import {
  assertCalendlyWebhookAuthenticated,
  resolveWebhookTeamId,
} from "@/lib/calendly/webhook";

/**
 * POST /api/webhooks/calendly?team=EQUIPO_1|EQUIPO_2|EQUIPO_3
 *
 * Setup (por cada cuenta Calendly):
 * 1. Integraciones → Zoom conectado; Event Type con location Zoom.
 * 2. Webhooks → invitee.created + invitee.canceled →
 *    https://TU_DOMINIO/api/webhooks/calendly?team=EQUIPO_N
 * 3. Guardar signing key en CALENDLY_EQUIPO_N_WEBHOOK_SIGNING_KEY (o shared).
 *
 * Matching cliente: email normalizado. Sin User → 200 + booking sin userId (no reintenta).
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let body: CalendlyWebhookPayload;
    try {
      body = JSON.parse(rawBody) as CalendlyWebhookPayload;
    } catch {
      throw new ApiError("JSON inválido.", 400, "INVALID_JSON");
    }

    if (!body?.event || !body.payload) {
      throw new ApiError("Payload Calendly incompleto.", 400, "INVALID_PAYLOAD");
    }

    const teamId = resolveWebhookTeamId(request.url, body);
    assertCalendlyWebhookAuthenticated({
      teamId,
      rawBody,
      signatureHeader: request.headers.get("calendly-webhook-signature"),
    });

    const result = await handleCalendlyWebhookEvent({ teamId, body });

    if (!result.ok) {
      console.warn("[calendly] webhook negocio", {
        team: teamId,
        ...redactCalendlyPayloadForLog(body),
        reason: result.reason,
      });
      // Payload firmado válido: no tumbar reintentos por datos incompletos.
      return NextResponse.json({ ok: true, handled: false, reason: result.reason });
    }

    console.info("[calendly] webhook ok", {
      team: teamId,
      action: result.action,
      bookingId: result.bookingId ?? null,
      userId: result.userId ?? null,
      unmatched: Boolean(result.unmatchedEmail),
    });

    return NextResponse.json({
      ok: true,
      handled: true,
      action: result.action,
      bookingId: result.bookingId ?? null,
    });
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 400)) {
      console.warn("[calendly] webhook reject", {
        status: error.status,
        code: error.code,
        message: error.message,
      });
      const { body, status } = apiErrorResponse(error);
      return NextResponse.json(body, { status });
    }

    console.error("[calendly] webhook error", error);
    // Evitar storms de reintento por bugs internos cuando la firma ya pasó.
    if (!isApiError(error) || error.status >= 500) {
      return NextResponse.json({ ok: true, handled: false, error: "internal" });
    }
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
