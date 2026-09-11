import type { ExecutiveAgendaStatItem } from "@/lib/client-pipeline/agenda-stats";
import {
  formatExecutiveOptionLabel,
  getStaffRoleLabel,
} from "@/lib/auth/staff-role";
import type { StaffAccountRecord, StaffRealm } from "@/types/staff-account";
import type { QuoteRecord } from "@/types/quote";
import type { UserRecord } from "@/types/user";

export const ADMIN_EXECUTIVE_FILTER_ALL = "";
export const ADMIN_EXECUTIVE_FILTER_UNASSIGNED = "__unassigned__";

export interface DashboardExecutiveOption {
  value: string;
  label: string;
  sortName: string;
}

export interface AgendaExecutiveGroup {
  key: string;
  responsibleId: string | null;
  name: string;
  roleLabel: string | null;
  count: number;
  items: ExecutiveAgendaStatItem[];
}

function isAllFilter(filterId: string | null | undefined): boolean {
  return !filterId;
}

function isUnassignedFilter(filterId: string | null | undefined): boolean {
  return filterId === ADMIN_EXECUTIVE_FILTER_UNASSIGNED;
}

export function filterClientsByExecutive(
  clients: UserRecord[],
  filterId: string | null | undefined,
): UserRecord[] {
  if (isAllFilter(filterId)) return clients;
  if (isUnassignedFilter(filterId)) {
    return clients.filter((client) => !client.assignedExecutiveId?.trim());
  }
  return clients.filter(
    (client) => client.assignedExecutiveId === filterId,
  );
}

export function filterQuotesByExecutive(
  quotes: QuoteRecord[],
  filterId: string | null | undefined,
): QuoteRecord[] {
  if (isAllFilter(filterId)) return quotes;
  if (isUnassignedFilter(filterId)) {
    return quotes.filter((quote) => !quote.executiveAccountId?.trim());
  }
  return quotes.filter((quote) => quote.executiveAccountId === filterId);
}

export function filterAgendaItemsByExecutive(
  items: ExecutiveAgendaStatItem[],
  filterId: string | null | undefined,
): ExecutiveAgendaStatItem[] {
  if (isAllFilter(filterId)) return items;
  if (isUnassignedFilter(filterId)) {
    return items.filter((item) => !item.responsibleId?.trim());
  }
  return items.filter((item) => item.responsibleId === filterId);
}

function optionLabel(input: {
  fullName: string;
  email?: string | null;
  executiveKind?: StaffAccountRecord["executiveKind"];
  realm?: StaffRealm;
}): string {
  const name = input.fullName.trim();
  if (input.realm === "admin" || input.executiveKind) {
    return formatExecutiveOptionLabel({
      fullName: name || (input.realm === "admin" ? "Administrador" : "Ejecutivo"),
      executiveKind: input.executiveKind,
      realm: input.realm ?? "executive",
    });
  }
  const email = input.email?.trim();
  const fallbackName = name || "Ejecutivo";
  return email ? `${fallbackName} · ${email}` : fallbackName;
}

/**
 * Opciones estables del select admin: Todos, Sin asignar y cada cuenta.
 * Completa con ejecutivos que aún tienen cartera aunque no vengan en el listado activo.
 */
export function buildAdminExecutiveFilterOptions(input: {
  accounts: StaffAccountRecord[];
  clients?: UserRecord[];
  selectedId?: string;
}): DashboardExecutiveOption[] {
  const byId = new Map<string, DashboardExecutiveOption>();

  for (const account of input.accounts) {
    const sortName = account.fullName.trim() || account.email;
    byId.set(account.id, {
      value: account.id,
      label: optionLabel({
        fullName: account.fullName,
        email: account.email,
        executiveKind: account.executiveKind,
        realm: account.realm,
      }),
      sortName,
    });
  }

  for (const client of input.clients ?? []) {
    const extras: Array<{
      id: string | null | undefined;
      name: string | null | undefined;
      kind: UserRecord["assignedExecutiveKind"];
    }> = [
      {
        id: client.assignedExecutiveId,
        name: client.assignedExecutiveName,
        kind: client.assignedExecutiveKind,
      },
      {
        id: client.trackingExecutiveId,
        name: client.trackingExecutiveName,
        kind: null,
      },
    ];
    for (const extra of extras) {
      const id = extra.id?.trim();
      if (!id || byId.has(id)) continue;
      const fullName = extra.name?.trim() || "Ejecutivo";
      byId.set(id, {
        value: id,
        label: optionLabel({
          fullName,
          executiveKind: extra.kind,
          realm: "executive",
        }),
        sortName: fullName,
      });
    }
  }

  if (input.selectedId && !isAllFilter(input.selectedId) && !isUnassignedFilter(input.selectedId) && !byId.has(input.selectedId)) {
    byId.set(input.selectedId, {
      value: input.selectedId,
      label: "Ejecutivo",
      sortName: "Ejecutivo",
    });
  }

  const executives = Array.from(byId.values()).sort((left, right) =>
    left.sortName.localeCompare(right.sortName, "es", { sensitivity: "base" }),
  );

  return [
    { value: ADMIN_EXECUTIVE_FILTER_ALL, label: "Todos", sortName: "" },
    {
      value: ADMIN_EXECUTIVE_FILTER_UNASSIGNED,
      label: "Sin asignar",
      sortName: "",
    },
    ...executives,
  ];
}

export function resolveAgendaExecutiveMeta(
  responsibleId: string | null,
  accountsById: Map<string, StaffAccountRecord>,
): { name: string | null; roleLabel: string | null } {
  if (!responsibleId) return { name: "Sin asignar", roleLabel: null };
  const account = accountsById.get(responsibleId);
  if (!account) return { name: null, roleLabel: null };
  return {
    name: account.fullName.trim() || account.email,
    roleLabel: getStaffRoleLabel({
      realm: account.realm,
      executiveKind: account.executiveKind,
    }),
  };
}

export function groupAgendaItemsByExecutive(
  items: ExecutiveAgendaStatItem[],
  accountsById?: Map<string, StaffAccountRecord>,
): AgendaExecutiveGroup[] {
  const order: string[] = [];
  const grouped = new Map<string, ExecutiveAgendaStatItem[]>();

  for (const item of items) {
    const key = item.responsibleId?.trim() || ADMIN_EXECUTIVE_FILTER_UNASSIGNED;
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      grouped.set(key, [item]);
      order.push(key);
    }
  }

  const groups = order.map((key) => {
    const groupItems = grouped.get(key) ?? [];
    const responsibleId =
      key === ADMIN_EXECUTIVE_FILTER_UNASSIGNED ? null : key;
    const resolved = accountsById
      ? resolveAgendaExecutiveMeta(responsibleId, accountsById)
      : { name: null, roleLabel: null };
    const first = groupItems[0];
    const name =
      resolved.name?.trim() ||
      first?.responsibleName?.trim() ||
      (responsibleId ? "Ejecutivo" : "Sin asignar");
    const roleLabel = responsibleId
      ? resolved.roleLabel?.trim() || first?.responsibleRole?.trim() || null
      : null;

    return {
      key,
      responsibleId,
      name,
      roleLabel,
      count: groupItems.length,
      items: groupItems,
    };
  });

  groups.sort((left, right) => {
    if (!left.responsibleId && right.responsibleId) return 1;
    if (left.responsibleId && !right.responsibleId) return -1;
    return left.name.localeCompare(right.name, "es", { sensitivity: "base" });
  });

  return groups;
}
