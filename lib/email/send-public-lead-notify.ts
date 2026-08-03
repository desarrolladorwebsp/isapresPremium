import { Resend } from "resend";
import {
  getCotizacionFromEmail,
  getCotizacionNotifyCcEmails,
  getCotizacionNotifyEmail,
  getResendApiKey,
} from "@/lib/email/resend-config";

export type PublicLeadNotifyInput = {
  fullName: string;
  email: string;
  phone: string;
  rut?: string | null;
  source?: string | null;
  preferenciaContacto?: string | null;
  notes?: string | null;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildRows(input: PublicLeadNotifyInput): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Nombre", value: input.fullName },
    { label: "Email", value: input.email },
    { label: "Teléfono", value: input.phone },
    { label: "RUT", value: input.rut?.trim() || "—" },
    { label: "Origen", value: input.source?.trim() || "Formulario web" },
    {
      label: "Preferencia de contacto",
      value: input.preferenciaContacto?.trim() || "—",
    },
  ];

  if (input.notes?.trim()) {
    rows.push({ label: "Notas", value: input.notes.trim() });
  }

  if (input.metadata) {
    for (const [key, raw] of Object.entries(input.metadata)) {
      if (raw === null || raw === undefined) continue;
      const text = String(raw).trim();
      if (!text) continue;
      rows.push({ label: key, value: text });
    }
  }

  return rows;
}

/**
 * Aviso interno al registrar un lead vía API pública de partners
 * (desdetu7, agente protegido, etc.). Siempre incluye CC a premiumisapres.
 */
export async function sendPublicLeadNotifyEmail(
  input: PublicLeadNotifyInput,
): Promise<{ adminId: string | null; adminEmailFailed: boolean }> {
  const resend = new Resend(getResendApiKey());
  const from = getCotizacionFromEmail();
  const to = getCotizacionNotifyEmail();
  const cc = getCotizacionNotifyCcEmails();
  const rows = buildRows(input);
  const originLabel = input.source?.trim() || "Formulario web";

  const htmlRows = rows
    .map(
      (field) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;color:#3f3f46;font-weight:600;width:40%;">${escapeHtml(field.label)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;color:#18181b;">${escapeHtml(field.value)}</td>
      </tr>`,
    )
    .join("");

  const subject = `🟢 Nueva solicitud — ${originLabel} — ${input.fullName}`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#18181b;">
      <h1 style="color:#064e45;font-size:22px;margin:0 0 8px;">Nueva solicitud de asesoría</h1>
      <p style="margin:0 0 20px;color:#52525b;">
        Llegó una solicitud desde <strong>${escapeHtml(originLabel)}</strong> y el cliente quedó registrado en el cotizador.
      </p>
      <table style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:12px;overflow:hidden;">
        ${htmlRows}
      </table>
    </div>
  `;
  const text = [
    "Nueva solicitud de asesoría",
    "",
    ...rows.map((field) => `${field.label}: ${field.value}`),
  ].join("\n");

  const adminResult = await resend.emails.send({
    from,
    to,
    ...(cc.length > 0 ? { cc } : {}),
    replyTo: input.email,
    subject,
    html,
    text,
  });

  if (adminResult.error || !adminResult.data?.id) {
    console.error(
      "Public lead admin notify failed:",
      adminResult.error?.message ?? "missing admin email id",
    );
    return { adminId: null, adminEmailFailed: true };
  }

  return { adminId: adminResult.data.id, adminEmailFailed: false };
}
