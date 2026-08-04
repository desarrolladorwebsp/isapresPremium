import { escapeHtml } from "@/lib/email/escape-html";
import { PREMIUM_EMAIL_LOGO_CID } from "@/lib/email/email-inline-assets";
import {
  ISAPRE_PREMIUM_THEME,
  isIsaprePremiumAgentKey,
} from "@/lib/partner-entity/isapre-premium-agent";
import { PLATFORM_AGENT_KEY } from "@/lib/partner-entity/platform-agent";
import { resolveServerAppBaseUrl } from "@/lib/platform/routing";
import type { PartnerEntityTheme } from "@/types/partner-entity";

export interface EmailBrand {
  name: string;
  primary: string;
  primaryDark: string;
  primaryForeground: string;
  secondaryMuted: string;
  logoUrl?: string;
  /** Referencia cid: para logo incrustado en el correo (más fiable que URL externa). */
  logoContentId?: string;
  /**
   * Fondo del header. Por defecto (sistema Isapres Premium) es blanco
   * para que el wordmark se lea bien; agentes pueden usar su primary.
   */
  headerBackground?: string;
}

/**
 * Marca por defecto de correos del sistema (sin agente asociado).
 * El cotizador vive en Isapres Premium: logo + paleta turquesa.
 */
export const PREMIUM_EMAIL_BRAND: EmailBrand = {
  name: "Isapres Premium",
  primary: ISAPRE_PREMIUM_THEME.primary ?? "#0F8D8E",
  primaryDark: ISAPRE_PREMIUM_THEME.primaryDark ?? "#154B56",
  primaryForeground: ISAPRE_PREMIUM_THEME.primaryForeground ?? "#ffffff",
  secondaryMuted: ISAPRE_PREMIUM_THEME.secondaryMuted ?? "#E8F5F2",
  logoContentId: PREMIUM_EMAIL_LOGO_CID,
  headerBackground: "#FFFFFF",
};

export function resolveAbsoluteAssetUrl(
  path: string | undefined,
  request?: Request,
): string | undefined {
  if (!path?.trim()) return undefined;
  const trimmed = path.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = resolveServerAppBaseUrl(request).replace(/\/$/, "");
  return `${base}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

/** Marca Isapres Premium con logo incrustado (correos transaccionales del sistema). */
export function resolvePremiumEmailBrand(): EmailBrand {
  return { ...PREMIUM_EMAIL_BRAND };
}

function isSystemOrPlatformSlug(slug: string | null | undefined): boolean {
  const normalized = slug?.trim().toLowerCase() ?? "";
  if (!normalized) return true;
  if (normalized === PLATFORM_AGENT_KEY) return true;
  if (isIsaprePremiumAgentKey(normalized)) return true;
  return false;
}

/**
 * Marca de correo según agente.
 * Sin agente / cotizadorpremium / isaprespremium → Isapres Premium (sistema).
 * Otros agentes → su logo y colores.
 */
export function resolveAgentEmailBrand(input: {
  partnerEntityName?: string | null;
  partnerEntitySlug?: string | null;
  partnerEntityTheme?: PartnerEntityTheme | null;
  partnerEntityLogoUrl?: string | null;
}): EmailBrand {
  if (isSystemOrPlatformSlug(input.partnerEntitySlug)) {
    return resolvePremiumEmailBrand();
  }

  const name = input.partnerEntityName?.trim() || PREMIUM_EMAIL_BRAND.name;
  const theme = input.partnerEntityTheme;

  return {
    name,
    primary: theme?.primary ?? PREMIUM_EMAIL_BRAND.primary,
    primaryDark: theme?.primaryDark ?? PREMIUM_EMAIL_BRAND.primaryDark,
    primaryForeground:
      theme?.primaryForeground ?? PREMIUM_EMAIL_BRAND.primaryForeground,
    secondaryMuted:
      theme?.secondaryMuted ?? PREMIUM_EMAIL_BRAND.secondaryMuted,
    logoUrl: resolveAbsoluteAssetUrl(input.partnerEntityLogoUrl ?? undefined),
    headerBackground: theme?.primary ?? PREMIUM_EMAIL_BRAND.primary,
  };
}

export function buildEmailShell(
  brand: EmailBrand,
  title: string,
  body: string,
  footerNote: string,
): string {
  const logoSrc = brand.logoContentId
    ? `cid:${brand.logoContentId}`
    : brand.logoUrl;

  const headerBg = brand.headerBackground ?? brand.primary;
  const isLightHeader =
    headerBg.toLowerCase() === "#ffffff" ||
    headerBg.toLowerCase() === "#fff" ||
    headerBg.toLowerCase() === PREMIUM_EMAIL_BRAND.secondaryMuted.toLowerCase();

  const headerContent = logoSrc
    ? `<img src="${escapeHtml(logoSrc)}" alt="${escapeHtml(brand.name)}" width="180" style="display:block;max-width:180px;max-height:48px;height:auto;border:0;" />`
    : `<p style="margin:0;font-size:22px;font-weight:700;color:${isLightHeader ? brand.primaryDark : brand.primaryForeground};">${escapeHtml(brand.name)}</p>`;

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#222;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f5;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <tr>
              <td style="height:4px;background:${brand.primary};font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="background:${headerBg};padding:20px 24px;border-bottom:1px solid ${isLightHeader ? "#eee" : "transparent"};">
                ${headerContent}
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;background:#fafafa;border-top:1px solid #eee;">
                <p style="margin:0;font-size:12px;color:#888;text-align:center;">
                  ${footerNote}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderEmailButton(
  brand: EmailBrand,
  label: string,
  href: string,
): string {
  const safeHref = escapeHtml(href);
  return `<p style="margin:24px 0 0;text-align:center;">
    <a href="${safeHref}" style="display:inline-block;background:${brand.primary};color:${brand.primaryForeground};text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:999px;">
      ${escapeHtml(label)}
    </a>
  </p>`;
}

export function renderHighlightBox(
  brand: EmailBrand,
  title: string,
  lines: string[],
): string {
  const content = lines
    .map(
      (line, index) =>
        `<p style="margin:${index === 0 ? "0 0 4px" : "0 0 4px"};font-size:${index === 0 ? "16px" : "14px"};font-weight:${index === 0 ? "700" : "400"};color:#222;">${line}</p>`,
    )
    .join("");

  return `<div style="margin:0 0 20px;padding:16px;border:1px solid ${brand.secondaryMuted};background:${brand.secondaryMuted};border-radius:10px;">
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${brand.primary};">${escapeHtml(title)}</p>
    ${content}
  </div>`;
}
