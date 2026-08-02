/** Clases Tailwind reutilizables exclusivas de la Landing. */
export const landing = {
  pageRoot: "relative min-h-full scroll-smooth bg-bg-layout/80",
  sectionSurface:
    "landing-section-surface relative border-y border-border/50",
  container: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8",
  header:
    "sticky top-0 z-50 border-b border-border/60 landing-glass-panel-strong",
  headerInner:
    "mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8",
  navLink:
    "rounded-xl px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
  navCta:
    "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground landing-cta-primary transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
  heroSection: "relative overflow-hidden",
  heroInner: "relative mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 sm:pb-28 sm:pt-16 lg:px-8 lg:pb-32 lg:pt-20",
  badge:
    "inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-primary-dark",
  headline:
    "landing-text-gradient text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.06]",
  subheadline:
    "mt-6 max-w-xl text-pretty text-lg leading-relaxed premium-text-secondary sm:text-xl",
  ctaPrimary:
    "group inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground landing-cta-primary transition-all hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 sm:text-base",
  ctaPrimaryHero:
    "group inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground landing-cta-primary transition-all hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 sm:w-auto sm:px-10 sm:py-4 sm:text-lg",
  ctaSecondary:
    "inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background/80 px-6 py-3.5 text-sm font-semibold text-foreground backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 sm:text-base",
  trustPill:
    "inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur-sm sm:text-sm",
} as const;
