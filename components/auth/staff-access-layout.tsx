"use client";

import Link from "next/link";
import { StaffAccessBrandThemeEffect } from "@/components/auth/staff-access-brand-theme-effect";
import { StaffBrandLogo } from "@/components/auth/staff-brand-logo";
import { landing } from "@/components/platform/landing/landing-tokens";
import { siteConfig } from "@/constants/site";
import "@/components/platform/landing/landing.css";

interface StaffAccessLayoutProps {
  children: React.ReactNode;
}

export function StaffAccessLayout({ children }: StaffAccessLayoutProps) {
  return (
    <div
      data-landing
      data-brand="isapre-premium"
      className={landing.pageRoot}
    >
      <StaffAccessBrandThemeEffect />

      <div
        className="landing-page-backdrop-gradient pointer-events-none fixed inset-0 -z-10"
        aria-hidden
      />
      <div
        className="landing-grid-pattern pointer-events-none fixed inset-0 -z-10 opacity-25"
        aria-hidden
      />

      <div className="relative flex min-h-screen flex-col">
        <header className={`${landing.header} border-b border-border/60`}>
          <div className={`${landing.headerInner} py-3.5`}>
            <Link href="/" className="flex items-center gap-3">
              <StaffBrandLogo size="md" transparent />
              <div className="min-w-0">
                <p className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
                  {siteConfig.name}
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
