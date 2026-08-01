import {
  CARGAS_MEDICAS_OPTIONS,
  CONTACTO_PREFERENCIA_OPTIONS,
  MOTIVO_COTIZACION_OPTIONS,
  PREVISION_OPTIONS,
  REGIONES_CHILE,
  type CotizadorFormData,
} from "@/constants/cotizador";
import {
  leadPayloadSchema,
  type LeadPayload,
} from "@/lib/leads/validation";

export { leadPayloadSchema, type LeadPayload };

function optionLabel(
  options: readonly { value: string; label: string }[],
  value: string,
) {
  if (!value) return "—";
  return options.find((option) => option.value === value)?.label ?? value;
}

export function formatLeadFields(data: LeadPayload | CotizadorFormData) {
  return [
    { label: "Nombre", value: data.nombreApellido },
    { label: "Email", value: data.email },
    { label: "Teléfono", value: data.telefono },
    { label: "RUT", value: data.rut || "—" },
    { label: "Edad", value: data.edad || "—" },
    {
      label: "Previsión actual",
      value: optionLabel(PREVISION_OPTIONS, data.previsionActual),
    },
    { label: "UF actuales", value: data.ufActuales || "—" },
    {
      label: "Región",
      value: optionLabel(REGIONES_CHILE, data.region),
    },
    {
      label: "Cargas médicas",
      value: optionLabel(CARGAS_MEDICAS_OPTIONS, data.cargasMedicas),
    },
    { label: "Edad cargas", value: data.edadCargas || "—" },
    { label: "Renta imponible", value: data.rentaImponible },
    {
      label: "Motivo de la solicitud",
      value: optionLabel(MOTIVO_COTIZACION_OPTIONS, data.motivoCotizacion),
    },
    {
      label: "Preferencia de contacto",
      value: optionLabel(CONTACTO_PREFERENCIA_OPTIONS, data.preferenciaContacto),
    },
  ];
}

function fieldsToHtmlRows(data: LeadPayload | CotizadorFormData) {
  return formatLeadFields(data)
    .map(
      (field) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;color:#3f3f46;font-weight:600;width:40%;">${field.label}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;color:#18181b;">${escapeHtml(field.value)}</td>
      </tr>`,
    )
    .join("");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildAdminLeadEmail(data: LeadPayload) {
  return {
    subject: `🟢 Solicitud de cotización desde la web — ${data.nombreApellido}`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#18181b;">
        <h1 style="color:#064e45;font-size:22px;margin:0 0 8px;">Nueva solicitud de cotización</h1>
        <p style="margin:0 0 20px;color:#52525b;">Llegó una solicitud de cotización desde el formulario de Isapres Premium.</p>
        <table style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:12px;overflow:hidden;">
          ${fieldsToHtmlRows(data)}
        </table>
      </div>
    `,
    text: [
      "Nueva solicitud de cotización",
      "",
      ...formatLeadFields(data).map((field) => `${field.label}: ${field.value}`),
    ].join("\n"),
  };
}

export function buildClientLeadEmail(data: LeadPayload) {
  const firstName = data.nombreApellido.trim().split(/\s+/)[0] ?? "hola";

  return {
    subject: "🟢 Recibimos tu solicitud de cotización — Isapres Premium",
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#18181b;">
        <h1 style="color:#064e45;font-size:22px;margin:0 0 8px;">¡Gracias, ${escapeHtml(firstName)}!</h1>
        <p style="margin:0 0 12px;color:#52525b;line-height:1.6;">
          Recibimos tu <strong>solicitud de cotización</strong>. Un asesor de
          <strong>Isapres Premium</strong> revisará tus datos y te contactará
          pronto según tu preferencia
          (<strong>${escapeHtml(optionLabel(CONTACTO_PREFERENCIA_OPTIONS, data.preferenciaContacto))}</strong>).
        </p>
        <p style="margin:0 0 20px;color:#52525b;line-height:1.6;">
          Mientras tanto, guarda este correo. Si necesitas algo urgente, escríbenos a
          <a href="mailto:contacto@isaprespremium.cl" style="color:#0a6b5e;">contacto@isaprespremium.cl</a>
          o por WhatsApp.
        </p>
        <div style="padding:16px;border-radius:12px;background:#ecfdf5;color:#064e45;">
          <p style="margin:0;font-weight:700;">Resumen de tu solicitud</p>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-top:8px;">
          ${fieldsToHtmlRows(data)}
        </table>
        <p style="margin:24px 0 0;color:#71717a;font-size:13px;">
          Isapres Premium — Asesoría independiente en planes de salud Isapre.
        </p>
      </div>
    `,
    text: [
      `¡Gracias, ${firstName}!`,
      "",
      "Recibimos tu solicitud de cotización. Un asesor de Isapres Premium te contactará pronto.",
      "",
      "Resumen de tu solicitud:",
      ...formatLeadFields(data).map((field) => `${field.label}: ${field.value}`),
      "",
      "contacto@isaprespremium.cl",
    ].join("\n"),
  };
}
