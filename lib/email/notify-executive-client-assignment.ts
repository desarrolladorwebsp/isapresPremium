import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import {
  buildExecutiveClientAssignmentEmailHtml,
  buildExecutiveClientAssignmentSubject,
} from "@/lib/email/executive-client-assignment-templates";
import { buildInlineAttachmentsForHtml } from "@/lib/email/email-inline-assets";
import { getCotizacionFromEmail, getResendApiKey } from "@/lib/email/resend-config";
import { EXECUTIVE_HOME_PATH } from "@/lib/auth/constants";
import { resolveServerAppBaseUrl } from "@/lib/platform/routing";

export type ExecutiveClientAssignmentType = "auto" | "manual";

export interface NotifyExecutiveClientAssignmentInput {
  clientUserId: string;
  executiveAccountId: string;
  assignmentType?: ExecutiveClientAssignmentType;
  quoteId?: string | null;
  request?: Request;
}

async function resolvePlanLabel(quoteId?: string | null): Promise<string | null> {
  if (!quoteId) return null;

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: {
      planCode: true,
      plan: {
        select: {
          planName: true,
          isapreRef: { select: { name: true } },
        },
      },
    },
  });

  if (!quote) return null;

  if (quote.plan) {
    return `${quote.plan.isapreRef.name} — ${quote.plan.planName}`;
  }

  return quote.planCode ?? null;
}

export async function sendExecutiveClientAssignmentEmail(
  input: NotifyExecutiveClientAssignmentInput,
): Promise<string | null> {
  const [executive, client, planLabel] = await Promise.all([
    prisma.staffAccount.findFirst({
      where: {
        id: input.executiveAccountId,
        role: "EXECUTIVE",
        active: true,
      },
      select: { email: true, fullName: true },
    }),
    prisma.user.findUnique({
      where: { id: input.clientUserId },
      select: { fullName: true, email: true, phone: true, role: true },
    }),
    resolvePlanLabel(input.quoteId),
  ]);

  if (!executive?.email?.trim() || !client || client.role !== "CLIENT") {
    return null;
  }

  const baseUrl = resolveServerAppBaseUrl(input.request).replace(/\/$/, "");
  const panelUrl = `${baseUrl}${EXECUTIVE_HOME_PATH}`;

  const html = buildExecutiveClientAssignmentEmailHtml({
    executiveName: executive.fullName?.trim() || "Ejecutivo",
    clientName: client.fullName?.trim() || client.email,
    clientEmail: client.email,
    clientPhone: client.phone,
    planLabel,
    assignmentType: input.assignmentType ?? "auto",
    panelUrl,
  });

  const attachments = buildInlineAttachmentsForHtml(html);

  const resend = new Resend(getResendApiKey());
  const result = await resend.emails.send({
    from: getCotizacionFromEmail(),
    to: executive.email.trim(),
    subject: buildExecutiveClientAssignmentSubject({
      executiveName: executive.fullName?.trim() || "Ejecutivo",
      clientName: client.fullName?.trim() || client.email,
      clientEmail: client.email,
      assignmentType: input.assignmentType ?? "auto",
      panelUrl,
    }),
    html,
    attachments: attachments.length > 0 ? attachments : undefined,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data?.id ?? null;
}

/** Envía en segundo plano; no interrumpe la asignación si Resend falla. */
export function queueExecutiveClientAssignmentEmail(
  input: NotifyExecutiveClientAssignmentInput,
): void {
  void sendExecutiveClientAssignmentEmail(input).catch((error) => {
    console.error("[email] executive client assignment failed:", error);
  });
}
