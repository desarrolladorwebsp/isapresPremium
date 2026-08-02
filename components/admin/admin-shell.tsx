"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/auth/user-menu";
import { useStaffSession } from "@/hooks/use-auth-session";
import {
  ADMIN_HOME_PATH,
  ADMIN_USERS_PATH,
} from "@/lib/auth/constants";
import {
  appShellRoot,
  appShellScroll,
  horizontalScrollRail,
  safeWidth,
  touchTarget,
  ui,
} from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

export type AdminSection = "quotes" | "plans" | "clinics" | "ges";

export interface AdminShellProps {
  activeSection?: AdminSection;
  onSectionChange?: (section: AdminSection) => void;
  children: React.ReactNode;
}

const navItems: { id: AdminSection; label: string; shortLabel: string }[] = [
  { id: "quotes", label: "Cotizaciones", shortLabel: "Cotiz." },
  { id: "plans", label: "Planes de salud", shortLabel: "Planes" },
  { id: "clinics", label: "Clínicas y prestadores", shortLabel: "Clínicas" },
  { id: "ges", label: "Valores GES", shortLabel: "GES" },
];

export function AdminShell({
  activeSection,
  onSectionChange,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const { user: staffUser, isAdmin } = useStaffSession();
  const onUsersPage = pathname === ADMIN_USERS_PATH;
  const useTabNavigation = Boolean(onSectionChange && activeSection);

  return (
    <div className={joinClasses(appShellRoot, ui.canvas, "min-h-screen")}>
      <header
        className={joinClasses(
          "sticky top-0 z-30 shrink-0 border-b bg-white shadow-sm",
          ui.border,
        )}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm">
              AD
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-primary-dark sm:text-base">
                Panel administrativo
              </p>
              <p className="truncate text-xs text-muted">
                Cotizador Virtual · Cotízalo Antes
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className={joinClasses(
                "rounded-lg px-3 text-sm font-semibold sm:px-4",
                touchTarget,
                ui.ctaOutline,
              )}
            >
              Ir al cotizador
            </Link>

            {staffUser && isAdmin ? (
              <UserMenu
                fullName={staffUser.fullName}
                subtitle="Administrador"
              />
            ) : null}
          </div>
        </div>

        <nav
          className={joinClasses(
            "border-t bg-white px-4 sm:px-6 lg:px-8",
            ui.border,
          )}
          aria-label="Secciones administrativas"
        >
          <div
            className={joinClasses(
              horizontalScrollRail,
              "mx-auto flex max-w-7xl gap-1 py-2",
            )}
          >
            {navItems.map((item) => {
              const isActive = useTabNavigation && activeSection === item.id;

              if (!useTabNavigation) {
                return (
                  <Link
                    key={item.id}
                    href={ADMIN_HOME_PATH}
                    className={joinClasses(
                      "shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition",
                      joinClasses("text-muted", ui.hoverSurface),
                    )}
                  >
                    <span className="sm:hidden">{item.shortLabel}</span>
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSectionChange?.(item.id)}
                  className={joinClasses(
                    "shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : joinClasses("text-muted", ui.hoverSurface),
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="sm:hidden">{item.shortLabel}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}

            <Link
              href={ADMIN_USERS_PATH}
              className={joinClasses(
                "shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition",
                onUsersPage
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : joinClasses("text-muted", ui.hoverSurface),
              )}
              aria-current={onUsersPage ? "page" : undefined}
            >
              <span className="sm:hidden">Usuarios</span>
              <span className="hidden sm:inline">Usuarios</span>
            </Link>
          </div>
        </nav>
      </header>

      <main
        className={joinClasses(
          appShellScroll,
          safeWidth,
          "mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8",
        )}
      >
        {children}
      </main>
    </div>
  );
}
