"use client";

import { useEffect, useRef, useState } from "react";
import { StaffAvatar } from "@/components/auth/staff-avatar";
import {
  AdminPanel,
  AdminPanelHeader,
} from "@/components/admin/admin-data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStaffSession } from "@/hooks/use-auth-session";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/constants";
import { sanitizeRutInput } from "@/lib/auth/rut";
import {
  removeStaffAvatar,
  uploadStaffAvatar,
  withAvatarCacheBust,
} from "@/lib/auth/staff-avatar-client";
import { getStaffRoleLabel } from "@/lib/auth/staff-role";
import type {
  AdminSessionUser,
  ExecutiveSessionUser,
} from "@/lib/auth/types";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1) ?? "",
  };
}

function sessionPhone(user: AdminSessionUser | ExecutiveSessionUser): string {
  return "phone" in user && user.phone ? user.phone : "";
}

function sessionRut(user: AdminSessionUser | ExecutiveSessionUser): string {
  return "rut" in user && user.rut ? user.rut : "";
}

export function ExecutiveProfilePanel({
  onNotify,
}: {
  onNotify: (message: string, tone?: "success" | "error") => void;
}) {
  const { user, realm, executiveKind, isAdmin, loading, refresh } =
    useStaffSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [rut, setRut] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!user) return;
    const names = splitFullName(user.fullName);
    setFirstName(names.firstName);
    setLastName(names.lastName);
    setPhone(sessionPhone(user));
    setRut(sessionRut(user));
    setAvatarUrl(user.avatarUrl);
  }, [user]);

  const roleLabel = getStaffRoleLabel({
    realm: realm ?? (isAdmin ? "admin" : "executive"),
    executiveKind,
  });

  async function handleAvatarChange(file: File) {
    setAvatarBusy(true);
    try {
      const url = withAvatarCacheBust(await uploadStaffAvatar(file));
      setAvatarUrl(url);
      await refresh();
      onNotify("Foto de perfil actualizada.");
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo subir la foto.",
        "error",
      );
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleRemoveAvatar() {
    setAvatarBusy(true);
    try {
      await removeStaffAvatar();
      setAvatarUrl(null);
      await refresh();
      onNotify("Foto de perfil eliminada.");
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo quitar la foto.",
        "error",
      );
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleSaveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/executive/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, phone, rut }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar el perfil.");
      }
      await refresh();
      onNotify("Perfil actualizado.");
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo guardar el perfil.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      onNotify("La confirmación no coincide con la nueva contraseña.", "error");
      return;
    }
    setPasswordSaving(true);
    try {
      const response = await fetch("/api/executive/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cambiar la contraseña.");
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onNotify("Contraseña actualizada.");
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar la contraseña.",
        "error",
      );
    } finally {
      setPasswordSaving(false);
    }
  }

  if (loading || !user) {
    return (
      <p className="py-16 text-center text-sm text-muted">Cargando perfil…</p>
    );
  }

  const displayName = `${firstName} ${lastName}`.trim() || user.fullName;

  return (
    <AdminPanel>
      <AdminPanelHeader
        title="Mi perfil"
        description="Puedes actualizar tus datos de contacto y tu foto. El correo no se puede cambiar."
      />

      <form
        className={joinClasses(
          "space-y-5 rounded-2xl border bg-white p-5 shadow-sm sm:p-6",
          ui.border,
        )}
        onSubmit={(event) => void handleSaveProfile(event)}
      >
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void handleAvatarChange(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarBusy}
            className="rounded-full disabled:opacity-60"
            title="Cambiar foto de perfil"
          >
            <StaffAvatar
              fullName={displayName}
              avatarUrl={avatarUrl}
              className={joinClasses(
                "size-16 border text-sm",
                ui.border,
                "bg-bg-layout text-muted",
              )}
            />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-medium">Foto de perfil</p>
            <p className="text-xs text-muted">JPG, PNG o WEBP de hasta 4 MB.</p>
            <div className="mt-1 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarBusy}
                className="text-xs font-semibold text-primary disabled:opacity-60"
              >
                {avatarBusy ? "Subiendo…" : avatarUrl ? "Cambiar foto" : "Subir foto"}
              </button>
              {avatarUrl ? (
                <button
                  type="button"
                  onClick={() => void handleRemoveAvatar()}
                  disabled={avatarBusy}
                  className="text-xs font-semibold text-muted disabled:opacity-60"
                >
                  Quitar foto
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Correo</span>
          <Input value={user.email} readOnly disabled />
          <p className="text-xs text-muted">
            El correo es el identificador de tu cuenta y no se puede modificar.
          </p>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Rol</span>
          <Input value={roleLabel} readOnly disabled />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Nombre</span>
            <Input
              required
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Apellido</span>
            <Input
              required
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium">RUT</span>
          <Input
            required={realm === "executive"}
            value={rut}
            onChange={(event) => setRut(sanitizeRutInput(event.target.value))}
            placeholder="12.345.678-9"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Teléfono de contacto</span>
          <Input
            required={realm === "executive"}
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+56 9 1234 5678"
          />
        </label>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving || avatarBusy}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>

      <form
        className={joinClasses(
          "space-y-5 rounded-2xl border bg-white p-5 shadow-sm sm:p-6",
          ui.border,
        )}
        onSubmit={(event) => void handleChangePassword(event)}
      >
        <div>
          <h3 className="text-base font-bold text-primary-dark">Contraseña</h3>
          <p className="mt-1 text-sm text-muted">
            Mínimo {PASSWORD_MIN_LENGTH} caracteres. Debes ingresar la contraseña actual.
          </p>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Contraseña actual</span>
          <Input
            required
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Nueva contraseña</span>
            <Input
              required
              type="password"
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Confirmar nueva</span>
            <Input
              required
              type="password"
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={passwordSaving}>
            {passwordSaving ? "Actualizando…" : "Cambiar contraseña"}
          </Button>
        </div>
      </form>
    </AdminPanel>
  );
}
