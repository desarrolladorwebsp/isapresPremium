import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, parseJsonBody } from "@/lib/api/api-error";
import { requireClientQuotationAccess } from "@/lib/api/client-quotation-access";
import { readClientQuotationEntity, recordQuotationDelivery } from "@/lib/api/client-quotation-store";
import { sendClientQuotationEmail } from "@/lib/email/send-client-quotation";

interface RouteContext { params: Promise<{ id: string; quotationId: string }> }

function snapshot(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id, quotationId } = await context.params;
    const session = await requireClientQuotationAccess(request, id, true);
    const payload = await parseJsonBody(request) as Record<string, unknown>;
    const channel = payload.channel === "EMAIL" || payload.channel === "WHATSAPP" ? payload.channel : null;
    if (!channel) throw new ApiError("Canal de envío inválido.", 400);
    const quotation = await readClientQuotationEntity(id, quotationId);
    if (!quotation) throw new ApiError("Cotización no encontrada.", 404);
    if (quotation.status === "VOIDED") throw new ApiError("No se puede enviar una cotización anulada.", 400);
    const client = snapshot(quotation.clientSnapshot);

    if (channel === "EMAIL") {
      const email = typeof client.email === "string" ? client.email.trim() : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError("El cliente no tiene un correo válido.", 400);
      try {
        const result = await sendClientQuotationEmail({
          quotation,
          clientName: typeof client.fullName === "string" ? client.fullName : "Cliente",
          clientEmail: email,
          executiveName: session.user.fullName,
        });
        const updated = await recordQuotationDelivery({
          clientId: id, quotationId, channel, success: true,
          actorId: session.user.id, actorName: session.user.fullName,
          metadata: { providerId: result.id, destination: email },
        });
        return NextResponse.json({ quotation: updated, providerId: result.id });
      } catch (error) {
        await recordQuotationDelivery({
          clientId: id, quotationId, channel, success: false,
          actorId: session.user.id, actorName: session.user.fullName,
        }).catch(() => undefined);
        throw error;
      }
    }

    const phone = typeof client.phone === "string" ? client.phone.replace(/\D/g, "") : "";
    if (phone.length < 8) throw new ApiError("El cliente no tiene un teléfono válido.", 400);
    const message = [
      `Hola ${typeof client.fullName === "string" ? client.fullName.split(/\s+/)[0] : ""},`,
      `preparé tu cotización ${quotation.number} con ${quotation.items.length} propuesta${quotation.items.length === 1 ? "" : "s"} de planes de salud.`,
      "Te enviaré el documento PDF en esta conversación. Si tienes dudas, escríbeme por aquí.",
      `Ejecutivo: ${session.user.fullName} · Isapres Premium`,
    ].join("\n\n");
    const updated = await recordQuotationDelivery({
      clientId: id, quotationId, channel, success: true,
      actorId: session.user.id, actorName: session.user.fullName,
      metadata: { destinationLast4: phone.slice(-4) },
    });
    return NextResponse.json({ quotation: updated, whatsappUrl: `https://wa.me/${phone}?text=${encodeURIComponent(message)}` });
  } catch (error) {
    console.error("POST send client quotation", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
