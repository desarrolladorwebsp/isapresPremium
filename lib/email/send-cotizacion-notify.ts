import { Resend } from "resend";
import { ApiError } from "@/lib/api/api-error";
import type { CotizacionNotifyInput } from "@/lib/email/cotizacion-notify-schema";
import {
  buildAdminCotizacionEmailHtml,
  buildAdminCotizacionSubject,
  buildUserCotizacionEmailHtml,
  buildUserCotizacionSubject,
} from "@/lib/email/cotizacion-notify-templates";
import { buildInlineAttachmentsForHtml } from "@/lib/email/email-inline-assets";
import {
  getCotizacionFromEmail,
  getCotizacionNotifyCcEmails,
  getCotizacionNotifyEmail,
  getResendApiKey,
} from "@/lib/email/resend-config";

export interface CotizacionNotifyResult {
  userId: string;
  adminId: string | null;
  adminEmailFailed?: boolean;
}

export async function sendCotizacionNotifyEmails(
  data: CotizacionNotifyInput,
): Promise<CotizacionNotifyResult> {
  const resend = new Resend(getResendApiKey());
  const cotizacionFrom = getCotizacionFromEmail();
  const cotizacionNotify = getCotizacionNotifyEmail();
  const cotizacionNotifyCc = getCotizacionNotifyCcEmails();

  const userHtml = buildUserCotizacionEmailHtml(data);
  const adminHtml = buildAdminCotizacionEmailHtml(data);
  const userAttachments = buildInlineAttachmentsForHtml(userHtml);
  const adminAttachments = buildInlineAttachmentsForHtml(adminHtml);

  const userResult = await resend.emails.send({
    from: cotizacionFrom,
    to: data.email,
    subject: buildUserCotizacionSubject(data),
    html: userHtml,
    attachments: userAttachments.length > 0 ? userAttachments : undefined,
  });

  if (userResult.error || !userResult.data?.id) {
    const details = userResult.error?.message?.trim();
    throw new ApiError(
      details
        ? `No se pudo enviar el correo de confirmación: ${details}`
        : "No se pudo enviar el correo de confirmación al usuario.",
      500,
    );
  }

  const adminResult = await resend.emails.send({
    from: cotizacionFrom,
    to: cotizacionNotify,
    ...(cotizacionNotifyCc.length > 0 ? { cc: cotizacionNotifyCc } : {}),
    replyTo: data.email,
    subject: buildAdminCotizacionSubject(data),
    html: adminHtml,
    attachments: adminAttachments.length > 0 ? adminAttachments : undefined,
  });

  if (adminResult.error || !adminResult.data?.id) {
    console.error(
      "Cotizacion admin notify failed:",
      adminResult.error?.message ?? "missing admin email id",
    );
  }

  return {
    userId: userResult.data.id,
    adminId: adminResult.data?.id ?? null,
    adminEmailFailed: Boolean(adminResult.error || !adminResult.data?.id),
  };
}
