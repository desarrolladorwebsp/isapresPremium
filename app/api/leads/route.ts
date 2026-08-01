import { Resend } from "resend";
import { INITIAL_FORM_DATA } from "@/constants/cotizador";
import {
  buildAdminLeadEmail,
  buildClientLeadEmail,
} from "@/lib/leads/email";
import {
  leadPayloadSchema,
  zodIssuesToFieldErrors,
} from "@/lib/leads/validation";

export const runtime = "nodejs";

const PUBLIC_ERROR =
  "No pudimos enviar tu cotización. Intenta nuevamente o contáctanos por WhatsApp.";
const CONFIG_ERROR =
  "El servicio de cotización no está disponible temporalmente. Contáctanos por WhatsApp.";

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

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { ok: false, error: "Solicitud inválida." },
        { status: 400 },
      );
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
    const from =
      process.env.RESEND_FROM_EMAIL ??
      "Isapres Premium <contacto@isaprespremium.cl>";
    const adminEmail =
      process.env.ADMIN_EMAIL ?? "contacto@isaprespremium.cl";
    const adminCcEmail =
      process.env.ADMIN_CC_EMAIL ?? "premiumisapres@gmail.com";

    const resend = getResendClient();
    const adminEmailContent = buildAdminLeadEmail(data);
    const clientEmailContent = buildClientLeadEmail(data);

    const [adminResult, clientResult] = await Promise.all([
      resend.emails.send({
        from,
        to: [adminEmail],
        cc: adminCcEmail ? [adminCcEmail] : undefined,
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

    // Admin email is critical: without it the lead is lost.
    if (adminResult.error) {
      console.error("Resend admin error", adminResult.error);
      return Response.json(
        {
          ok: false,
          error: PUBLIC_ERROR,
        },
        { status: 502 },
      );
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
