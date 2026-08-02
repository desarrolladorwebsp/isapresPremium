/**
 * Semantic UI fragments — maps to CSS variables in globals.css
 *
 * App móvil nativa: usar appShellRoot + appShellScroll en vistas;
 * safeWidth en hijos anchos; horizontalScrollRail en tabs/nav.
 * Ver .cursor/skills/cotizador-ui/SKILL.md → «App móvil nativa».
 */
/** WCAG-friendly touch target (48×48px minimum on mobile). */
export const touchTarget =
  "min-h-12 min-w-12 inline-flex items-center justify-center md:min-h-10 md:min-w-10";

export const touchRow =
  "min-h-12 px-3 py-2 md:min-h-10 md:py-2";

export const appShell =
  "mx-auto w-full max-w-7xl 2xl:max-w-[1600px]";

/** Contenedor más ancho para la vista pública del cotizador. */
export const publicCotizadorShell =
  "mx-auto w-full max-w-[min(100%,1600px)] 2xl:max-w-[min(100%,1720px)]";

/** Evita que un hijo empuje el layout horizontalmente. */
export const safeWidth = "min-w-0 max-w-full";

/**
 * Carcasa app móvil: sin desborde lateral; en <lg> altura fija y scroll interno.
 * Usar con `appShellScroll` en el único contenedor que debe hacer scroll vertical.
 */
export const appShellRoot =
  "flex min-h-screen w-full max-w-full flex-col overflow-x-clip max-lg:h-dvh max-lg:max-h-dvh max-lg:overflow-hidden";

/** Zona de scroll vertical contenida (móvil). */
export const appShellScroll =
  "app-shell-scroll min-h-0 flex-1 overflow-x-clip max-lg:overflow-y-auto max-lg:overscroll-y-contain";

/** Carril horizontal interno (tabs, nav) sin arrastrar la página. */
export const horizontalScrollRail =
  "horizontal-scroll-rail max-w-full overflow-x-auto overscroll-x-contain";

/** Panel lateral de filtros (cotizador principal y ejecutivos, no widget). */
export const filtersSidebarDesktopShell =
  "lg:sticky lg:top-20 lg:z-20 lg:max-h-[calc(100dvh-5.5rem)] lg:min-h-0 lg:self-start";

/** Cuerpo con scroll independiente dentro del panel de filtros. */
export const filtersSidebarScrollBody =
  "filters-sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain";

export const motionGpu =
  "will-change-[transform,opacity] transform-gpu backface-hidden";

export const criteriaBar =
  "rounded-lg bg-[var(--criteria-surface)] p-4 shadow-sm ring-1 ring-[var(--criteria-ring)] sm:p-5";

/** Acentos de detalle (amarillo, azul, rojo) — no reemplazan el verde primario. */
export const accent = {
  iconPrimary: "bg-primary/12 text-primary-dark",
  iconSecondary: "bg-secondary-muted text-secondary",
  iconWarning: "bg-warning-muted text-accent-warning-foreground",
  iconDanger: "bg-danger-muted text-accent-danger",
  valuePrimary: "text-primary-dark",
  valueSecondary: "text-secondary",
  valueWarning: "text-accent-warning-foreground",
  borderPrimary: "border-l-[3px] border-l-primary",
  borderSecondary: "border-l-[3px] border-l-secondary",
  ringPrimary: "ring-1 ring-primary/20",
  ringSecondary: "ring-1 ring-secondary/25",
  ringWarning: "ring-1 ring-accent-warning/35",
} as const;

export type AccentIconTone = "primary" | "secondary" | "warning" | "danger";

export const accentIconClass: Record<AccentIconTone, string> = {
  primary: accent.iconPrimary,
  secondary: accent.iconSecondary,
  warning: accent.iconWarning,
  danger: accent.iconDanger,
};

export const ui = {
  canvas: "bg-bg-layout text-foreground",
  surfaceCard: "rounded-lg border border-border bg-white shadow-card",
  mutedText: "text-muted",
  border: "border-border",
  borderHairline: "border border-border",
  hoverSurface: "hover:bg-surface-hover",
  sectionTitle: "text-primary-dark",
  input:
    "border border-border bg-white text-foreground placeholder:text-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
  card: "rounded-lg border border-border bg-white shadow-card",
  link: "text-secondary transition hover:text-secondary/80",
  cta: "bg-[var(--cta,var(--primary))] text-primary-foreground shadow-[var(--shadow-cta)] transition hover:bg-[var(--cta-hover,var(--primary-hover))] active:scale-[0.99]",
  ctaOutline:
    "border border-border bg-white text-foreground transition hover:bg-surface-hover",
  dangerText: "text-danger transition hover:text-danger/80",
  dangerGhost:
    "border border-danger/30 bg-danger-muted text-danger transition hover:border-danger/50 hover:bg-danger-muted/80",
} as const;

export type PercentageTone = "hospital" | "ambulatory" | "neutral";

export const percentageToneActiveClass: Record<PercentageTone, string> = {
  hospital:
    "border-primary bg-primary text-primary-foreground font-semibold shadow-sm",
  ambulatory:
    "border-primary bg-primary text-primary-foreground font-semibold shadow-sm",
  neutral:
    "border-primary bg-primary text-primary-foreground font-semibold shadow-sm",
};

export type StatusBadgeTone =
  | "preferred"
  | "top"
  | "neutral"
  | "base"
  | "closed"
  | "free_choice";

export const statusBadgeToneClass: Record<StatusBadgeTone, string> = {
  preferred:
    "border-warning/40 bg-warning text-warning-foreground shadow-sm",
  top: "border-primary/30 bg-primary/10 text-primary-dark",
  neutral: "border-border bg-white text-muted",
  base: "border-primary/25 bg-primary/10 text-primary-dark",
  closed: "border-secondary/35 bg-secondary-muted text-secondary",
  free_choice: "border-border bg-surface-hover text-muted",
};

export const planTypeBadgeTone: Record<
  "preferred" | "closed" | "free_choice",
  StatusBadgeTone
> = {
  preferred: "preferred",
  closed: "closed",
  free_choice: "free_choice",
};

export function resolveBadgeTone(label: string): StatusBadgeTone {
  const key = label.toLowerCase();
  if (key === "preferente") return "preferred";
  if (key === "top") return "top";
  return "neutral";
}

/**
 * Elevación y superficies de las cards de plan (PublicPlanCard / PlanCard).
 * Tokens CSS en globals.css: --shadow-plan-card, --plan-card-border, etc.
 */
export const planCard = {
  root: `${motionGpu} overflow-hidden rounded-lg border bg-[var(--plan-card-surface)] shadow-plan-card ring-1 ring-inset ring-[var(--plan-card-ring)]`,
  header:
    "flex flex-col gap-3 border-b border-[var(--plan-card-border)] bg-[var(--plan-card-header-bg)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4",
  coverageGrid: "grid bg-[var(--plan-card-coverage-bg)] md:grid-cols-2",
  footer:
    "border-t border-[var(--plan-card-border)] bg-[var(--plan-card-coverage-bg)] px-3 py-2 text-center text-[11px] text-muted",
  listStack: "flex flex-col gap-5 sm:gap-6",
  elevation: {
    shadowRest: "var(--shadow-plan-card)",
    shadowHover: "var(--shadow-plan-card-hover)",
    borderRest: "var(--plan-card-border)",
    borderHover: "var(--primary)",
    hoverLiftPx: 4,
    spring: { type: "spring" as const, stiffness: 380, damping: 30 },
  },
} as const;

export const coverageBarGradient = "h-2 rounded-full bg-coverage-gradient";
