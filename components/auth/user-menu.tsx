"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { StaffAvatar } from "@/components/auth/staff-avatar";
import { performStaffLogout } from "@/lib/auth/client-logout";
import { STAFF_LOGIN_PATH } from "@/lib/auth/constants";
import { staffSectionHref } from "@/lib/staff/staff-sections";
import {
  removeStaffAvatar,
  uploadStaffAvatar,
  withAvatarCacheBust,
} from "@/lib/auth/staff-avatar-client";
import { touchTarget, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

export type UserMenuMode = "inline" | "dropdown";

export interface UserMenuProps {
  fullName: string;
  subtitle: string;
  avatarUrl?: string | null;
  loginPath?: string;
  /** Vista compacta para cabeceras móviles del panel ejecutivo. */
  compact?: boolean;
  /** Texto claro sobre header navy del panel ejecutivo. */
  onDark?: boolean;
  /**
   * `inline` (default): nombre + avatar + botón Salir.
   * `dropdown`: trigger clickeable con menú (cotizador público + cerrar sesión).
   */
  menuMode?: UserMenuMode;
  /** Ruta del cotizador público en modo dropdown. */
  publicCotizadorHref?: string;
  /** Ruta de la vista de perfil. */
  profileHref?: string;
  /** Permite cambiar o quitar la foto de perfil. */
  allowAvatarUpload?: boolean;
  onAvatarUpdated?: (avatarUrl: string | null) => void;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={joinClasses(
        "size-3.5 shrink-0 transition-transform",
        open && "rotate-180",
      )}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function UserMenu({
  fullName,
  subtitle,
  avatarUrl = null,
  loginPath = STAFF_LOGIN_PATH,
  compact = false,
  onDark = false,
  menuMode = "inline",
  publicCotizadorHref = "/",
  profileHref = staffSectionHref("perfil"),
  allowAvatarUpload = true,
  onAvatarUpdated,
}: UserMenuProps) {
  const [loading, setLoading] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuId = useId();

  useEffect(() => {
    setCurrentAvatarUrl(avatarUrl);
  }, [avatarUrl]);

  useEffect(() => {
    if (!menuOpen || menuMode !== "dropdown") return;

    function handlePointerDown(event: MouseEvent) {
      const root = rootRef.current;
      if (!root || root.contains(event.target as Node)) return;
      setMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuMode, menuOpen]);

  const handleLogout = useCallback(async () => {
    setLoading(true);
    setMenuOpen(false);
    await performStaffLogout(loginPath);
  }, [loginPath]);

  const handlePickPhoto = useCallback(() => {
    if (!allowAvatarUpload || avatarBusy) return;
    fileInputRef.current?.click();
  }, [allowAvatarUpload, avatarBusy]);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      setAvatarBusy(true);
      try {
        const url = withAvatarCacheBust(await uploadStaffAvatar(file));
        setCurrentAvatarUrl(url);
        onAvatarUpdated?.(url);
      } catch (error) {
        window.alert(
          error instanceof Error ? error.message : "No se pudo subir la foto.",
        );
      } finally {
        setAvatarBusy(false);
      }
    },
    [onAvatarUpdated],
  );

  const handleRemovePhoto = useCallback(async () => {
    if (!currentAvatarUrl || avatarBusy) return;
    setAvatarBusy(true);
    try {
      await removeStaffAvatar();
      setCurrentAvatarUrl(null);
      onAvatarUpdated?.(null);
      setMenuOpen(false);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "No se pudo quitar la foto.",
      );
    } finally {
      setAvatarBusy(false);
    }
  }, [avatarBusy, currentAvatarUrl, onAvatarUpdated]);

  const avatarClassName = joinClasses(
    compact
      ? "flex size-9 items-center justify-center"
      : joinClasses(touchTarget, "md:size-10"),
    !onDark && joinClasses("text-muted", ui.borderHairline),
  );

  const fileInput = allowAvatarUpload ? (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      className="sr-only"
      onChange={(event) => void handleFileChange(event)}
    />
  ) : null;

  const menuItemClass = (extra?: string) =>
    joinClasses(
      "premium-user-menu-item flex w-full items-center px-3 py-2.5 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
      onDark
        ? "text-white hover:bg-white/10"
        : "text-foreground hover:bg-surface-hover",
      extra,
    );

  if (menuMode === "dropdown") {
    return (
      <div
        ref={rootRef}
        className={joinClasses(
          "relative ml-auto",
          onDark && "premium-executive-user-on-dark",
        )}
      >
        {fileInput}
        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          className={joinClasses(
            "premium-user-menu-trigger flex items-center rounded-lg transition",
            compact ? "gap-1.5 px-1.5 py-1" : "gap-2 px-2 py-1.5",
            onDark
              ? "hover:bg-white/10"
              : joinClasses("hover:bg-surface-hover", ui.borderHairline),
          )}
        >
          <div className="hidden min-w-0 text-right sm:block">
            <p
              className={joinClasses(
                "premium-user-name truncate text-sm font-semibold tracking-tight",
                onDark ? "" : "font-medium text-foreground",
              )}
            >
              {fullName}
            </p>
            <p
              className={joinClasses(
                "premium-user-subtitle truncate text-xs",
                onDark ? "" : "text-muted",
              )}
            >
              {subtitle}
            </p>
          </div>

          <StaffAvatar
            fullName={fullName}
            avatarUrl={currentAvatarUrl}
            className={avatarClassName}
          />

          <ChevronIcon open={menuOpen} />
        </button>

        {menuOpen ? (
          <div
            id={menuId}
            role="menu"
            aria-label="Menú de usuario"
            className={joinClasses(
              "premium-user-menu-dropdown absolute right-0 z-50 mt-1.5 min-w-[12.5rem] overflow-hidden rounded-lg border py-1 shadow-lg",
              onDark
                ? "border-white/15 bg-[color:var(--dash-navy)]"
                : joinClasses("bg-white", ui.border),
            )}
          >
            {allowAvatarUpload ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handlePickPhoto}
                  disabled={avatarBusy}
                  className={menuItemClass()}
                >
                  {avatarBusy
                    ? "Subiendo…"
                    : currentAvatarUrl
                      ? "Cambiar foto"
                      : "Agregar foto"}
                </button>
                {currentAvatarUrl ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleRemovePhoto()}
                    disabled={avatarBusy}
                    className={menuItemClass()}
                  >
                    Quitar foto
                  </button>
                ) : null}
              </>
            ) : null}
            <Link
              href={profileHref}
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className={menuItemClass()}
            >
              Mi perfil
            </Link>
            <Link
              href={publicCotizadorHref}
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className={menuItemClass()}
            >
              Cotizador público
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => void handleLogout()}
              disabled={loading}
              className={menuItemClass()}
            >
              {loading ? "Cerrando…" : "Cerrar sesión"}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={joinClasses(
        "ml-auto flex items-center",
        compact ? "gap-1.5" : "gap-2 sm:gap-3",
        onDark && "premium-executive-user-on-dark",
      )}
    >
      {fileInput}
      <div className="hidden text-right sm:block">
        <p
          className={joinClasses(
            "premium-user-name text-sm font-semibold tracking-tight",
            onDark ? "" : "text-foreground font-medium",
          )}
        >
          {fullName}
        </p>
        <p
          className={joinClasses(
            "premium-user-subtitle text-xs",
            onDark ? "" : "text-muted",
          )}
        >
          {subtitle}
        </p>
      </div>

      {allowAvatarUpload ? (
        <button
          type="button"
          onClick={handlePickPhoto}
          disabled={avatarBusy}
          title={currentAvatarUrl ? "Cambiar foto de perfil" : "Agregar foto de perfil"}
          className="rounded-full disabled:opacity-60"
        >
          <StaffAvatar
            fullName={fullName}
            avatarUrl={currentAvatarUrl}
            className={avatarClassName}
          />
        </button>
      ) : (
        <StaffAvatar
          fullName={fullName}
          avatarUrl={currentAvatarUrl}
          className={avatarClassName}
        />
      )}

      <Link
        href={profileHref}
        className={joinClasses(
          "premium-user-logout font-semibold transition",
          compact ? "px-2.5 py-2 text-[11px]" : "px-3 py-2 text-xs",
          !onDark &&
            joinClasses(
              "rounded-lg text-muted",
              ui.borderHairline,
              ui.hoverSurface,
            ),
        )}
      >
        Perfil
      </Link>

      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={loading}
        className={joinClasses(
          "premium-user-logout font-semibold transition",
          compact ? "px-2.5 py-2 text-[11px]" : "px-3 py-2 text-xs",
          !onDark &&
            joinClasses(
              "rounded-lg text-muted",
              ui.borderHairline,
              ui.hoverSurface,
            ),
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        {loading ? "..." : "Salir"}
      </button>
    </div>
  );
}
