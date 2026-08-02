import { Resend } from "resend";
import { ApiError } from "@/lib/api/api-error";
import { buildInlineAttachmentsForHtml } from "@/lib/email/email-inline-assets";
import {
  buildExecutiveSharePlansEmailHtml,
  buildExecutiveSharePlansSubject,
  type ExecutiveSharePlansEmailTemplateData,
} from "@/lib/email/executive-share-plans-templates";
import {
  getCotizacionFromEmail,
  getResendApiKey,
} from "@/lib/email/resend-config";

export async function sendExecutiveSharePlansEmail(
  data: ExecutiveSharePlansEmailTemplateData,
): Promise<{ id: string }> {
  const resend = new Resend(getResendApiKey());
  const html = buildExecutiveSharePlansEmailHtml(data);
  const attachments = buildInlineAttachmentsForHtml(html);

  const result = await resend.emails.send({
    from: getCotizacionFromEmail(),
    to: data.clientEmail,
    subject: buildExecutiveSharePlansSubject(data),
    html,
    attachments: attachments.length > 0 ? attachments : undefined,
  });

  if (result.error || !result.data?.id) {
    const details = result.error?.message?.trim();
    throw new ApiError(
      details
        ? `No se pudo enviar el correo: ${details}`
        : "No se pudo enviar el correo. Intenta nuevamente.",
      500,
    );
  }

  return { id: result.data.id };
}
