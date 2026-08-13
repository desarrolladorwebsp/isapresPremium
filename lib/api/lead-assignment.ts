import { prisma } from "@/lib/prisma";
import { isExecutiveSubscriptionAllowingAccess } from "@/lib/auth/subscription";
import {
  adminCanReceiveAssignmentsForKind,
  isClientAssignableExecutiveKind,
  staffRoleToRealm,
} from "@/lib/auth/staff-role";
import {
  INBOUND_CLIENT_ASSIGNMENT_EMAILS,
  normalizeInboundAssignmentEmail,
} from "@/lib/api/inbound-assignment-pool";
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
   * Pool fijo formulario/cotizador (Javiera, Isidora, Catalina).
   * Ignora kind y no incluye admins.
   */
  inboundPool?: boolean;
}

/**
 * Ejecutivos elegibles para recibir nuevos clientes:
 * activos, onboarding completo, sin suspensión de asignaciones y suscripción vigente.
 * Excluye membresía (no reciben cartera).
 * Incluye administradores activos cuando el kind es Premium, Zoom o pool general.
 * Con `inboundPool`, solo el pool configurado de formulario/cotizador.
 */
export async function listEligibleExecutivesForAssignment(
  options?: ListEligibleExecutivesOptions,
): Promise<EligibleExecutiveRow[]> {
  if (options?.inboundPool) {
    return listInboundPoolExecutives(options.withProfile);
  }

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

async function listInboundPoolExecutives(
  withProfile?: boolean,
): Promise<EligibleExecutiveRow[]> {
  const emails = INBOUND_CLIENT_ASSIGNMENT_EMAILS.map(
    normalizeInboundAssignmentEmail,
  );

  const accounts = await prisma.staffAccount.findMany({
    where: {
      email: { in: emails },
      role: "EXECUTIVE",
      active: true,
      onboardingCompleted: true,
      assignmentsSuspended: false,
      executiveKind: { not: "MEMBRESIA_ISAPRES_PREMIUM" },
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
  });

  const byEmail = new Map(
    accounts.map((account) => [
      normalizeInboundAssignmentEmail(account.email),
      account,
    ]),
  );

  // Orden estable del pool configurado (1×1 predecible).
  const ordered = emails
    .map((email) => byEmail.get(email))
    .filter((account): account is (typeof accounts)[number] => Boolean(account))
    .filter((account) =>
      isExecutiveSubscriptionAllowingAccess({
        executiveKind: account.executiveKind,
        subscriptionStatus: account.subscriptionStatus ?? "TRIAL",
        subscriptionExpiresAt: account.subscriptionExpiresAt,
      }),
    )
    .filter((account) =>
      isClientAssignableExecutiveKind(account.executiveKind),
    );

  return ordered.map((account) => mapEligibleRow(account, withProfile));
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
  const executives = await listEligibleExecutivesForAssignment(options);

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

  // Defensa en profundidad: nunca persistir asignación a membresía.
  const target = await prisma.staffAccount.findUnique({
    where: { id: executiveId },
    select: { role: true, executiveKind: true },
  });
  if (
    !target ||
    (target.role === "EXECUTIVE" &&
      !isClientAssignableExecutiveKind(target.executiveKind))
  ) {
    return null;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { assignedExecutiveId: executiveId },
  });

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
