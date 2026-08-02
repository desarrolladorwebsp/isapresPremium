import Link from "next/link";
import { LandingBrandThemeEffect } from "./landing-brand-theme-effect";
import { LandingFloatingSocial } from "./landing-floating-social";
import { LandingFooter } from "./landing-footer";
import { LandingLogo } from "./landing-logo";
import { LandingPageBackdrop } from "./landing-page-backdrop";
import { landing } from "./landing-tokens";
import "./landing.css";

interface LandingMarketingShellProps {
  children: React.ReactNode;
  /** Subtítulo bajo el nombre de marca en el header. */
  headerSubtitle?: string;
}

export function LandingMarketingShell({
  children,
  headerSubtitle = "Salud prepaga en Chile",
}: LandingMarketingShellProps) {
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
                Cotizador Premium
              </p>
              <p className="text-xs text-muted">{headerSubtitle}</p>
            </div>
          </Link>
          <nav aria-label="Navegación principal" className="flex items-center gap-1.5 sm:gap-2">
            <Link href="/inicio#cotizar" className={landing.navLink}>
              Cotizar
            </Link>
            <Link href="/cotizador/acceso" className={landing.navCta}>
              Acceso staff
            </Link>
          </nav>
        </div>
      </header>

      <main id="contenido-principal">{children}</main>

      <LandingFloatingSocial />
      <LandingFooter />
    </div>
  );
}
