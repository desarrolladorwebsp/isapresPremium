"use client";

import { useMemo, useState, type ReactNode } from "react";
import { UserMenu } from "@/components/auth/user-menu";
import {
  ExecutiveMenuIcon,
  ExecutiveMobileNavDrawer,
} from "@/components/executive/executive-mobile-nav-drawer";
import { LandingLogo } from "@/components/platform/landing/landing-logo";
import { useStaffSession } from "@/hooks/use-auth-session";
import { getStaffRoleLabel } from "@/lib/auth/staff-role";
import {
  type StaffSection,
} from "@/lib/staff/staff-sections";
import {
  appShellRoot,
  appShellScroll,
  horizontalScrollRail,
  safeWidth,
  touchTarget,
} from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { ExecutiveSessionUser } from "@/lib/auth/types";

export type ExecutiveSection = StaffSection;

const SECTION_LABELS: Record<
  StaffSection,
  { label: string; shortLabel: string; adminOnly?: boolean }
> = {
  inicio: { label: "Inicio", shortLabel: "Inicio" },
  calendario: { label: "Calendario", shortLabel: "Calend." },
  cotizador: { label: "Cotizador", shortLabel: "Cotiz." },
  clientes: { label: "Clientes", shortLabel: "Clientes" },
  cotizaciones: { label: "Cotizaciones", shortLabel: "Leads" },
  mapa: { label: "Mapa clínicas", shortLabel: "Mapa" },
  prospectos: {
    label: "Prospectos",
    shortLabel: "Prospectos",
    adminOnly: true,
  },
  usuarios: { label: "Usuarios", shortLabel: "Usuarios", adminOnly: true },
  clinicas: { label: "Clínicas", shortLabel: "Clínicas", adminOnly: true },
  ges: { label: "GES", shortLabel: "GES", adminOnly: true },
  "reportes-pdf": {
    label: "Planes / PDFs",
    shortLabel: "Planes",
    adminOnly: true,
  },
  convenios: {
    label: "Convenios",
    shortLabel: "Convenios",
    adminOnly: true,
  },
};

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className="premium-executive-tab-icon"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const SECTION_ICONS: Record<StaffSection, ReactNode> = {
  inicio: (
    <NavIcon>
      <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" strokeLinecap="round" strokeLinejoin="round" />
    </NavIcon>
  ),
  calendario: (
    <NavIcon>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
    </NavIcon>
  ),
  cotizador: (
    <NavIcon>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" strokeLinecap="round" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" strokeLinecap="round" />
    </NavIcon>
  ),
  clientes: (
    <NavIcon>
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" strokeLinecap="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" />
    </NavIcon>
  ),
  cotizaciones: (
    <NavIcon>
      <path d="M8 6h8M8 10h8M8 14h5" strokeLinecap="round" />
      <rect x="4" y="3" width="16" height="18" rx="2" />
    </NavIcon>
  ),
  mapa: (
    <NavIcon>
      <path d="M12 21s7-5.2 7-11a7 7 0 10-14 0c0 5.8 7 11 7 11z" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.2" />
    </NavIcon>
  ),
  prospectos: (
    <NavIcon>
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" strokeLinecap="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" strokeLinecap="round" />
    </NavIcon>
  ),
  usuarios: (
    <NavIcon>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0116 0" strokeLinecap="round" />
    </NavIcon>
  ),
  clinicas: (
    <NavIcon>
      <path d="M4 21V5a2 2 0 012-2h8a2 2 0 012 2v16M10 21v-6h4v6M14 21h6v-9a2 2 0 00-2-2h-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 8h2M10 7v2" strokeLinecap="round" />
    </NavIcon>
  ),
  ges: (
    <NavIcon>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" strokeLinecap="round" />
    </NavIcon>
  ),
  "reportes-pdf": (
    <NavIcon>
      <path d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" strokeLinejoin="round" />
      <path d="M14 3v5h5M9 13h6M9 17h4" strokeLinecap="round" />
    </NavIcon>
  ),
  convenios: (
    <NavIcon>
      <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" />
      <rect x="4" y="7" width="16" height="14" rx="2" />
      <path d="M9 12h6M9 16h4" strokeLinecap="round" />
    </NavIcon>
  ),
};

export interface ExecutiveShellProps {
  activeSection: ExecutiveSection;
  onSectionChange: (section: ExecutiveSection) => void;
  /** Secciones permitidas para la sesión actual. */
  allowedSections: StaffSection[];
  children: React.ReactNode;
}

export function ExecutiveShell({
  activeSection,
  onSectionChange,
  allowedSections,
  children,
}: ExecutiveShellProps) {
  const { user: staffUser, isAdmin, realm, executiveKind } = useStaffSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isFullBleed = activeSection === "cotizador";

  const navItems = allowedSections.map((id) => ({
    id,
    ...SECTION_LABELS[id],
  }));

  const activeSectionLabel = useMemo(
    () => navItems.find((item) => item.id === activeSection)?.label ?? "Inicio",
    [activeSection, navItems],
  );

  const userSubtitle = getStaffRoleLabel({
    realm: realm ?? (isAdmin ? "admin" : "executive"),
    executiveKind:
      executiveKind ??
      (staffUser && "executiveKind" in staffUser
        ? (staffUser as ExecutiveSessionUser).executiveKind
        : null),
  });

  return (
    <div className={joinClasses(appShellRoot, "min-h-screen bg-bg-layout")}>
      <header className="premium-executive-header sticky top-0 z-30 shrink-0">
        <div className="flex w-full max-w-none items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5 lg:px-5">
          <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
            <LandingLogo
              size="lg"
              className="premium-executive-logo"
            />
            <p className="truncate text-xs font-semibold text-white/80 lg:hidden">
              {activeSectionLabel}
            </p>
          </div>

          <nav
            className="premium-executive-tabs hidden min-w-0 flex-1 lg:block"
            aria-label="Secciones del panel"
          >
            <div
              className={joinClasses(
                horizontalScrollRail,
                "flex gap-1 py-0.5",
              )}
            >
              {navItems.map((item) => {
                const isActive = activeSection === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSectionChange(item.id)}
                    className={joinClasses(
                      "premium-executive-tab shrink-0 px-2.5 py-1.5 text-xs xl:px-3 xl:text-sm",
                      touchTarget,
                      isActive && "premium-executive-tab-active",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {SECTION_ICONS[item.id]}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
            <div className="hidden items-center lg:flex">
              {staffUser ? (
                <UserMenu
                  fullName={staffUser.fullName}
                  subtitle={userSubtitle}
                  compact
                  onDark
                  menuMode="dropdown"
                />
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className={joinClasses(
                "premium-executive-menu-btn inline-flex shrink-0 rounded-md lg:hidden",
                touchTarget,
              )}
              aria-label="Abrir menú de navegación"
              aria-expanded={mobileNavOpen}
            >
              <ExecutiveMenuIcon />
            </button>
          </div>
        </div>
      </header>

      <ExecutiveMobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        navItems={navItems}
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        sectionIcons={SECTION_ICONS}
        userFullName={staffUser?.fullName}
        userSubtitle={staffUser ? userSubtitle : null}
      />

      {isFullBleed ? (
        <div
          className={joinClasses(
            appShellScroll,
            safeWidth,
            "flex min-h-0 flex-1 flex-col",
          )}
        >
          {children}
        </div>
      ) : (
        <main
          className={joinClasses(
            appShellScroll,
            safeWidth,
            "mx-auto w-full max-w-7xl px-3 py-5 sm:px-4 sm:py-7 lg:px-5 lg:py-8",
          )}
        >
          {children}
        </main>
      )}
    </div>
  );
}
