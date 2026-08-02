import { escapeHtml } from "@/lib/email/escape-html";
import {
  buildEmailShell,
  resolvePremiumEmailBrand,
} from "@/lib/email/email-branding";
import { getStaffRoleLabelLower } from "@/lib/auth/staff-role";
import type { ExecutiveKind, StaffRealm } from "@/types/staff-account";

function resolvePremiumBrand() {
  return resolvePremiumEmailBrand();
}

function resolveRoleLabel(
  realm: StaffRealm,
  executiveKind?: ExecutiveKind | null,
): string {
  return getStaffRoleLabelLower({ realm, executiveKind });
}

export function buildStaffInviteEmailHtml(input: {
  fullName: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
  realm: StaffRealm;
  executiveKind?: ExecutiveKind | null;
}): string {
  const brand = resolvePremiumBrand();
  const roleLabel = resolveRoleLabel(input.realm, input.executiveKind);

  const body = `
    <h1 style="margin:0 0 12px;font-size:22px;color:#222;">Tu acceso al cotizador</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444;">
      Hola ${escapeHtml(input.fullName)}, se creó tu cuenta de <strong>${escapeHtml(roleLabel)}</strong>.
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444;">
      Usa la clave temporal de abajo para ingresar. Al iniciar sesión deberás definir una contraseña nueva.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;border:1px solid #eee;border-radius:10px;overflow:hidden;">
      <tr>
        <td style="padding:12px 14px;background:#fafafa;font-size:13px;color:#666;width:34%;">Correo</td>
        <td style="padding:12px 14px;font-size:14px;color:#222;">${escapeHtml(input.email)}</td>
      </tr>
      <tr>
        <td style="padding:12px 14px;background:#fafafa;font-size:13px;color:#666;border-top:1px solid #eee;">Clave temporal</td>
        <td style="padding:12px 14px;font-size:16px;font-weight:700;color:#222;border-top:1px solid #eee;font-family:Consolas,Monaco,monospace;">${escapeHtml(input.temporaryPassword)}</td>
      </tr>
    </table>
    <p style="margin:0 0 20px;text-align:center;">
      <a href="${escapeHtml(input.loginUrl)}" style="display:inline-block;background:${brand.primary};color:${brand.primaryForeground};text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:999px;">
        Iniciar sesión
      </a>
    </p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#666;">
      Por seguridad, no compartas esta clave. Si no esperabas este correo, ignóralo o contacta al administrador.
    </p>`;

  return buildEmailShell(
    brand,
    "Acceso al cotizador",
    body,
    `Acceso al cotizador virtual · ${escapeHtml(brand.name)}`,
  );
}

export function buildStaffInviteEmailSubject(
  realm: StaffRealm,
  executiveKind?: ExecutiveKind | null,
): string {
  if (realm === "admin") {
    return "Tu acceso de administrador — Cotizador Premium";
  }

  const label = resolveRoleLabel(realm, executiveKind);
  return `Tu acceso de ${label} — Cotizador Premium`;
}

export function buildStaffActivationEmailSubject(
  realm: StaffRealm,
  executiveKind?: ExecutiveKind | null,
): string {
  if (realm === "admin") {
    return "Activa tu cuenta de administrador — Cotizador Premium";
  }

  const label = resolveRoleLabel(realm, executiveKind);
  return `Activa tu cuenta de ${label} — Cotizador Premium`;
}

export function buildStaffActivationEmailHtml(input: {
  email: string;
  activationUrl: string;
  realm: StaffRealm;
  executiveKind?: ExecutiveKind | null;
  rut?: string | null;
}): string {
  const brand = resolvePremiumBrand();
  const roleLabel = resolveRoleLabel(input.realm, input.executiveKind);
  const rutRow = input.rut
    ? `<tr>
        <td style="padding:12px 14px;background:#fafafa;font-size:13px;color:#666;border-top:1px solid #eee;">RUT registrado</td>
        <td style="padding:12px 14px;font-size:14px;color:#222;border-top:1px solid #eee;">${escapeHtml(input.rut)}</td>
      </tr>`
    : "";

  const activationSteps =
    input.realm === "executive"
      ? `En el formulario deberás validar tu RUT${input.rut ? " (debe coincidir con el registrado)" : ""} y crear una contraseña personalizada. Después completarás tu perfil con nombre y teléfono de contacto.`
      : `En el formulario deberás ingresar nombre, apellido, RUT${input.rut ? " (debe coincidir con el registrado)" : ""} y una contraseña que solo tú conozcas.`;

  const body = `
    <h1 style="margin:0 0 12px;font-size:22px;color:#222;">Activa tu cuenta</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444;">
      Se te invitó a unirte a Cotizador Premium como <strong>${escapeHtml(roleLabel)}</strong>.
      Solo tú, con este correo, puedes completar el registro.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;border:1px solid #eee;border-radius:10px;overflow:hidden;">
      <tr>
        <td style="padding:12px 14px;background:#fafafa;font-size:13px;color:#666;width:34%;">Correo</td>
        <td style="padding:12px 14px;font-size:14px;color:#222;">${escapeHtml(input.email)}</td>
      </tr>
      ${rutRow}
    </table>
    <p style="margin:0 0 20px;text-align:center;">
      <a href="${escapeHtml(input.activationUrl)}" style="display:inline-block;background:${brand.primary};color:${brand.primaryForeground};text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:999px;">
        Crear mi cuenta
      </a>
    </p>
    <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#666;">
      ${activationSteps}
    </p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#666;">
      El enlace expira en 7 días. Si no esperabas este correo, ignóralo.
    </p>`;

  return buildEmailShell(
    brand,
    "Activa tu cuenta",
    body,
    `Acceso al cotizador virtual · ${escapeHtml(brand.name)}`,
  );
}

export function buildPasswordResetEmailSubject(): string {
  return "Restablece tu contraseña — Cotizador Premium";
}

export function buildPasswordResetEmailHtml(input: {
  email: string;
  resetUrl: string;
  expiresInMinutes: number;
}): string {
  const brand = resolvePremiumBrand();

  const body = `
    <h1 style="margin:0 0 12px;font-size:22px;color:#222;">Restablecer contraseña</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444;">
      Recibimos una solicitud para restablecer la contraseña de la cuenta
      <strong>${escapeHtml(input.email)}</strong> en Cotizador Premium.
    </p>
    <p style="margin:0 0 20px;text-align:center;">
      <a href="${escapeHtml(input.resetUrl)}" style="display:inline-block;background:${brand.primary};color:${brand.primaryForeground};text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:999px;">
        Restablecer contraseña
      </a>
    </p>
    <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#666;">
      El enlace expira en <strong>${input.expiresInMinutes} minutos</strong> y solo se puede usar una vez.
      Si no solicitaste este cambio, ignora este correo; tu contraseña no se modificará.
    </p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#666;">
      Este es un mensaje automático; no respondas a este correo.
    </p>`;

  return buildEmailShell(
    brand,
    "Restablecer contraseña",
    body,
    `Acceso al cotizador virtual · ${escapeHtml(brand.name)}`,
  );
}
