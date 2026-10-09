import type { SendpulseWebhookOutcome } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SendpulseEventDraft = {
  lineId?: string | null;
  botPhone?: string | null;
  contactId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  triggerKey?: string | null;
  outcome: SendpulseWebhookOutcome;
  httpStatus: number;
  errorMessage?: string | null;
  emailSent?: boolean;
  apiOutcome?: "OK" | "FAILED" | "MISSING_KEY" | null;
};

function clip(value: string | null | undefined, max: number): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export async function recordSendpulseEvent(draft: SendpulseEventDraft): Promise<void> {
  try {
    await prisma.sendpulseWebhookEvent.create({
      data: {
        lineId: draft.lineId ?? null,
        botPhone: clip(draft.botPhone, 40),
        contactId: clip(draft.contactId, 128),
        contactName: clip(draft.contactName, 160),
        contactPhone: clip(draft.contactPhone, 40),
        triggerKey: clip(draft.triggerKey, 64),
        outcome: draft.outcome,
        httpStatus: draft.httpStatus,
        errorMessage: clip(draft.errorMessage, 500),
        emailSent: draft.emailSent ?? false,
        apiOutcome: draft.apiOutcome ?? null,
      },
    });
  } catch (error) {
    console.error("[sendpulse] no se pudo registrar el evento", error);
  }
}
