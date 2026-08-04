/**
 * One-off: envía muestras de plantillas de sistema con marca Isapres Premium.
 * Uso: npx tsx scripts/send-isapres-premium-email-samples.ts [email]
 */
import path from "path";
import { config } from "dotenv";
import { Resend } from "resend";
import { buildInlineAttachmentsForHtml } from "../lib/email/email-inline-assets";
import {
  buildExecutiveClientAssignmentEmailHtml,
  buildExecutiveClientAssignmentSubject,
} from "../lib/email/executive-client-assignment-templates";
import {
  buildExecutiveSharePlansEmailHtml,
  buildExecutiveSharePlansSubject,
} from "../lib/email/executive-share-plans-templates";
import {
  getCotizacionFromEmail,
  getEquipoFromEmail,
  getResendApiKey,
} from "../lib/email/resend-config";
import {
  buildPasswordResetEmailHtml,
  buildPasswordResetEmailSubject,
  buildStaffActivationEmailHtml,
  buildStaffActivationEmailSubject,
  buildStaffInviteEmailHtml,
  buildStaffInviteEmailSubject,
} from "../lib/email/staff-invite-templates";
import { resolveAppBaseUrl } from "../lib/platform/routing";

config({ path: path.join(process.cwd(), ".env.local") });

const to = (process.argv[2] ?? "soyalfredo.dev@gmail.com").trim();
const baseUrl = resolveAppBaseUrl().replace(/\/$/, "");

async function sendSample(
  resend: Resend,
  from: string,
  subject: string,
  html: string,
): Promise<string> {
  const attachments = buildInlineAttachmentsForHtml(html);
  const result = await resend.emails.send({
    from,
    to,
    subject: `[PRUEBA] ${subject}`,
    html,
    attachments: attachments.length > 0 ? attachments : undefined,
  });

  if (result.error) {
    throw new Error(`${subject}: ${result.error.message}`);
  }

  const id = result.data?.id;
  if (!id) throw new Error(`${subject}: Resend no devolvió ID`);
  return id;
}

async function main() {
  const resend = new Resend(getResendApiKey());
  const fromEquipo = getEquipoFromEmail();
  const fromCotizacion = getCotizacionFromEmail();

  console.log(`Enviando muestras Isapres Premium a ${to}…`);

  const samples: Array<{ label: string; id: string }> = [];

  samples.push({
    label: "Activación de cuenta (membresía)",
    id: await sendSample(
      resend,
      fromEquipo,
      buildStaffActivationEmailSubject("executive", "MEMBRESIA_ISAPRES_PREMIUM"),
      buildStaffActivationEmailHtml({
        email: to,
        activationUrl: `${baseUrl}/cotizador/activar-cuenta?token=demo-token`,
        realm: "executive",
        executiveKind: "MEMBRESIA_ISAPRES_PREMIUM",
        rut: "12.345.678-9",
      }),
    ),
  });

  samples.push({
    label: "Invitación con clave temporal",
    id: await sendSample(
      resend,
      fromEquipo,
      buildStaffInviteEmailSubject("executive", "COMERCIAL"),
      buildStaffInviteEmailHtml({
        fullName: "Alfredo Hurtado",
        email: to,
        temporaryPassword: "DemoTemp123!",
        loginUrl: `${baseUrl}/cotizador/acceso`,
        realm: "executive",
        executiveKind: "COMERCIAL",
      }),
    ),
  });

  samples.push({
    label: "Restablecer contraseña",
    id: await sendSample(
      resend,
      fromEquipo,
      buildPasswordResetEmailSubject(),
      buildPasswordResetEmailHtml({
        email: to,
        resetUrl: `${baseUrl}/cotizador/restablecer-clave?token=demo-token`,
        expiresInMinutes: 60,
      }),
    ),
  });

  const assignmentData = {
    executiveName: "Alfredo Hurtado",
    clientName: "Cliente de Prueba",
    clientEmail: "cliente.demo@example.com",
    clientPhone: "+56912345678",
    planLabel: "Consalud — CORE 101",
    assignmentType: "manual" as const,
    panelUrl: `${baseUrl}/cotizador/panel`,
  };

  samples.push({
    label: "Cliente asignado",
    id: await sendSample(
      resend,
      fromCotizacion,
      buildExecutiveClientAssignmentSubject(assignmentData),
      buildExecutiveClientAssignmentEmailHtml(assignmentData),
    ),
  });

  const shareData = {
    clientId: "demo-client",
    clientFullName: "Alfredo Hurtado",
    clientEmail: to,
    profileSummary: "Titular 35 años · 2 cargas · Región Metropolitana",
    plans: [
      {
        isapre: "Consalud",
        name: "CORE 101",
        code: "13-CORE101-26",
        type: "Libre Elección",
        priceUf: "1,160 UF",
        priceClp: "$47.314",
        listPriceUf: "1,220 UF",
        listPriceClp: "$49.760",
        convenioLabel: "Convenio empresa (5%)",
        hospitalCoverage: "70%",
        ambulatoryCoverage: "60%",
        pdfUrl: `${baseUrl}/cotizador`,
      },
      {
        isapre: "Banmédica",
        name: "Plan Demo",
        code: "01-DEMO-26",
        type: "Preferente",
        priceUf: "1,450 UF",
        priceClp: "$59.140",
        listPriceUf: null,
        listPriceClp: null,
        convenioLabel: null,
        hospitalCoverage: "80%",
        ambulatoryCoverage: "70%",
        pdfUrl: null,
      },
    ],
  };

  samples.push({
    label: "Comparación de planes",
    id: await sendSample(
      resend,
      fromCotizacion,
      buildExecutiveSharePlansSubject(shareData),
      buildExecutiveSharePlansEmailHtml(shareData),
    ),
  });

  console.log("Listo:");
  for (const sample of samples) {
    console.log(`  ✓ ${sample.label} → ${sample.id}`);
  }
}

main().catch((error) => {
  console.error("Error enviando muestras:", error);
  process.exit(1);
});
