import { escapeHtml } from "@/lib/email/escape-html";
import { PREMIUM_EMAIL_LOGO_CID } from "@/lib/email/email-inline-assets";
import { COTIZADOR_PREMIUM_PALETTE } from "@/lib/partner-entity/cotizador-premium-palette";
import {
  resolveServerAppBaseUrl,
} from "@/lib/platform/routing";
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
}

export const PREMIUM_EMAIL_BRAND: EmailBrand = {
  name: "Cotizador Premium",
  primary: COTIZADOR_PREMIUM_PALETTE.primary,
  primaryDark: COTIZADOR_PREMIUM_PALETTE.primaryDark,
  primaryForeground: COTIZADOR_PREMIUM_PALETTE.primaryForeground,
  secondaryMuted: COTIZADOR_PREMIUM_PALETTE.secondaryMuted,
  logoContentId: PREMIUM_EMAIL_LOGO_CID,
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

/** Marca premium con logo incrustado (recomendado para correos transaccionales). */
export function resolvePremiumEmailBrand(): EmailBrand {
  return { ...PREMIUM_EMAIL_BRAND };
}

export function resolveAgentEmailBrand(input: {
  partnerEntityName?: string | null;
  partnerEntitySlug?: string | null;
  partnerEntityTheme?: PartnerEntityTheme | null;
  partnerEntityLogoUrl?: string | null;
}): EmailBrand {
  const name = input.partnerEntityName?.trim() || PREMIUM_EMAIL_BRAND.name;
  const theme = input.partnerEntityTheme;
  const hasAgent =
    Boolean(input.partnerEntitySlug?.trim()) &&
    input.partnerEntitySlug?.trim().toLowerCase() !== "cotizadorpremium";

  if (!hasAgent && !theme?.primary) {
    return resolvePremiumEmailBrand();
  }

  return {
    name,
    primary: theme?.primary ?? PREMIUM_EMAIL_BRAND.primary,
    primaryDark: theme?.primaryDark ?? PREMIUM_EMAIL_BRAND.primaryDark,
    primaryForeground:
      theme?.primaryForeground ?? PREMIUM_EMAIL_BRAND.primaryForeground,
    secondaryMuted:
      theme?.secondaryMuted ?? PREMIUM_EMAIL_BRAND.secondaryMuted,
    logoUrl: resolveAbsoluteAssetUrl(input.partnerEntityLogoUrl ?? undefined),
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

  const headerContent = logoSrc
    ? `<img src="${escapeHtml(logoSrc)}" alt="${escapeHtml(brand.name)}" width="180" style="display:block;max-width:180px;max-height:48px;height:auto;border:0;" />`
    : `<p style="margin:0;font-size:22px;font-weight:700;color:${brand.primaryForeground};">${escapeHtml(brand.name)}</p>`;

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
              <td style="background:${brand.primary};padding:20px 24px;">
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
