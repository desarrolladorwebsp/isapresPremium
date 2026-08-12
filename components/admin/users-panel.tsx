"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  | "isapres"
  | "membresia_isapres_premium";

const INVITE_ROLE_OPTIONS: Array<{ value: InviteRoleValue; label: string }> = [
  { value: "admin", label: "Administrador" },
  { value: "isapres_premium", label: "Ejecutivo Isapres Premium" },
  { value: "zoom", label: "Ejecutivo Zoom" },
  { value: "isapres", label: "Ejecutivo Isapres" },
  {
    value: "membresia_isapres_premium",
    label: "Membresía Isapres Premium",
  },
];

const EXECUTIVE_KIND_OPTIONS: Array<{ value: ExecutiveKind; label: string }> = [
  { value: "ISAPRES_PREMIUM", label: "Ejecutivo Isapres Premium" },
  { value: "ZOOM", label: "Ejecutivo Zoom" },
  { value: "ISAPRES", label: "Ejecutivo Isapres" },
  {
    value: "MEMBRESIA_ISAPRES_PREMIUM",
    label: "Membresía Isapres Premium",
  },
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
    case "membresia_isapres_premium":
      return {
        realm: "executive",
        executiveKind: "MEMBRESIA_ISAPRES_PREMIUM",
      };
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
    case "membresia_isapres_premium":
      return "Solo cotizador. Sin acceso a clientes ni otras vistas del panel.";
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

function isMembershipDirectoryRow(row: ExecutiveDirectoryRow): boolean {
  const kind =
    row.kind === "invite" ? row.invite.executiveKind : row.account.executiveKind;
  return kind === "MEMBRESIA_ISAPRES_PREMIUM";
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

type UsersSortKey =
  | "usuario"
  | "rol"
  | "contacto"
  | "clientes"
  | "estado"
  | "acceso";

type SortDirection = "asc" | "desc";

type DirectoryGroup = "usuarios" | "membresia";

const DIRECTORY_GROUP_OPTIONS: Array<{ value: DirectoryGroup; label: string }> = [
  { value: "usuarios", label: "Usuarios" },
  { value: "membresia", label: "Membresía" },
];

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

function compareText(a: string, b: string): number {
  return a.localeCompare(b, "es", { sensitivity: "base", numeric: true });
}

function usersSortValue(
  row: ExecutiveDirectoryRow,
  key: UsersSortKey,
  assignmentCounts: Record<string, number>,
): string | number {
  if (row.kind === "invite") {
    switch (key) {
      case "usuario":
        return row.invite.email;
      case "rol":
        return getInviteRoleLabel(row.invite);
      case "contacto":
        return row.invite.email;
      case "clientes":
        return -1;
      case "estado":
        return "Pendiente por activar";
      case "acceso":
        return 0;
      default:
        return "";
    }
  }

  const { account } = row;
  switch (key) {
    case "usuario":
      return account.fullName || account.email;
    case "rol":
      return getAccountRoleLabel(account);
    case "contacto":
      return account.email;
    case "clientes":
      return account.onboardingCompleted && account.active
        ? assignmentCounts[account.id] ?? 0
        : -1;
    case "estado":
      return getAccountStatus(account).label;
    case "acceso":
      return account.lastLoginAt
        ? new Date(account.lastLoginAt).getTime()
        : 0;
    default:
      return "";
  }
}

function ActionIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function UsersIconButton({
  label,
  onClick,
  tone = "neutral",
  children,
}: {
  label: string;
  onClick: () => void;
  tone?: "neutral" | "danger" | "success";
  children: ReactNode;
}) {
  const toneClass =
    tone === "danger"
      ? "text-danger hover:bg-danger-muted"
      : tone === "success"
        ? "text-emerald-700 hover:bg-emerald-50"
        : "text-foreground hover:bg-surface-hover";

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={joinClasses(
        "group relative inline-flex size-9 items-center justify-center rounded-lg border bg-white transition",
        ui.border,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        toneClass,
      )}
    >
      {children}
      <span
        role="tooltip"
        className={joinClasses(
          "pointer-events-none absolute bottom-full right-0 z-20 mb-1.5 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold shadow-sm",
          "bg-[color:var(--dash-navy,#092558)] text-white",
          "opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
        )}
      >
        {label}
      </span>
    </button>
  );
}

function UsersDirectoryTable({
  rows,
  executivesOnly,
  canManage,
  assignmentCounts,
  sortProps,
  onResendInvite,
  onCancelInvite,
  onChangeRole,
  onToggleAssignments,
  onToggleActive,
  onDelete,
}: {
  rows: ExecutiveDirectoryRow[];
  executivesOnly: boolean;
  canManage: boolean;
  assignmentCounts: Record<string, number>;
  sortProps: (key: UsersSortKey) => {
    sortable: true;
    sortDirection: SortDirection | null;
    onSort: () => void;
  };
  onResendInvite: (inviteId: string) => void;
  onCancelInvite: (inviteId: string) => void;
  onChangeRole: (account: StaffAccountRecord) => void;
  onToggleAssignments: (account: StaffAccountRecord) => void;
  onToggleActive: (account: StaffAccountRecord) => void;
  onDelete: (account: StaffAccountRecord) => void;
}) {
  return (
    <AdminTable minWidth="56rem">
      <AdminTableHead>
        <tr>
          <AdminTableHeaderCell {...sortProps("usuario")}>
            Usuario
          </AdminTableHeaderCell>
          <AdminTableHeaderCell {...sortProps("rol")}>
            Rol
          </AdminTableHeaderCell>
          <AdminTableHeaderCell {...sortProps("contacto")}>
            Contacto
          </AdminTableHeaderCell>
          {executivesOnly ? (
            <AdminTableHeaderCell {...sortProps("clientes")}>
              Clientes
            </AdminTableHeaderCell>
          ) : null}
          <AdminTableHeaderCell {...sortProps("estado")}>
            Estado
          </AdminTableHeaderCell>
          <AdminTableHeaderCell {...sortProps("acceso")}>
            Último acceso
          </AdminTableHeaderCell>
          <AdminTableHeaderCell align="right">Acciones</AdminTableHeaderCell>
        </tr>
      </AdminTableHead>
      <AdminTableBody>
        {rows.map((row) => {
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
                    <AdminRowActions className="flex-nowrap justify-end">
                      <UsersIconButton
                        label="Reenviar invitación"
                        onClick={() => onResendInvite(invite.id)}
                      >
                        <ActionIcon>
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                          <path d="M3 7l9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
                        </ActionIcon>
                      </UsersIconButton>
                      <UsersIconButton
                        label="Cancelar invitación"
                        tone="danger"
                        onClick={() => onCancelInvite(invite.id)}
                      >
                        <ActionIcon>
                          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                        </ActionIcon>
                      </UsersIconButton>
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
                  <AdminRowActions className="flex-nowrap justify-end">
                    {account.realm === "executive" ? (
                      <UsersIconButton
                        label="Cambiar rol"
                        onClick={() => onChangeRole(account)}
                      >
                        <ActionIcon>
                          <path d="M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16" strokeLinecap="round" strokeLinejoin="round" />
                        </ActionIcon>
                      </UsersIconButton>
                    ) : null}
                    {account.realm === "executive" &&
                    account.active &&
                    account.onboardingCompleted ? (
                      <UsersIconButton
                        label={
                          account.assignmentsSuspended
                            ? "Reanudar asignaciones"
                            : "Suspender asignaciones"
                        }
                        onClick={() => onToggleAssignments(account)}
                      >
                        {account.assignmentsSuspended ? (
                          <ActionIcon>
                            <path d="M8 5v14l11-7-11-7z" strokeLinejoin="round" />
                          </ActionIcon>
                        ) : (
                          <ActionIcon>
                            <path d="M8 5v14M16 5v14" strokeLinecap="round" />
                          </ActionIcon>
                        )}
                      </UsersIconButton>
                    ) : null}
                    <UsersIconButton
                      label={
                        account.active ? "Suspender usuario" : "Reactivar usuario"
                      }
                      tone={account.active ? "neutral" : "success"}
                      onClick={() => onToggleActive(account)}
                    >
                      {account.active ? (
                        <ActionIcon>
                          <circle cx="12" cy="8" r="4" />
                          <path d="M4 21a8 8 0 0113.5-5.8M16 16l5 5M21 16l-5 5" strokeLinecap="round" />
                        </ActionIcon>
                      ) : (
                        <ActionIcon>
                          <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" strokeLinecap="round" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M16 11l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                        </ActionIcon>
                      )}
                    </UsersIconButton>
                    <UsersIconButton
                      label="Eliminar"
                      tone="danger"
                      onClick={() => onDelete(account)}
                    >
                      <ActionIcon>
                        <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12" strokeLinecap="round" strokeLinejoin="round" />
                      </ActionIcon>
                    </UsersIconButton>
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
  );
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
  const [directoryGroup, setDirectoryGroup] = useState<DirectoryGroup>("usuarios");
  const [sortKey, setSortKey] = useState<UsersSortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
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

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    const rows = [...filteredRows];
    const direction = sortDirection === "asc" ? 1 : -1;
    rows.sort((left, right) => {
      const a = usersSortValue(left, sortKey, assignmentCounts);
      const b = usersSortValue(right, sortKey, assignmentCounts);
      if (typeof a === "number" && typeof b === "number") {
        return (a - b) * direction;
      }
      return compareText(String(a), String(b)) * direction;
    });
    return rows;
  }, [filteredRows, sortKey, sortDirection, assignmentCounts]);

  const staffRows = useMemo(
    () => sortedRows.filter((row) => !isMembershipDirectoryRow(row)),
    [sortedRows],
  );
  const membershipRows = useMemo(
    () => sortedRows.filter(isMembershipDirectoryRow),
    [sortedRows],
  );
  const visibleRows =
    directoryGroup === "membresia" ? membershipRows : staffRows;

  function handleSort(nextKey: UsersSortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection(nextKey === "acceso" || nextKey === "clientes" ? "desc" : "asc");
  }

  function sortProps(key: UsersSortKey) {
    return {
      sortable: true as const,
      sortDirection: sortKey === key ? sortDirection : null,
      onSort: () => handleSort(key),
    };
  }

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
        compactMobile
        middle={
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13.5rem]">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, correo, RUT o teléfono…"
              className={joinClasses("h-11", ui.input)}
            />
            <Select
              aria-label="Ver usuarios o membresía"
              value={directoryGroup}
              options={DIRECTORY_GROUP_OPTIONS}
              onChange={(event) =>
                setDirectoryGroup(event.target.value as DirectoryGroup)
              }
              className={joinClasses("h-11", ui.input)}
            />
          </div>
        }
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
        empty={!loading && visibleRows.length === 0}
        emptyTitle={
          directoryRows.length === 0
            ? executivesOnly
              ? "No hay ejecutivos registrados"
              : "No hay usuarios registrados"
            : directoryGroup === "membresia"
              ? search.trim()
                ? "Sin coincidencias en membresía"
                : "No hay usuarios de membresía"
              : search.trim()
                ? "Sin coincidencias"
                : "No hay ejecutivos en esta lista"
        }
        emptyDescription={
          directoryRows.length === 0
            ? executivesOnly
              ? "Invita a un ejecutivo. Aparecerá como pendiente hasta que active su cuenta y complete su perfil."
              : "Invita a un administrador o ejecutivo. Aparecerán como pendientes hasta que activen su cuenta."
            : search.trim()
              ? "Prueba con otro nombre, correo, RUT o teléfono."
              : undefined
        }
        loadingMessage="Cargando usuarios…"
        footer={
          visibleRows.length > 0
            ? `Mostrando ${visibleRows.length} de ${directoryRows.length} registros.`
            : undefined
        }
      >
        <UsersDirectoryTable
          rows={visibleRows}
          executivesOnly={executivesOnly}
          canManage={canManage}
          assignmentCounts={assignmentCounts}
          sortProps={sortProps}
          onResendInvite={(id) => void handleResendPendingInvite(id)}
          onCancelInvite={(id) => void handleCancelPendingInvite(id)}
          onChangeRole={openRoleModal}
          onToggleAssignments={(account) => void handleToggleAssignments(account)}
          onToggleActive={(account) => void handleToggleActive(account)}
          onDelete={setDeleteTarget}
        />
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
              {roleDraft === "MEMBRESIA_ISAPRES_PREMIUM" ? (
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  Membresía solo usa el cotizador: se liberarán todos sus clientes y
                  cotizaciones asignadas, y no podrá recibir cartera.
                </p>
              ) : null}
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
