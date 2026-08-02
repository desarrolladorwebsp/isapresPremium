import { escapeHtml } from "@/lib/email/escape-html";
import {
  buildEmailShell,
  renderHighlightBox,
  resolvePremiumEmailBrand,
} from "@/lib/email/email-branding";
import type { ExecutiveSharePlansEmailInput } from "@/lib/email/executive-share-plans-schema";

export interface ExecutiveSharePlansEmailTemplateData
  extends ExecutiveSharePlansEmailInput {
  clientFullName: string;
  clientEmail: string;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName.trim();
}

function renderPlanSection(
  plan: ExecutiveSharePlansEmailInput["plans"][number],
  index: number,
): string {
  const rows: Array<[string, string]> = [
    ["Isapre", plan.isapre],
    ["Nombre", plan.name],
    ["Código", plan.code],
    ["Tipo", plan.type],
    ["Precio final UF", plan.priceUf],
    ["Precio final CLP", plan.priceClp],
  ];

  if (plan.listPriceUf && plan.listPriceClp) {
    rows.push(["Precio lista UF", plan.listPriceUf]);
    rows.push(["Precio lista CLP", plan.listPriceClp]);
  }
  if (plan.convenioLabel) {
    rows.push(["Convenio", plan.convenioLabel]);
  }
  rows.push(["Cobertura hospitalaria", plan.hospitalCoverage || "—"]);
  rows.push(["Cobertura ambulatoria", plan.ambulatoryCoverage || "—"]);

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:8px 10px;border-bottom:1px solid #eee;color:#666;font-size:13px;width:34%;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee;color:#222;font-size:13px;vertical-align:top;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  const pdfLink =
    plan.pdfUrl && plan.pdfUrl.trim()
      ? `<p style="margin:12px 0 0;font-size:13px;">
          <a href="${escapeHtml(plan.pdfUrl)}" style="color:#0d6dee;font-weight:700;">Ver / descargar PDF del plan</a>
        </p>`
      : `<p style="margin:12px 0 0;font-size:13px;color:#888;">PDF no disponible</p>`;

  return `<div style="margin:0 0 22px;padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#fafbfc;">
    <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#092558;">Alternativa ${index + 1}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      ${tableRows}
    </table>
    ${pdfLink}
  </div>`;
}

export function buildExecutiveSharePlansSubject(
  data: ExecutiveSharePlansEmailTemplateData,
): string {
  return `Comparación de ${data.plans.length} planes de salud — Cotizador Premium`;
}

export function buildExecutiveSharePlansEmailHtml(
  data: ExecutiveSharePlansEmailTemplateData,
): string {
  const brand = resolvePremiumEmailBrand();
  const name = firstName(data.clientFullName);
  const count = data.plans.length;

  const profileBlock = data.profileSummary?.trim()
    ? renderHighlightBox(brand, "Perfil cotizado", [
        escapeHtml(data.profileSummary.trim()),
      ])
    : "";

  const planSections = data.plans
    .map((plan, index) => renderPlanSection(plan, index))
    .join("");

  const body = `
    <p style="margin:0 0 16px;font-size:16px;color:#222;">
      Hola ${escapeHtml(name)},
    </p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.55;color:#444;">
      Te compartimos <strong>${count}</strong> alternativa${count === 1 ? "" : "s"} de planes de salud
      preparada${count === 1 ? "" : "s"} desde Cotizador Premium.
    </p>
    ${profileBlock}
    ${planSections}
    <p style="margin:8px 0 0;font-size:13px;color:#666;line-height:1.5;">
      Si tienes dudas o quieres avanzar con alguna opción, responde este correo o contacta a tu ejecutivo.
    </p>
  `;

  return buildEmailShell(
    brand,
    buildExecutiveSharePlansSubject(data),
    body,
    `Este correo fue enviado por ${escapeHtml(brand.name)} a ${escapeHtml(data.clientEmail)}.`,
  );
}
