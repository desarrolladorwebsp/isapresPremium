import { Resend } from "resend";
import { ApiError } from "@/lib/api/api-error";
import {
  PASSWORD_RESET_PATH,
  PASSWORD_RESET_TTL_MINUTES,
} from "@/lib/auth/constants";
import {
  buildPasswordResetEmailHtml,
  buildPasswordResetEmailSubject,
} from "@/lib/email/staff-invite-templates";
import { getEquipoFromEmail, getResendApiKey } from "@/lib/email/resend-config";
import { buildInlineAttachmentsForHtml } from "@/lib/email/email-inline-assets";
import { resolveServerAppBaseUrl } from "@/lib/platform/routing";

export async function sendPasswordResetEmail(input: {
  email: string;
  resetToken: string;
  request?: Request;
}): Promise<string> {
  const resend = new Resend(getResendApiKey());
  const fromEmail = getEquipoFromEmail();
  const baseUrl = resolveServerAppBaseUrl(input.request).replace(/\/$/, "");
  const resetUrl = `${baseUrl}${PASSWORD_RESET_PATH}?token=${encodeURIComponent(input.resetToken)}`;

  const html = buildPasswordResetEmailHtml({
    email: input.email,
    resetUrl,
    expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
  });
  const attachments = buildInlineAttachmentsForHtml(html);

  const result = await resend.emails.send({
    from: fromEmail,
    to: input.email,
    subject: buildPasswordResetEmailSubject(),
    html,
    attachments: attachments.length > 0 ? attachments : undefined,
  });

  if (result.error) {
    throw new ApiError(
      `No se pudo enviar el correo de recuperación: ${result.error.message}`,
      500,
    );
  }

  const messageId = result.data?.id;
  if (!messageId) {
    throw new ApiError("Resend no devolvió el ID del correo enviado.", 500);
  }

  return messageId;
}
