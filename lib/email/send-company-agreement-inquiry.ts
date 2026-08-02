import { Resend } from "resend";
import { ApiError } from "@/lib/api/api-error";
import type { CompanyAgreementInquiryInput } from "@/lib/email/company-agreement-schema";
import {
  getCotizacionFromEmail,
  getCotizacionNotifyEmail,
  getResendApiKey,
} from "@/lib/email/resend-config";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function row(label: string, value: string | undefined): string {
  if (!value?.trim()) return "";
  return `<tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;width:38%">${escapeHtml(label)}</td><td style="padding:8px 12px;border:1px solid #e5e7eb">${escapeHtml(value.trim())}</td></tr>`;
}

function buildAdminHtml(data: CompanyAgreementInquiryInput): string {
  const rows = [
    row("RUT persona", data.userRut),
    row("Correo", data.email),
    row("Teléfono", data.phone),
    row("RUT empresa", data.companyRut),
    row("Origen", data.source),
    row("URL cotizador", data.cotizadorUrl),
    row("Partner", data.partnerEntitySlug),
  ]
    .filter(Boolean)
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5">
      <h2 style="margin:0 0 12px;font-size:18px;color:#0f5132">Nueva consulta de convenio empresa</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#4b5563">
        Un usuario solicitó validar convenio colectivo desde el cotizador.
      </p>
      <table style="border-collapse:collapse;width:100%;max-width:560px;font-size:14px">
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

export async function sendCompanyAgreementInquiryEmail(
  data: CompanyAgreementInquiryInput,
): Promise<{ id: string }> {
  const resend = new Resend(getResendApiKey());
  const from = getCotizacionFromEmail();
  const to = getCotizacionNotifyEmail();

  const result = await resend.emails.send({
    from,
    to,
    replyTo: data.email?.trim() || undefined,
    subject: "Consulta convenio empresa–Isapre",
    html: buildAdminHtml(data),
  });

  if (result.error) {
    throw new ApiError(
      `No se pudo enviar la consulta: ${result.error.message}`,
      502,
    );
  }

  return { id: result.data?.id ?? "sent" };
}
