"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  AdminBadge,
  AdminFormModal,
  AdminPanel,
  AdminPanelHeader,
  AdminRefreshButton,
  AdminRowActions,
  AdminTable,
  AdminTableBody,
  AdminTableCard,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  AdminToolbar,
} from "@/components/admin/admin-data-table";
import {
  cancelPendingStaffInvite,
  createStaffAccount,
  deleteStaffAccount,
  fetchExecutiveAssignmentStats,
  fetchStaffAccounts,
  resendPendingStaffInvite,
  updateStaffAccount,
} from "@/lib/api/admin-client";
import { getStaffRoleLabel } from "@/lib/auth/staff-role";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type {
  ExecutiveKind,
  PendingStaffInviteRecord,
  StaffAccountRecord,
  StaffRealm,
} from "@/types/staff-account";

type InviteRoleValue =
  | "admin"
  | "isapres_premium"
  | "zoom"
  | "isapres";

const INVITE_ROLE_OPTIONS: Array<{ value: InviteRoleValue; label: string }> = [
  { value: "admin", label: "Administrador" },
  { value: "isapres_premium", label: "Ejecutivo Isapres Premium" },
  { value: "zoom", label: "Ejecutivo Zoom" },
  { value: "isapres", label: "Ejecutivo Isapres" },
];

const EXECUTIVE_KIND_OPTIONS: Array<{ value: ExecutiveKind; label: string }> = [
  { value: "ISAPRES_PREMIUM", label: "Ejecutivo Isapres Premium" },
  { value: "ZOOM", label: "Ejecutivo Zoom" },
  { value: "ISAPRES", label: "Ejecutivo Isapres" },
];

function inviteRoleToCreateInput(value: InviteRoleValue): {
  realm: StaffRealm;
  executiveKind: ExecutiveKind | null;
} {
  switch (value) {
    case "admin":
      return { realm: "admin", executiveKind: null };
    case "zoom":
      return { realm: "executive", executiveKind: "ZOOM" };
    case "isapres":
      return { realm: "executive", executiveKind: "ISAPRES" };
    case "isapres_premium":
    default:
      return { realm: "executive", executiveKind: "ISAPRES_PREMIUM" };
  }
}

function inviteRoleDescription(value: InviteRoleValue): string {
  switch (value) {
    case "admin":
      return "Acceso completo al panel, incluyendo configuración y usuarios.";
    case "isapres_premium":
      return "Dashboard, clientes asignados, cotizador y mapa de clínicas.";
    case "zoom":
    case "isapres":
      return "Solo dashboard y clientes asignados.";
  }
}

function getAccountRoleLabel(account: StaffAccountRecord): string {
  return getStaffRoleLabel({
    realm: account.realm,
    executiveKind: account.executiveKind,
  });
}

function getInviteRoleLabel(invite: PendingStaffInviteRecord): string {
  return getStaffRoleLabel({
    realm: invite.realm,
    executiveKind: invite.executiveKind,
  });
}

export interface UsersPanelProps {
  onNotify: (message: string, tone?: "success" | "error") => void;
  /** Si true, muestra solo ejecutivos (vista principal de Usuarios). */
  executivesOnly?: boolean;
  /** Si false, oculta acciones de gestión (invitar, suspender, eliminar). */
  canManage?: boolean;
}

type ExecutiveDirectoryRow =
  | { kind: "account"; account: StaffAccountRecord; sortAt: string }
  | { kind: "invite"; invite: PendingStaffInviteRecord; sortAt: string };

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getAccountStatus(account: StaffAccountRecord): {
  label: string;
  tone: "success" | "warning" | "neutral";
} {
  if (!account.active) {
    return { label: "Usuario suspendido", tone: "neutral" };
  }
  if (account.realm === "executive" && !account.onboardingCompleted) {
    return { label: "Perfil pendiente", tone: "warning" };
  }
  if (account.realm === "executive" && account.assignmentsSuspended) {
    return { label: "Sin nuevas asignaciones", tone: "warning" };
  }
  if (account.mustChangePassword) {
    return { label: "Contraseña pendiente", tone: "warning" };
  }
  return { label: "Activo", tone: "success" };
}

export function UsersPanel({
  onNotify,
  executivesOnly = false,
  canManage = true,
}: UsersPanelProps) {
  const [accounts, setAccounts] = useState<StaffAccountRecord[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingStaffInviteRecord[]>([]);
  const [assignmentCounts, setAssignmentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffAccountRecord | null>(null);
  const [roleTarget, setRoleTarget] = useState<StaffAccountRecord | null>(null);
  const [roleDraft, setRoleDraft] = useState<ExecutiveKind>("ISAPRES_PREMIUM");
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<{
    email: string;
    role: InviteRoleValue;
  }>({ email: "", role: "isapres_premium" });

  async function loadAccounts() {
    setLoading(true);
    setLoadError(null);
    try {
      const [data, stats] = await Promise.all([
        fetchStaffAccounts(),
        fetchExecutiveAssignmentStats().catch(() => []),
      ]);
      const filteredAccounts = executivesOnly
        ? data.accounts.filter((account) => account.realm === "executive")
        : data.accounts;
      const filteredInvites = executivesOnly
        ? data.pendingInvites.filter((invite) => invite.realm === "executive")
        : data.pendingInvites;

      setAccounts(filteredAccounts);
      setPendingInvites(filteredInvites);
      setAssignmentCounts(
        Object.fromEntries(stats.map((stat) => [stat.executiveId, stat.assignedCount])),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudieron cargar los usuarios.";
      setLoadError(message);
      setAccounts([]);
      setPendingInvites([]);
      onNotify(message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAccounts();
  }, [executivesOnly]);

  const directoryRows = useMemo(() => {
    const rows: ExecutiveDirectoryRow[] = [
      ...accounts.map(
        (account): ExecutiveDirectoryRow => ({
          kind: "account",
          account,
          sortAt: account.createdAt,
        }),
      ),
      ...pendingInvites.map(
        (invite): ExecutiveDirectoryRow => ({
          kind: "invite",
          invite,
          sortAt: invite.createdAt,
        }),
      ),
    ];

    return rows.sort(
      (a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime(),
    );
  }, [accounts, pendingInvites]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return directoryRows.filter((row) => {
      if (!query) return true;

      const values =
        row.kind === "account"
          ? [
              row.account.fullName,
              row.account.email,
              row.account.phone,
              row.account.rut,
              getAccountRoleLabel(row.account),
            ]
          : [
              row.invite.email,
              row.invite.rut,
              getInviteRoleLabel(row.invite),
            ];

      return values
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [directoryRows, search]);

  function openModal() {
    setDraft({ email: "", role: "isapres_premium" });
    setModalOpen(true);
  }

  function openRoleModal(account: StaffAccountRecord) {
    setRoleTarget(account);
    setRoleDraft(account.executiveKind ?? "ISAPRES_PREMIUM");
  }

  const inviteRoleOptions = executivesOnly
    ? INVITE_ROLE_OPTIONS.filter((option) => option.value !== "admin")
    : [...INVITE_ROLE_OPTIONS];

  const panelDescription = executivesOnly
    ? "Ejecutivos que reciben solicitudes de clientes. La invitación por correo es el único medio para crear un usuario en el sistema."
    : "Administradores y ejecutivos del panel. La invitación por correo es el único medio para crear un usuario en el sistema.";

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    try {
      const { realm, executiveKind } = inviteRoleToCreateInput(draft.role);
      const result = await createStaffAccount({
        realm,
        executiveKind,
        email: draft.email.trim(),
      });

      setPendingInvites((current) => {
        const withoutDuplicate = current.filter(
          (invite) => invite.email !== result.pendingInvite.email,
        );
        return [result.pendingInvite, ...withoutDuplicate];
      });

      onNotify(result.message);
      setModalOpen(false);
      await loadAccounts();
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo enviar la invitación.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeRole() {
    if (!roleTarget || roleTarget.realm !== "executive") return;

    setSaving(true);
    try {
      await updateStaffAccount(roleTarget.realm, roleTarget.id, {
        executiveKind: roleDraft,
      });
      onNotify(
        `Rol actualizado a ${getStaffRoleLabel({
          realm: "executive",
          executiveKind: roleDraft,
        })}.`,
      );
      setRoleTarget(null);
      await loadAccounts();
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo cambiar el rol.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAssignments(account: StaffAccountRecord) {
    try {
      await updateStaffAccount(account.realm, account.id, {
        assignmentsSuspended: !account.assignmentsSuspended,
      });
      onNotify(
        account.assignmentsSuspended
          ? "El ejecutivo volverá a recibir nuevas solicitudes."
          : "Asignaciones suspendidas. El ejecutivo conserva acceso al panel.",
      );
      await loadAccounts();
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo actualizar el usuario.",
        "error",
      );
    }
  }

  async function handleToggleActive(account: StaffAccountRecord) {
    try {
      await updateStaffAccount(account.realm, account.id, {
        active: !account.active,
      });
      onNotify(
        account.active
          ? "Usuario suspendido. Ya no puede ingresar al sistema."
          : "Usuario reactivado.",
      );
      await loadAccounts();
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo actualizar el usuario.",
        "error",
      );
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setSaving(true);
    try {
      const result = await deleteStaffAccount(deleteTarget.realm, deleteTarget.id);
      onNotify(result.message);
      setDeleteTarget(null);
      await loadAccounts();
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo eliminar el usuario.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelPendingInvite(inviteId: string) {
    try {
      const result = await cancelPendingStaffInvite(inviteId);
      setPendingInvites((current) =>
        current.filter((invite) => invite.id !== inviteId),
      );
      onNotify(result.message);
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo cancelar la invitación.",
        "error",
      );
    }
  }

  async function handleResendPendingInvite(inviteId: string) {
    try {
      const result = await resendPendingStaffInvite(inviteId);
      onNotify(result.message);
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo reenviar la invitación.",
        "error",
      );
    }
  }

  return (
    <AdminPanel>
      <AdminPanelHeader
        title="Usuarios"
        description={panelDescription}
        actions={
          <>
            <AdminRefreshButton onClick={() => void loadAccounts()} />
            {canManage ? (
              <Button size="sm" onClick={openModal}>
                {executivesOnly ? "Invitar ejecutivo" : "Invitar usuario"}
              </Button>
            ) : null}
          </>
        }
      />

      <AdminToolbar>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre, correo, RUT o teléfono…"
          className={joinClasses("h-11", ui.input)}
        />
      </AdminToolbar>

      {loadError ? (
        <div
          className={joinClasses(
            "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800",
          )}
        >
          {loadError}
        </div>
      ) : null}

      <AdminTableCard
        loading={loading}
        empty={!loading && filteredRows.length === 0}
        emptyTitle={executivesOnly ? "No hay ejecutivos registrados" : "No hay usuarios registrados"}
        emptyDescription={
          executivesOnly
            ? "Invita a un ejecutivo. Aparecerá como pendiente hasta que active su cuenta y complete su perfil."
            : "Invita a un administrador o ejecutivo. Aparecerán como pendientes hasta que activen su cuenta."
        }
        loadingMessage="Cargando usuarios…"
        footer={`Mostrando ${filteredRows.length} de ${directoryRows.length} registros.`}
      >
        <AdminTable minWidth="56rem">
          <AdminTableHead>
            <tr>
              <AdminTableHeaderCell>Usuario</AdminTableHeaderCell>
              <AdminTableHeaderCell>Rol</AdminTableHeaderCell>
              <AdminTableHeaderCell>Contacto</AdminTableHeaderCell>
              {executivesOnly ? (
                <AdminTableHeaderCell>Clientes</AdminTableHeaderCell>
              ) : null}
              <AdminTableHeaderCell>Estado</AdminTableHeaderCell>
              <AdminTableHeaderCell>Último acceso</AdminTableHeaderCell>
              <AdminTableHeaderCell align="right">Acciones</AdminTableHeaderCell>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {filteredRows.map((row) => {
              if (row.kind === "invite") {
                const { invite } = row;

                return (
                  <AdminTableRow key={`invite-${invite.id}`}>
                    <AdminTableCell>
                      <p className="font-semibold text-foreground">{invite.email}</p>
                      <p className="mt-1 text-xs text-muted">
                        Invitado {formatDate(invite.createdAt)}
                      </p>
                    </AdminTableCell>
                    <AdminTableCell>
                      <AdminBadge tone="neutral">{getInviteRoleLabel(invite)}</AdminBadge>
                    </AdminTableCell>
                    <AdminTableCell>
                      <p>{invite.email}</p>
                      {invite.rut ? (
                        <p className="mt-1 text-xs text-muted">RUT {invite.rut}</p>
                      ) : null}
                    </AdminTableCell>
                    {executivesOnly ? (
                      <AdminTableCell className="text-muted">—</AdminTableCell>
                    ) : null}
                    <AdminTableCell>
                      <AdminBadge tone="warning">Pendiente por activar</AdminBadge>
                      <p className="mt-2 text-xs text-muted">
                        Debe crear su cuenta desde el correo · expira {formatDate(invite.expiresAt)}
                      </p>
                    </AdminTableCell>
                    <AdminTableCell className="text-muted">—</AdminTableCell>
                    <AdminTableCell align="right">
                      {canManage ? (
                        <AdminRowActions>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => void handleResendPendingInvite(invite.id)}
                          >
                            Reenviar invitación
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => void handleCancelPendingInvite(invite.id)}
                          >
                            Cancelar
                          </Button>
                        </AdminRowActions>
                      ) : (
                        <span className="text-xs text-muted">Esperando activación</span>
                      )}
                    </AdminTableCell>
                  </AdminTableRow>
                );
              }

              const { account } = row;
              const status = getAccountStatus(account);

              return (
                <AdminTableRow key={account.id}>
                  <AdminTableCell>
                    <p className="font-semibold text-foreground">
                      {account.fullName}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Registrado {formatDate(account.createdAt)}
                    </p>
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminBadge tone="neutral">{getAccountRoleLabel(account)}</AdminBadge>
                  </AdminTableCell>
                  <AdminTableCell>
                    <p>{account.email}</p>
                    {account.phone ? (
                      <p className="mt-1 text-xs text-muted">{account.phone}</p>
                    ) : null}
                    {account.rut ? (
                      <p className="mt-1 text-xs text-muted">RUT {account.rut}</p>
                    ) : null}
                  </AdminTableCell>
                  {executivesOnly ? (
                    <AdminTableCell>
                      {account.onboardingCompleted && account.active ? (
                        <span className="font-semibold text-foreground">
                          {assignmentCounts[account.id] ?? 0}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </AdminTableCell>
                  ) : null}
                  <AdminTableCell>
                    <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
                  </AdminTableCell>
                  <AdminTableCell className="text-muted">
                    {formatDate(account.lastLoginAt)}
                  </AdminTableCell>
                  <AdminTableCell align="right">
                    {canManage ? (
                      <AdminRowActions>
                        {account.realm === "executive" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => openRoleModal(account)}
                          >
                            Cambiar rol
                          </Button>
                        ) : null}
                        {account.realm === "executive" &&
                        account.active &&
                        account.onboardingCompleted ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => void handleToggleAssignments(account)}
                          >
                            {account.assignmentsSuspended
                              ? "Reanudar asignaciones"
                              : "Suspender asignaciones"}
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant={account.active ? "ghost" : "secondary"}
                          onClick={() => void handleToggleActive(account)}
                        >
                          {account.active ? "Suspender usuario" : "Reactivar usuario"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          onClick={() => setDeleteTarget(account)}
                        >
                          Eliminar
                        </Button>
                      </AdminRowActions>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </AdminTableCell>
                </AdminTableRow>
              );
            })}
          </AdminTableBody>
        </AdminTable>
      </AdminTableCard>

      {canManage ? (
        <AdminFormModal
          open={modalOpen}
          title={executivesOnly ? "Invitar ejecutivo" : "Invitar usuario"}
        description="Se enviará un correo con un enlace único. La persona activará la cuenta, ingresará su RUT y creará su contraseña."
        onClose={() => setModalOpen(false)}
        size="md"
      >
        <form className="space-y-4" onSubmit={handleInvite}>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Rol</span>
            <Select
              required
              value={draft.role}
              options={inviteRoleOptions}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  role: event.target.value as InviteRoleValue,
                }))
              }
            />
            <p className="text-xs text-muted">{inviteRoleDescription(draft.role)}</p>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Correo electrónico</span>
            <Input
              type="email"
              required
              value={draft.email}
              onChange={(event) =>
                setDraft((current) => ({ ...current, email: event.target.value }))
              }
            />
          </label>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Enviando…" : "Enviar invitación"}
            </Button>
          </div>
        </form>
      </AdminFormModal>
      ) : null}

      {canManage ? (
        <AdminFormModal
          open={Boolean(roleTarget)}
          title="Cambiar rol de ejecutivo"
          description={
            roleTarget
              ? `Selecciona el tipo de ejecutivo para ${roleTarget.fullName}. El menú del panel se actualizará en el próximo inicio de sesión o al recargar.`
              : ""
          }
          onClose={() => setRoleTarget(null)}
          size="md"
        >
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Tipo de ejecutivo</span>
              <Select
                required
                value={roleDraft}
                options={EXECUTIVE_KIND_OPTIONS}
                onChange={(event) =>
                  setRoleDraft(event.target.value as ExecutiveKind)
                }
              />
              <p className="text-xs text-muted">
                La promoción o degradación a administrador no está disponible desde aquí
                (requiere nueva invitación de administrador).
              </p>
            </label>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => setRoleTarget(null)}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={saving || roleDraft === roleTarget?.executiveKind}
                onClick={() => void handleChangeRole()}
              >
                {saving ? "Guardando…" : "Guardar rol"}
              </Button>
            </div>
          </div>
        </AdminFormModal>
      ) : null}

      {canManage ? (
        <AdminFormModal
          open={Boolean(deleteTarget)}
          title="Eliminar usuario"
        description={
          deleteTarget
            ? `¿Eliminar permanentemente a ${deleteTarget.fullName} (${getAccountRoleLabel(deleteTarget)})? Esta acción no se puede deshacer.`
            : ""
        }
        onClose={() => setDeleteTarget(null)}
        size="md"
      >
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={saving}
            onClick={() => void handleDelete()}
          >
            {saving ? "Eliminando…" : "Eliminar definitivamente"}
          </Button>
        </div>
      </AdminFormModal>
      ) : null}
    </AdminPanel>
  );
}
