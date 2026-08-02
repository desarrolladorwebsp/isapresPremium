import type { CSSProperties } from "react";
import type { Prisma } from "@prisma/client";
import type { PartnerEntityTheme } from "@/types/partner-entity";

const THEME_VAR_MAP: Record<keyof PartnerEntityTheme, string> = {
  primary: "--primary",
  primaryHover: "--primary-hover",
  primaryDark: "--primary-dark",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryMuted: "--secondary-muted",
  bgLayout: "--bg-layout",
  foreground: "--foreground",
  muted: "--muted",
  border: "--border",
  surfaceHover: "--surface-hover",
  criteriaSurface: "--criteria-surface",
  criteriaRing: "--criteria-ring",
  accentWarning: "--accent-warning",
  accentWarningForeground: "--accent-warning-foreground",
  convenioAccent: "--convenio-accent",
  convenioAccentStrong: "--convenio-accent-strong",
  convenioAccentMuted: "--convenio-accent-muted",
};

export function partnerThemeToPrismaJson(
  theme: PartnerEntityTheme,
): Prisma.InputJsonValue {
  return theme as Prisma.InputJsonValue;
}

export function partnerThemeToCssProperties(
  theme: PartnerEntityTheme,
): CSSProperties {
  const style: Record<string, string> = {};

  for (const [key, cssVar] of Object.entries(THEME_VAR_MAP)) {
    const value = theme[key as keyof PartnerEntityTheme];
    if (value) {
      style[cssVar] = value;
    }
  }

  return style as CSSProperties;
}

export function buildWhatsAppUrl(
  phoneNumber: string,
  message?: string | null,
): string {
  const digits = phoneNumber.replace(/\D/g, "");
  const params = message
    ? `?text=${encodeURIComponent(message)}`
    : "";

  return `https://wa.me/${digits}${params}`;
}
