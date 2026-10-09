import { Resend } from "resend";
import { escapeHtml } from "@/lib/email/escape-html";
import { getEquipoFromEmail, getResendApiKey } from "@/lib/email/resend-config";
import { getSendpulseNotifyEmail } from "@/lib/sendpulse/contract";
import { sendpulseTriggerLabel } from "@/lib/sendpulse/triggers";

export type SendpulseTriggerNotifyInput = {
  triggerKey: string | null;
  botPhone: string;
  lineLabel: string;
  contactId: string;
  contactName: string | null;
  contactPhone: string | null;
};

export async function sendSendpulseTriggerNotifyEmail(
  input: SendpulseTriggerNotifyInput,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const knownLabel = sendpulseTriggerLabel(input.triggerKey);
  const triggerLabel = knownLabel ?? input.triggerKey ?? "Sin disparador";
  const triggerValue = input.triggerKey
    ? knownLabel
      ? `${knownLabel} (${input.triggerKey})`
      : input.triggerKey
    : "—";
  const phone = input.contactPhone?.trim() || "—";
  const rows = [
    { label: "Disparador", value: triggerValue },
    { label: "Bot", value: input.botPhone },
    { label: "Línea", value: input.lineLabel },
    { label: "Id SendPulse", value: input.contactId },
    { label: "Nombre", value: input.contactName?.trim() || "—" },
    { label: "Teléfono", value: phone },
  ];

  const htmlRows = rows
    .map(
      (field) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;color:#3f3f46;font-weight:600;width:40%;">${escapeHtml(field.label)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;color:#18181b;">${escapeHtml(field.value)}</td>
      </tr>`,
    )
    .join("");

  const subject = `SendPulse — ${triggerLabel} — ${phone === "—" ? input.contactId : phone}`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#18181b;">
      <h1 style="color:#064e45;font-size:22px;margin:0 0 8px;">Disparador de SendPulse</h1>
      <p style="margin:0 0 20px;color:#52525b;">
        Un flujo de WhatsApp avisó este disparador. Esta etapa solo notifica: no crea el cliente en el CRM.
      </p>
      <table style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:12px;overflow:hidden;">
        ${htmlRows}
      </table>
    </div>
  `;
  const text = [
    "Disparador de SendPulse",
    "",
    ...rows.map((field) => `${field.label}: ${field.value}`),
  ].join("\n");

  try {
    const resend = new Resend(getResendApiKey());
    const result = await resend.emails.send({
      from: getEquipoFromEmail(),
      to: getSendpulseNotifyEmail(),
      subject,
      html,
      text,
    });

    if (result.error || !result.data?.id) {
      return {
        ok: false,
        message: result.error?.message || "No se pudo enviar el correo.",
      };
    }

    return { ok: true, id: result.data.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo enviar el correo.";
    return { ok: false, message };
  }
}
