import "server-only";

import { Resend } from "resend";
import { ApiError } from "@/lib/api/api-error";
import { buildEmailShell, resolvePremiumEmailBrand } from "@/lib/email/email-branding";
import { buildInlineAttachmentsForHtml } from "@/lib/email/email-inline-assets";
import { escapeHtml } from "@/lib/email/escape-html";
import { getCotizacionFromEmail, getResendApiKey } from "@/lib/email/resend-config";
import { buildClientQuotationPdf } from "@/lib/client-quotation/pdf";

export async function sendClientQuotationEmail(input: {
  quotation: Parameters<typeof buildClientQuotationPdf>[0];
  clientName: string;
  clientEmail: string;
  executiveName: string;
}) {
  const brand = resolvePremiumEmailBrand();
  const subject = `Cotización ${input.quotation.number} — Isapres Premium`;
  const body = `
    <p style="font-size:16px;color:#222">Hola ${escapeHtml(input.clientName.split(/\s+/)[0] || input.clientName)},</p>
    <p style="font-size:14px;line-height:1.6;color:#444">${escapeHtml(input.executiveName)} preparó tu cotización formal de planes de salud. El documento incluye hasta tres propuestas seleccionadas especialmente para ti.</p>
    <p style="margin:20px 0;padding:14px;border-radius:9px;background:${brand.secondaryMuted};color:${brand.primaryDark};font-weight:700">Encontrarás la cotización formal adjunta a este correo en formato PDF.</p>
    <p style="font-size:13px;color:#666">Responde este correo si deseas aceptar una propuesta o necesitas aclarar alguna condición.</p>`;
  const html = buildEmailShell(brand, subject, body, `Cotización preparada por ${escapeHtml(input.executiveName)}.`);
  const pdf = await buildClientQuotationPdf(input.quotation);
  const attachments = [
    ...buildInlineAttachmentsForHtml(html),
    { filename: `${input.quotation.number}.pdf`, content: Buffer.from(pdf) },
  ];
  const result = await new Resend(getResendApiKey()).emails.send({
    from: getCotizacionFromEmail(), to: input.clientEmail, subject, html, attachments,
  });
  if (result.error || !result.data?.id) {
    throw new ApiError(result.error?.message || "No se pudo enviar la cotización por correo.", 500);
  }
  return { id: result.data.id };
}
