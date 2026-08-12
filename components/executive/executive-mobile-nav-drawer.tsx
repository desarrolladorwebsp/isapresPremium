"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { StaffAvatar } from "@/components/auth/staff-avatar";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { performStaffLogout } from "@/lib/auth/client-logout";
import { STAFF_LOGIN_PATH } from "@/lib/auth/constants";
import {
  uploadStaffAvatar,
  withAvatarCacheBust,
} from "@/lib/auth/staff-avatar-client";
import type { StaffNavEntry } from "@/lib/staff/staff-nav";
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
  navEntries: StaffNavEntry[];
  navItems: ExecutiveNavItem[];
  activeSection: StaffSection;
  onSectionChange: (section: StaffSection) => void;
  sectionIcons?: Partial<Record<StaffSection, ReactNode>>;
  userFullName?: string | null;
  userSubtitle?: string | null;
  userAvatarUrl?: string | null;
}

function MobileNavButton({
  item,
  active,
  icon,
  onSelect,
}: {
  item: ExecutiveNavItem;
  active: boolean;
  icon?: ReactNode;
  onSelect: (section: StaffSection) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={joinClasses(
        "flex w-full items-center gap-2.5 rounded-md px-3.5 py-3 text-left text-sm font-semibold transition",
        touchTarget,
        active
          ? "premium-executive-tab-active"
          : "text-foreground hover:bg-[color:var(--dash-cyan)]/10 hover:text-[color:var(--dash-navy)]",
      )}
      aria-current={active ? "page" : undefined}
    >
      {icon ?? null}
      <span className="flex-1">{item.label}</span>
    </button>
  );
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
  navEntries,
  navItems,
  activeSection,
  onSectionChange,
  sectionIcons,
  userFullName,
  userSubtitle,
  userAvatarUrl,
}: ExecutiveMobileNavDrawerProps) {
  useScrollLock(open);
  const [loggingOut, setLoggingOut] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(userAvatarUrl ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePickPhoto = useCallback(() => {
    if (avatarBusy) return;
    fileInputRef.current?.click();
  }, [avatarBusy]);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      setAvatarBusy(true);
      try {
        const url = withAvatarCacheBust(await uploadStaffAvatar(file));
        setCurrentAvatarUrl(url);
      } catch (error) {
        window.alert(
          error instanceof Error ? error.message : "No se pudo subir la foto.",
        );
      } finally {
        setAvatarBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    setCurrentAvatarUrl(userAvatarUrl ?? null);
  }, [userAvatarUrl]);

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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => void handleFileChange(event)}
            />
            <button
              type="button"
              onClick={handlePickPhoto}
              disabled={avatarBusy}
              title="Cambiar foto de perfil"
              className="shrink-0 rounded-full disabled:opacity-60"
            >
              <StaffAvatar
                fullName={userFullName}
                avatarUrl={currentAvatarUrl}
                className="flex size-10 items-center justify-center bg-[color:var(--dash-cyan)] text-white"
              />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[color:var(--dash-navy)]">
                {userFullName}
              </p>
              {userSubtitle ? (
                <p className="truncate text-xs text-muted">{userSubtitle}</p>
              ) : null}
              <p className="mt-0.5 text-[11px] text-muted">
                {avatarBusy ? "Subiendo foto…" : "Toca la foto para cambiarla"}
              </p>
            </div>
          </div>
        ) : null}

        <nav
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3"
          aria-label="Secciones del panel"
        >
          <ul className="space-y-1">
            {navEntries.map((entry) => {
              if (entry.kind === "group") {
                return (
                  <li key={entry.id} className="pt-2">
                    <p className="px-3.5 pb-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                      {entry.label}
                    </p>
                    <ul className="space-y-1">
                      {entry.sections.map((sectionId) => {
                        const item = navItems.find((navItem) => navItem.id === sectionId);
                        if (!item) return null;
                        return (
                          <li key={sectionId}>
                            <MobileNavButton
                              item={item}
                              active={activeSection === sectionId}
                              icon={sectionIcons?.[sectionId]}
                              onSelect={handleSelect}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              }

              const item = navItems.find((navItem) => navItem.id === entry.id);
              if (!item) return null;

              return (
                <li key={entry.id}>
                  <MobileNavButton
                    item={item}
                    active={activeSection === entry.id}
                    icon={sectionIcons?.[entry.id]}
                    onSelect={handleSelect}
                  />
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={joinClasses("shrink-0 space-y-2 border-t px-4 py-4", ui.border)}>
          <button
            type="button"
            onClick={() => handleSelect("perfil")}
            className={joinClasses(
              "flex w-full items-center justify-center rounded-md border px-4 py-3 text-sm font-semibold text-[color:var(--dash-navy)] transition hover:bg-bg-layout",
              ui.border,
              touchTarget,
              activeSection === "perfil" && "premium-executive-tab-active",
            )}
          >
            Mi perfil
          </button>
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
