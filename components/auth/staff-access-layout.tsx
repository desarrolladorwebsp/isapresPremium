"use client";

import Link from "next/link";
import { LandingBrandThemeEffect } from "@/components/platform/landing/landing-brand-theme-effect";
import { LandingLogo } from "@/components/platform/landing/landing-logo";
import { landing } from "@/components/platform/landing/landing-tokens";
import "@/components/platform/landing/landing.css";

interface StaffAccessLayoutProps {
  children: React.ReactNode;
}

export function StaffAccessLayout({ children }: StaffAccessLayoutProps) {
  return (
    <div data-landing data-brand="premium" className={landing.pageRoot}>
      <LandingBrandThemeEffect />

      <div className="landing-page-backdrop-gradient pointer-events-none fixed inset-0 -z-10" aria-hidden />
      <div className="landing-grid-pattern pointer-events-none fixed inset-0 -z-10 opacity-25" aria-hidden />

      <div className="relative flex min-h-screen flex-col">
        <header className={`${landing.header} border-b border-border/60`}>
          <div className={`${landing.headerInner} py-3.5`}>
            <Link href="/" className="flex items-center gap-3">
              <LandingLogo size="md" transparent />
              <div className="min-w-0">
                <p className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
                  Cotizador Premium
                </p>
                <p className="text-xs text-muted">Acceso staff</p>
              </div>
            </Link>
            <Link href="/" className={landing.navLink}>
              Volver al inicio
            </Link>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
