import { prisma } from "@/lib/prisma";
import { isExecutiveSubscriptionAllowingAccess } from "@/lib/auth/subscription";
import {
  adminCanReceiveAssignmentsForKind,
  isClientAssignableExecutiveKind,
  staffRoleToRealm,
} from "@/lib/auth/staff-role";
import { queueExecutiveClientAssignmentEmail } from "@/lib/email/notify-executive-client-assignment";
import type { ExecutiveKind, StaffRole } from "@prisma/client";
import type { StaffRealm } from "@/types/staff-account";

export interface EligibleExecutiveRow {
  id: string;
  fullName?: string;
  email?: string;
  role?: StaffRole;
  realm?: StaffRealm;
  executiveKind?: ExecutiveKind | null;
}

export interface ListEligibleExecutivesOptions {
  /** Si se indica, solo ese kind (p. ej. ISAPRES_PREMIUM). */
  executiveKind?: ExecutiveKind;
  /** Incluir nombre/email (listados UI). */
  withProfile?: boolean;
  /**
   * Formulario/cotizador: usa la preferencia de asignación automática de Usuarios.
   */
  inboundPool?: boolean;
  /** Solo reparto automático; los selectores manuales conservan su elegibilidad. */
  automatic?: boolean;
}

/**
 * Ejecutivos elegibles para recibir nuevos clientes:
 * activos, onboarding completo, sin suspensión de asignaciones y suscripción vigente.
 * Excluye membresía (no reciben cartera).
 * Incluye administradores activos cuando el kind es Premium, Zoom o pool general.
 * Con `automatic` o `inboundPool`, exige la preferencia explícita de Usuarios.
 */
export async function listEligibleExecutivesForAssignment(
  options?: ListEligibleExecutivesOptions,
): Promise<EligibleExecutiveRow[]> {
  if (
    options?.executiveKind &&
    !isClientAssignableExecutiveKind(options.executiveKind)
  ) {
    return [];
  }

  const includeAdmins = adminCanReceiveAssignmentsForKind(
    options?.executiveKind,
  );

  const accounts = await prisma.staffAccount.findMany({
    where: {
      ...(options?.automatic || options?.inboundPool
        ? { autoAssignmentEnabled: true }
        : {}),
      OR: [
        {
          role: "EXECUTIVE",
          active: true,
          onboardingCompleted: true,
          assignmentsSuspended: false,
          executiveKind: options?.executiveKind
            ? options.executiveKind
            : { not: "MEMBRESIA_ISAPRES_PREMIUM" },
        },
        ...(includeAdmins
          ? [
              {
                role: "ADMIN" as const,
                active: true,
                assignmentsSuspended: false,
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      executiveKind: true,
      subscriptionStatus: true,
      subscriptionExpiresAt: true,
    },
    orderBy: [{ fullName: "asc" }, { createdAt: "asc" }],
  });

  const eligible = accounts
    .filter((account) => {
      if (account.role === "ADMIN") return true;
      return isExecutiveSubscriptionAllowingAccess({
        executiveKind: account.executiveKind,
        subscriptionStatus: account.subscriptionStatus ?? "TRIAL",
        subscriptionExpiresAt: account.subscriptionExpiresAt,
      });
    })
    // Ejecutivos primero; administradores al final.
    .sort((a, b) => {
      if (a.role !== b.role) {
        return a.role === "ADMIN" ? 1 : -1;
      }
      return a.fullName.localeCompare(b.fullName, "es");
    });

  return eligible.map((account) => mapEligibleRow(account, options?.withProfile));
}

function mapEligibleRow(
  account: {
    id: string;
    fullName: string;
    email: string;
    role: StaffRole;
    executiveKind: ExecutiveKind | null;
  },
  withProfile?: boolean,
): EligibleExecutiveRow {
  return withProfile
    ? {
        id: account.id,
        fullName: account.fullName,
        email: account.email,
        role: account.role,
        realm: staffRoleToRealm(account.role),
        executiveKind: account.executiveKind,
      }
    : {
        id: account.id,
        role: account.role,
        realm: staffRoleToRealm(account.role),
        executiveKind: account.executiveKind,
      };
}

/**
 * Round-robin 1×1 por clientes asignados: elige al ejecutivo elegible con
 * menos clientes vinculados. En empate, prioriza al que lleva más tiempo sin recibir uno.
 * Opcionalmente filtra por `executiveKind` o usa el pool inbound.
 */
export async function pickExecutiveRoundRobin(
  options?: Pick<ListEligibleExecutivesOptions, "executiveKind" | "inboundPool">,
): Promise<string | null> {
  const executives = await listEligibleExecutivesForAssignment({
    ...options,
    automatic: true,
  });

  if (executives.length === 0) return null;

  const counts = await prisma.user.groupBy({
    by: ["assignedExecutiveId"],
    where: {
      role: "CLIENT",
      assignedExecutiveId: { not: null },
    },
    _count: { id: true },
  });

  const countByExecutive = new Map(
    counts
      .filter((row) => row.assignedExecutiveId)
      .map((row) => [row.assignedExecutiveId as string, row._count.id]),
  );

  const lastAssigned = await prisma.user.groupBy({
    by: ["assignedExecutiveId"],
    where: {
      role: "CLIENT",
      assignedExecutiveId: { not: null },
    },
    _max: { updatedAt: true },
  });

  const lastByExecutive = new Map(
    lastAssigned
      .filter((row) => row.assignedExecutiveId)
      .map((row) => [
        row.assignedExecutiveId as string,
        row._max.updatedAt?.getTime() ?? 0,
      ]),
  );

  let pickedId = executives[0].id;
  let minCount = countByExecutive.get(pickedId) ?? 0;
  let oldestAssignment = lastByExecutive.get(pickedId) ?? 0;

  for (const executive of executives) {
    const count = countByExecutive.get(executive.id) ?? 0;
    const lastAt = lastByExecutive.get(executive.id) ?? 0;

    if (
      count < minCount ||
      (count === minCount && lastAt < oldestAssignment)
    ) {
      pickedId = executive.id;
      minCount = count;
      oldestAssignment = lastAt;
    }
  }

  return pickedId;
}

/** Asigna automáticamente un cliente sin ejecutivo. Devuelve el id asignado o null. */
export async function autoAssignClientExecutive(
  userId: string,
  options?: Pick<ListEligibleExecutivesOptions, "executiveKind" | "inboundPool">,
): Promise<string | null> {
  const client = await prisma.user.findUnique({
    where: { id: userId },
    select: { assignedExecutiveId: true, role: true },
  });

  if (!client || client.role !== "CLIENT") return null;
  if (client.assignedExecutiveId) return client.assignedExecutiveId;

  const executiveId = await pickExecutiveRoundRobin(options);
  if (!executiveId) return null;

  // Revalida el destino por si cambió su disponibilidad durante la selección.
  const target = await prisma.staffAccount.findUnique({
    where: { id: executiveId },
    select: {
      role: true,
      executiveKind: true,
      active: true,
      assignmentsSuspended: true,
      autoAssignmentEnabled: true,
    },
  });
  if (
    !target ||
    !target.active ||
    target.assignmentsSuspended ||
    !target.autoAssignmentEnabled ||
    (target.role === "EXECUTIVE" &&
      !isClientAssignableExecutiveKind(target.executiveKind))
  ) {
    return null;
  }

  const result = await prisma.user.updateMany({
    where: { id: userId, role: "CLIENT", assignedExecutiveId: null },
    data: { assignedExecutiveId: executiveId },
  });

  if (result.count === 0) {
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { assignedExecutiveId: true },
    });
    return current?.assignedExecutiveId ?? null;
  }

  queueExecutiveClientAssignmentEmail({
    clientUserId: userId,
    executiveAccountId: executiveId,
    assignmentType: "auto",
  });

  return executiveId;
}

/** Asigna en lote clientes sin ejecutivo usando round-robin equitativo. */
export async function distributeUnassignedClients(): Promise<{
  assigned: number;
  remaining: number;
}> {
  const unassigned = await prisma.user.findMany({
    where: { role: "CLIENT", assignedExecutiveId: null },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  let assigned = 0;

  for (const client of unassigned) {
    const executiveId = await autoAssignClientExecutive(client.id);
    if (!executiveId) break;

    await prisma.quote.updateMany({
      where: { userId: client.id, executiveAccountId: null },
      data: { executiveAccountId: executiveId },
    });

    assigned += 1;
  }

  const remaining = await prisma.user.count({
    where: { role: "CLIENT", assignedExecutiveId: null },
  });

  return { assigned, remaining };
}
