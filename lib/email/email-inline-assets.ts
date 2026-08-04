import { existsSync, readFileSync } from "fs";
import path from "path";
import type { Attachment } from "resend";

/** CID del logo Isapres Premium incrustado en correos del sistema. */
export const PREMIUM_EMAIL_LOGO_CID = "isapres-premium-logo";

/** Wordmark oficial (misma pieza que login/staff). */
const PREMIUM_LOGO_FILENAME = "logo-isapres-premium.png";

/** Ruta fija del logo para tracing en build/serverless. */
const PREMIUM_LOGO_PATH = path.join(
  /* turbopackIgnore: true */
  process.cwd(),
  "public",
  PREMIUM_LOGO_FILENAME,
);

/** Fallback si el wordmark raíz no está disponible. */
const PREMIUM_LOGO_FALLBACK_PATH = path.join(
  /* turbopackIgnore: true */
  process.cwd(),
  "public",
  "images",
  PREMIUM_LOGO_FILENAME,
);

function resolvePremiumLogoPath(): string | null {
  if (existsSync(PREMIUM_LOGO_PATH)) return PREMIUM_LOGO_PATH;
  if (existsSync(PREMIUM_LOGO_FALLBACK_PATH)) return PREMIUM_LOGO_FALLBACK_PATH;
  return null;
}

export function buildPremiumLogoInlineAttachment(): Attachment | null {
  const logoPath = resolvePremiumLogoPath();
  if (!logoPath) return null;

  return {
    content: readFileSync(logoPath),
    filename: PREMIUM_LOGO_FILENAME,
    contentType: "image/png",
    contentId: PREMIUM_EMAIL_LOGO_CID,
  };
}

export function buildInlineAttachmentsForHtml(html: string): Attachment[] {
  if (!html.includes(`cid:${PREMIUM_EMAIL_LOGO_CID}`)) return [];

  const attachment = buildPremiumLogoInlineAttachment();
  return attachment ? [attachment] : [];
}
