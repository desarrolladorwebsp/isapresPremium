"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useState, type ReactNode } from "react";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { performStaffLogout } from "@/lib/auth/client-logout";
import { STAFF_LOGIN_PATH } from "@/lib/auth/constants";
import type { StaffSection } from "@/lib/staff/staff-sections";
import { touchTarget, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

export interface ExecutiveNavItem {
  id: StaffSection;
  label: string;
  shortLabel: string;
  adminOnly?: boolean;
}

export interface ExecutiveMobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  navItems: ExecutiveNavItem[];
  activeSection: StaffSection;
  onSectionChange: (section: StaffSection) => void;
  sectionIcons?: Partial<Record<StaffSection, ReactNode>>;
  userFullName?: string | null;
  userSubtitle?: string | null;
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden>
      <path
        d="M8 8l8 8M16 8l-8 8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ExecutiveMobileNavDrawer({
  open,
  onClose,
  navItems,
  activeSection,
  onSectionChange,
  sectionIcons,
  userFullName,
  userSubtitle,
}: ExecutiveMobileNavDrawerProps) {
  useScrollLock(open);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSelect = (section: StaffSection) => {
    onSectionChange(section);
    onClose();
  };

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    await performStaffLogout(STAFF_LOGIN_PATH);
  }, []);

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.button
            key="executive-nav-backdrop"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-label="Cerrar menú de navegación"
            className="fixed inset-0 z-40 bg-[color:var(--dash-navy)]/40 backdrop-blur-[2px] lg:hidden"
            onClick={onClose}
          />
        ) : null}
      </AnimatePresence>

      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        initial={false}
        animate={{ x: open ? 0 : "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className={joinClasses(
          "premium-executive-mobile-nav fixed inset-y-0 right-0 z-50 flex w-[min(100%,18.5rem)] flex-col border-l shadow-xl lg:hidden",
          ui.border,
          !open && "pointer-events-none",
        )}
      >
        <div className="premium-executive-mobile-nav-header flex shrink-0 items-center justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0">
            <p className="premium-mobile-nav-title truncate text-sm font-bold">
              Menú
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={joinClasses(
              "inline-flex rounded-md text-white/80 transition hover:bg-white/10 hover:text-white",
              touchTarget,
            )}
            aria-label="Cerrar menú"
          >
            <CloseIcon />
          </button>
        </div>

        {userFullName ? (
          <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3.5">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--dash-cyan)] text-xs font-bold text-white"
              aria-hidden
            >
              {getInitials(userFullName)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[color:var(--dash-navy)]">
                {userFullName}
              </p>
              {userSubtitle ? (
                <p className="truncate text-xs text-muted">{userSubtitle}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        <nav
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3"
          aria-label="Secciones del panel"
        >
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={joinClasses(
                      "flex w-full items-center gap-2.5 rounded-md px-3.5 py-3 text-left text-sm font-semibold transition",
                      touchTarget,
                      isActive
                        ? "premium-executive-tab-active"
                        : "text-foreground hover:bg-[color:var(--dash-cyan)]/10 hover:text-[color:var(--dash-navy)]",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {sectionIcons?.[item.id] ?? null}
                    <span className="flex-1">{item.label}</span>
                    {item.adminOnly ? (
                      <span
                        className={joinClasses(
                          "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-[color:var(--dash-royal)]/10 text-[color:var(--dash-royal)]",
                        )}
                      >
                        Admin
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={joinClasses("shrink-0 space-y-2 border-t px-4 py-4", ui.border)}>
          <Link
            href="/"
            onClick={onClose}
            className={joinClasses(
              "flex w-full items-center justify-center rounded-md border-2 border-[color:var(--dash-cyan)] px-4 py-3 text-sm font-semibold text-[color:var(--dash-navy)] transition hover:bg-[color:var(--dash-cyan)]/10",
              touchTarget,
            )}
          >
            Cotizador público
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className={joinClasses(
              "flex w-full items-center justify-center rounded-md border border-border bg-white px-4 py-3 text-sm font-semibold text-[color:var(--dash-navy)] transition hover:bg-bg-layout disabled:cursor-not-allowed disabled:opacity-60",
              touchTarget,
            )}
          >
            {loggingOut ? "Saliendo…" : "Salir"}
          </button>
        </div>
      </motion.aside>
    </>
  );
}

export function ExecutiveMenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="size-5"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M4 7h16M4 12h16M4 17h10" strokeLinecap="round" />
    </svg>
  );
}
