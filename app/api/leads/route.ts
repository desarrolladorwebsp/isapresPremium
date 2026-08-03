import { Resend } from "resend";
import { INITIAL_FORM_DATA } from "@/constants/cotizador";
import { registerLeadClient } from "@/lib/clients/register-lead-client";
import {
  buildAdminLeadEmail,
  buildClientLeadEmail,
} from "@/lib/leads/email";
import {
  leadPayloadSchema,
  zodIssuesToFieldErrors,
} from "@/lib/leads/validation";
import type { LeadPayload } from "@/lib/leads/validation";
import { enforceLeadEmailRateLimit } from "@/lib/public-api/write-guard";
import { enforcePublicPostGuard } from "@/lib/security/public-post-guard";

export const runtime = "nodejs";

const PUBLIC_ERROR =
  "No pudimos enviar tu solicitud. Intenta nuevamente o contáctanos por WhatsApp.";
const CONFIG_ERROR =
  "El servicio de solicitudes no está disponible temporalmente. Contáctanos por WhatsApp.";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("MISSING_RESEND_API_KEY");
  }
  return new Resend(apiKey);
}

function toPublicError(error: unknown) {
  if (
    error instanceof Error &&
    (error.message === "MISSING_RESEND_API_KEY" ||
      error.message.includes("RESEND"))
  ) {
    return CONFIG_ERROR;
  }
  return PUBLIC_ERROR;
}

/** Honeypot anti-bot: si viene relleno, fingimos éxito sin side-effects. */
function isHoneypotTripped(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const raw = body as Record<string, unknown>;
  const bait = raw._hp ?? raw.website ?? raw.companyUrl;
  return typeof bait === "string" && bait.trim().length > 0;
}

async function registerLeadFromMarketingForm(data: LeadPayload) {
  try {
    enforceLeadEmailRateLimit(data.email);
    return await registerLeadClient({
      fullName: data.nombreApellido,
      email: data.email,
      phone: data.telefono,
      rut: data.rut || null,
      source: "Formulario web - Isapres Premium",
      preferenciaContacto: data.preferenciaContacto,
      notes: data.motivoCotizacion
        ? `Motivo: ${data.motivoCotizacion}`
        : null,
      metadata: {
        región: data.region,
        edad: data.edad || undefined,
        "previsión actual": data.previsionActual,
        "UF actuales": data.ufActuales || undefined,
        "cargas médicas": data.cargasMedicas,
        "edad cargas": data.edadCargas || undefined,
        "renta imponible": data.rentaImponible,
      },
      executiveKind: "ISAPRES_PREMIUM",
      // Por ahora los leads del formulario quedan sin ejecutivo; se asignan a mano.
      autoAssign: false,
      clientOrigin: "FORMULARIO_WEB",
    });
  } catch (error) {
    console.error("Lead → cotizador client registration failed", error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const blocked = enforcePublicPostGuard(request, "leads");
    if (blocked) return blocked;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { ok: false, error: "Solicitud inválida." },
        { status: 400 },
      );
    }

    if (isHoneypotTripped(body)) {
      return Response.json({
        ok: true,
        adminId: null,
        clientId: null,
        clientEmailSent: false,
      });
    }

    const payload =
      body && typeof body === "object"
        ? { ...INITIAL_FORM_DATA, ...(body as Record<string, unknown>) }
        : INITIAL_FORM_DATA;

    const parsed = leadPayloadSchema.safeParse(payload);

    if (!parsed.success) {
      return Response.json(
        {
          ok: false,
          error: "Revisa los campos marcados e intenta nuevamente.",
          fieldErrors: zodIssuesToFieldErrors(parsed.error),
        },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Registrar en el cotizador como cliente (CRM). Si falla, no bloquear el lead por email.
    const cotizadorClient = await registerLeadFromMarketingForm(data);

    const from =
      process.env.RESEND_FROM_EMAIL ??
      "Isapres Premium <contacto@isaprespremium.cl>";
    const adminEmail =
      process.env.ADMIN_EMAIL ?? "contacto@isaprespremium.cl";
    const adminCcEmails = Array.from(
      new Set(
        [
          "premiumisapres@gmail.com",
          ...(process.env.ADMIN_CC_EMAIL ?? "")
            .split(",")
            .map((part) => part.trim().toLowerCase())
            .filter(Boolean),
        ].filter(
          (email) => email && email !== adminEmail.trim().toLowerCase(),
        ),
      ),
    );

    const resend = getResendClient();
    const adminEmailContent = buildAdminLeadEmail(data);
    const clientEmailContent = buildClientLeadEmail(data);

    const [adminResult, clientResult] = await Promise.all([
      resend.emails.send({
        from,
        to: [adminEmail],
        cc: adminCcEmails.length > 0 ? adminCcEmails : undefined,
        replyTo: data.email,
        subject: adminEmailContent.subject,
        html: adminEmailContent.html,
        text: adminEmailContent.text,
      }),
      resend.emails.send({
        from,
        to: [data.email],
        replyTo: adminEmail,
        subject: clientEmailContent.subject,
        html: clientEmailContent.html,
        text: clientEmailContent.text,
      }),
    ]);

    // Admin email is critical: without it the lead is lost (salvo que ya esté en CRM).
    if (adminResult.error) {
      console.error("Resend admin error", adminResult.error);
      if (!cotizadorClient) {
        return Response.json(
          {
            ok: false,
            error: PUBLIC_ERROR,
          },
          { status: 502 },
        );
      }
    }

    // Client confirmation is secondary: lead was captured.
    if (clientResult.error) {
      console.error("Resend client error", clientResult.error);
    }

    return Response.json({
      ok: true,
      adminId: adminResult.data?.id ?? null,
      clientId: clientResult.data?.id ?? null,
      clientEmailSent: !clientResult.error,
    });
  } catch (error) {
    console.error("Lead API error", error);
    return Response.json(
      {
        ok: false,
        error: toPublicError(error),
      },
      { status: 500 },
    );
  }
}
