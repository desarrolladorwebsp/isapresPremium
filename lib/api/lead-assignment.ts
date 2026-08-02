import { prisma } from "@/lib/prisma";
import { isSubscriptionActive } from "@/lib/auth/subscription";
import { queueExecutiveClientAssignmentEmail } from "@/lib/email/notify-executive-client-assignment";
import type { ExecutiveKind } from "@prisma/client";

export interface EligibleExecutiveRow {
  id: string;
  fullName?: string;
  email?: string;
}

export interface ListEligibleExecutivesOptions {
  /** Si se indica, solo ese kind (p. ej. ISAPRES_PREMIUM). */
  executiveKind?: ExecutiveKind;
  /** Incluir nombre/email (listados UI). */
  withProfile?: boolean;
}

/**
 * Ejecutivos elegibles para recibir nuevos clientes:
 * activos, onboarding completo, sin suspensión de asignaciones y suscripción vigente.
 */
export async function listEligibleExecutivesForAssignment(
  options?: ListEligibleExecutivesOptions,
): Promise<EligibleExecutiveRow[]> {
  const executives = await prisma.staffAccount.findMany({
    where: {
      role: "EXECUTIVE",
      active: true,
      onboardingCompleted: true,
      assignmentsSuspended: false,
      ...(options?.executiveKind
        ? { executiveKind: options.executiveKind }
        : {}),
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      subscriptionStatus: true,
      subscriptionExpiresAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return executives
    .filter((executive) =>
      isSubscriptionActive({
        subscriptionStatus: executive.subscriptionStatus ?? "TRIAL",
        subscriptionExpiresAt: executive.subscriptionExpiresAt,
      }),
    )
    .map((executive) =>
      options?.withProfile
        ? {
            id: executive.id,
            fullName: executive.fullName,
            email: executive.email,
          }
        : { id: executive.id },
    );
}

/**
 * Round-robin 1×1 por clientes asignados: elige al ejecutivo elegible con
 * menos clientes vinculados. En empate, prioriza al que lleva más tiempo sin recibir uno.
 * Opcionalmente filtra por `executiveKind` (p. ej. solo Isapres Premium).
 */
export async function pickExecutiveRoundRobin(
  options?: Pick<ListEligibleExecutivesOptions, "executiveKind">,
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
): Promise<string | null> {
  const client = await prisma.user.findUnique({
    where: { id: userId },
    select: { assignedExecutiveId: true, role: true },
  });

  if (!client || client.role !== "CLIENT") return null;
  if (client.assignedExecutiveId) return client.assignedExecutiveId;

  const executiveId = await pickExecutiveRoundRobin();
  if (!executiveId) return null;

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
