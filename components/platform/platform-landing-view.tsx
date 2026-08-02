import Link from "next/link";
import type { PartnerEntityPublic } from "@/types/partner-entity";
import type { PublicPlanReview } from "@/types/plan-review";
import { buildCotizadorPremiumCotizadorUrl } from "@/lib/partner-entity/platform-agent";
import { LandingBrandThemeEffect } from "./landing/landing-brand-theme-effect";
import { LandingCotizadorWidgetSection } from "./landing/landing-cotizador-widget-section";
import { LandingFloatingSocial } from "./landing/landing-floating-social";
import { LandingFooter } from "./landing/landing-footer";
import { LandingHero } from "./landing/landing-hero";
import { LandingIsapresSection } from "./landing/landing-isapres-section";
import { LandingLogo } from "./landing/landing-logo";
import { LandingPageBackdrop } from "./landing/landing-page-backdrop";
import { LandingPartnersSection } from "./landing/landing-partners-section";
import { LandingReviewsSection } from "./landing/landing-reviews-section";
import { landing } from "./landing/landing-tokens";
import "./landing/landing.css";

interface PlatformLandingViewProps {
  /** Agente de cotizadorpremium.cl (nombre en header; colores solo desde landing.css). */
  platformEntity: PartnerEntityPublic;
  partners: PartnerEntityPublic[];
  reviews: PublicPlanReview[];
}

export function PlatformLandingView({
  platformEntity,
  partners,
  reviews,
}: PlatformLandingViewProps) {
  const cotizadorHref = buildCotizadorPremiumCotizadorUrl();

  return (
    <div data-landing data-brand="premium" className={landing.pageRoot}>
      <LandingBrandThemeEffect />
      <LandingPageBackdrop />
      <header className={`${landing.header} landing-header-over-backdrop`}>
        <div className={landing.headerInner}>
          <Link href="/inicio" className="flex items-center gap-3">
            <LandingLogo size="lg" />
            <div className="min-w-0">
              <p className="text-base font-semibold tracking-tight text-foreground">
                {platformEntity.name}
              </p>
              <p className="text-xs text-muted">
                Asesoría experta y personalizada
              </p>
            </div>
          </Link>
          <nav aria-label="Navegación principal" className="flex items-center gap-1.5 sm:gap-2">
            <Link href={cotizadorHref} className={landing.navLink}>
              Cotizar
            </Link>
            <Link href="/cotizador/acceso" className={landing.navCta}>
              Acceso staff
            </Link>
          </nav>
        </div>
      </header>

      <main id="contenido-principal">
        <LandingHero cotizadorHref={cotizadorHref} />
        <LandingPartnersSection partners={partners} />
        <LandingCotizadorWidgetSection />
        <LandingIsapresSection />
        <LandingReviewsSection reviews={reviews} />
      </main>

      <LandingFloatingSocial />
      <LandingFooter />
    </div>
  );
}
