/**
 * Paleta oficial Cotizador Premium (fuente de verdad en código).
 * Navy + cyan + azules vivos; tokens derivados se mantienen en la misma familia.
 *
 * Si el theme en DB (`partner_entities.theme` para slug `cotizadorpremium`)
 * queda desfasado: re-ejecutar seed (`npx prisma db seed`) o actualizar el
 * theme del agente en admin — el seed hace upsert del theme desde
 * `COTIZADOR_PREMIUM_THEME` / esta paleta.
 */
export const COTIZADOR_PREMIUM_PALETTE = {
  /** Azul royal — CTAs y acentos principales */
  primary: "#0D6DEE",
  /** Azul vivo — hover / lift sobre primary */
  primaryHover: "#1289F8",
  /** Navy — tipografía y contraste fuerte */
  primaryDark: "#092558",
  primaryForeground: "#FFFFFF",
  /** Cyan de marca */
  secondary: "#1AC9EA",
  /** Lavado cyan claro (fondos suaves / chips) */
  secondaryMuted: "#E6F9FD",
  /** Gris azulado derivado del navy */
  muted: "#7A8FA5",
  textSecondary: "#5A7390",
  bgLayout: "#F5F9FC",
  background: "#FFFFFF",
  foreground: "#092558",
  border: "#D0E2F0",
  surfaceHover: "#EAF3FA",
  /** Misma familia que el badge «Mostrando…» (bg-primary). */
  criteriaSurface: "#0D6DEE",
  criteriaRing: "#0956C4",
  /** Coral para contraste con la paleta azul (texto / Ocultar). */
  convenioAccent: "#D85A30",
  /** CTA Validar convenio: coral (contrasta sobre criteria-surface = primary). */
  convenioAccentStrong: "#FF6B4A",
  convenioAccentMuted: "#FCE8E0",
} as const;

export const COTIZADOR_PREMIUM_LOGO_PATH =
  "/images/logo-cotizador-premium.png";

/** Isotipo oficial — menús, headers y marca compacta de plataforma. */
export const COTIZADOR_PREMIUM_ICON_PATH =
  "/images/icono-logo-cotizador-premium.png";
