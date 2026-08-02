import { existsSync, readFileSync } from "fs";
import path from "path";
import type { Attachment } from "resend";

export const PREMIUM_EMAIL_LOGO_CID = "cotizador-premium-logo";

const PREMIUM_LOGO_FILENAME = "logo-cotizador-premium.png";

/** Ruta fija del logo para tracing en build/serverless. */
const PREMIUM_LOGO_PATH = path.join(
  /* turbopackIgnore: true */
  process.cwd(),
  "public",
  "images",
  PREMIUM_LOGO_FILENAME,
);

export function buildPremiumLogoInlineAttachment(): Attachment | null {
  if (!existsSync(PREMIUM_LOGO_PATH)) return null;

  return {
    content: readFileSync(PREMIUM_LOGO_PATH),
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
