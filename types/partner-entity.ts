/** Tema visual de una entidad aliada (CSS custom properties). */
export interface PartnerEntityTheme {
  primary?: string;
  primaryHover?: string;
  primaryDark?: string;
  primaryForeground?: string;
  secondary?: string;
  secondaryMuted?: string;
  bgLayout?: string;
  foreground?: string;
  muted?: string;
  border?: string;
  surfaceHover?: string;
  criteriaSurface?: string;
  criteriaRing?: string;
  accentWarning?: string;
  accentWarningForeground?: string;
  /** Texto / links del bloque convenio (p. ej. coral sobre azules). */
  convenioAccent?: string;
  /** Fondo del CTA «Validar convenio» (azul/verde/coral según agente). */
  convenioAccentStrong?: string;
  convenioAccentMuted?: string;
}

export interface PartnerEntityRecord {
  id: string;
  slug: string;
  embedKey: string;
  name: string;
  logoUrl: string;
  websiteUrl: string;
  whatsappNumber: string;
  whatsappMessage: string | null;
  exitLabel: string;
  brandKey: string;
  theme: PartnerEntityTheme;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerEntityPublic {
  slug: string;
  embedKey: string;
  name: string;
  logoUrl: string;
  websiteUrl: string;
  whatsappNumber: string;
  whatsappMessage: string | null;
  exitLabel: string;
  brandKey: string;
  theme: PartnerEntityTheme;
}
