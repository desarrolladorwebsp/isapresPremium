import { escapeHtml } from "@/lib/email/escape-html";
import {
  buildEmailShell,
  renderEmailButton,
  resolvePremiumEmailBrand,
} from "@/lib/email/email-branding";

export interface ExecutiveClientAssignmentEmailData {
  executiveName: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  planLabel?: string | null;
  assignmentType: "auto" | "manual";
  panelUrl: string;
}

function formatAssignmentType(type: ExecutiveClientAssignmentEmailData["assignmentType"]): string {
  return type === "auto" ? "Asignación automática" : "Asignación manual";
}

export function buildExecutiveClientAssignmentSubject(
  data: ExecutiveClientAssignmentEmailData,
): string {
  return `Nuevo cliente asignado — ${data.clientName}`;
}

export function buildExecutiveClientAssignmentEmailHtml(
  data: ExecutiveClientAssignmentEmailData,
): string {
  const brand = resolvePremiumEmailBrand();

  const rows = [
    ["Cliente", escapeHtml(data.clientName)],
    ["Correo", escapeHtml(data.clientEmail)],
    ["Teléfono", escapeHtml(data.clientPhone?.trim() || "—")],
    ["Origen", formatAssignmentType(data.assignmentType)],
  ];

  if (data.planLabel?.trim()) {
    rows.push(["Plan solicitado", escapeHtml(data.planLabel.trim())]);
  }

  const tableRows = rows
    .map(
      ([label, value]) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;width:38%;vertical-align:top;">${label}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;color:#222;font-size:14px;vertical-align:top;">${value}</td>
    </tr>`,
    )
    .join("");

  const body = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#222;">
      Hola ${escapeHtml(data.executiveName)},
    </p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#444;">
      Se te ha asignado un nuevo cliente en Cotizador Premium. Revisa su información y da seguimiento desde tu panel.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #eee;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      ${tableRows}
    </table>
    ${renderEmailButton(brand, "Ver clientes en el panel", data.panelUrl)}
  `;

  return buildEmailShell(
    brand,
    "Nuevo cliente asignado",
    body,
    "Este correo fue enviado desde cotizaciones@cotizadorpremium.cl",
  );
}
