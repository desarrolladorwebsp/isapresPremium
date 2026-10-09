import { NextResponse } from "next/server";
import {
  handleSendpulseWebhook,
  isSendpulseWebhookReady,
} from "@/lib/sendpulse/handle-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/webhooks/sendpulse
 * `true` si la API puede recibir un disparador y enviar el correo. `false` si no.
 *
 * POST /api/webhooks/sendpulse
 * Authorization: Bearer <token de la línea>
 * { id, nombre?, telefono?, bot?, disparador? }
 * Responde `true` solo si el aviso quedó registrado y el correo salió
 * (o era un duplicado reciente). En cualquier otro caso responde `false`.
 */
export async function GET() {
  const ok = await isSendpulseWebhookReady();
  return NextResponse.json(ok, {
    status: ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const result = await handleSendpulseWebhook(request);
  return NextResponse.json(result.ok, {
    status: result.status,
    headers: { "Cache-Control": "no-store" },
  });
}
