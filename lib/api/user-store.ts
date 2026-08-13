import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api/api-error";
import { isClientAssignableExecutiveKind } from "@/lib/auth/staff-role";
import { queueExecutiveClientAssignmentEmail } from "@/lib/email/notify-executive-client-assignment";
import {
  parseClientClosedRecord,
  resolveClientChecklist,
} from "@/lib/client-pipeline/constants";
import { resolveClientProfile, normalizeClientProfileInput } from "@/lib/client-profile/constants";
import { resolveCotizadorSourceFromQuote } from "@/lib/partner-entity/source-label";
import { extractWebFormSource } from "@/lib/clients/web-form-source";
import type { ClientPipelineStatus } from "@/types/client-pipeline";
import type { ClientPlanSnapshot } from "@/types/client-plan";
import type {
  CreateManualClientInput,
  UserRecord,
  UserRole,
  ClientOrigin,
} from "@/types/user";
import type {
  Isapre,
  Plan,
  Quote,
  User as DbUser,
  StaffAccount,
  Prisma,
} from "@prisma/client";

export type UserWithExecutive = DbUser & {
  assignedExecutive?: Pick<
    StaffAccount,
    "id" | "fullName" | "email" | "executiveKind"
  > | null;
  registeredBy?: Pick<StaffAccount, "id" | "fullName"> | null;
  trackingExecutive?: Pick<StaffAccount, "id" | "fullName"> | null;
};

type PlanSummary = Pick<Plan, "uniqueCode" | "planName" | "basePriceUf"> & {
  isapreRef: Pick<Isapre, "name">;
};

type QuoteWithPlan = Quote & {
  plan: PlanSummary | null;
};

type AssignedPlanRow = {
  id: string;
  planCode: string;
  notes: string | null;
  createdAt: Date;
  plan: PlanSummary;
};

export type ClientRecordWithPlans = DbUser & {
  assignedExecutive?: Pick<
    StaffAccount,
    "id" | "fullName" | "email" | "executiveKind"
  > | null;
  registeredBy?: Pick<StaffAccount, "id" | "fullName"> | null;
  trackingExecutive?: Pick<StaffAccount, "id" | "fullName"> | null;
  quotes?: QuoteWithPlan[];
  advisedPlan?: PlanSummary | null;
  assignedPlans?: AssignedPlanRow[];
};

const planSummarySelect = {
  uniqueCode: true,
  planName: true,
  basePriceUf: true,
  isapreRef: { select: { name: true } },
} as const;

export const clientRecordInclude = {
  assignedExecutive: {
    select: { id: true, fullName: true, email: true, executiveKind: true },
  },
  registeredBy: {
    select: { id: true, fullName: true },
  },
  trackingExecutive: {
    select: { id: true, fullName: true },
  },
  quotes: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    include: {
      plan: {
        select: planSummarySelect,
      },
    },
  },
  advisedPlan: {
    select: planSummarySelect,
  },
  assignedPlans: {
    orderBy: { createdAt: "asc" as const },
    include: {
      plan: {
        select: planSummarySelect,
      },
    },
  },
} as const;

function mapPlanSummary(
  plan: PlanSummary | null | undefined,
  extras?: Partial<ClientPlanSnapshot>,
): ClientPlanSnapshot | null {
  if (!plan) return null;
  return {
    planCode: plan.uniqueCode,
    planName: plan.planName,
    isapre: plan.isapreRef.name,
    basePriceUf: plan.basePriceUf,
    ...extras,
  };
}

function mapAssignedPlans(
  rows: AssignedPlanRow[] | undefined,
  chosenCode: string | null | undefined,
): ClientPlanSnapshot[] {
  if (!rows?.length) return [];
  return rows.map((row) =>
    mapPlanSummary(row.plan, {
      isChosen: row.planCode === chosenCode,
      assignmentId: row.id,
      assignedAt: row.createdAt.toISOString(),
    })!,
  );
}

function mapRequestedPlan(quote: QuoteWithPlan | undefined): ClientPlanSnapshot | null {
  if (!quote?.planCode && !quote?.plan) return null;

  return {
    planCode: quote.planCode ?? quote.plan?.uniqueCode ?? "",
    planName: quote.plan?.planName ?? "",
    isapre: quote.plan?.isapreRef?.name ?? "",
    basePriceUf: quote.plan?.basePriceUf ?? null,
    finalPriceUf: quote.finalPriceUf,
    finalPriceClp: quote.finalPriceClp,
    quotedAt: quote.createdAt.toISOString(),
  };
}

export function mapDbUser(user: UserWithExecutive): UserRecord {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    fullName: user.fullName,
    rut: user.rut,
    role: user.role as UserRole,
    active: user.active,
    assignedExecutiveId: user.assignedExecutiveId,
    assignedExecutiveName: user.assignedExecutive?.fullName ?? null,
    assignedExecutiveKind: user.assignedExecutive?.executiveKind ?? null,
    registeredById: user.registeredById,
    registeredByName: user.registeredBy?.fullName ?? null,
    trackingExecutiveId: user.trackingExecutiveId,
    trackingExecutiveName: user.trackingExecutive?.fullName ?? null,
    pipelineStatus: user.pipelineStatus as ClientPipelineStatus,
    checklist: resolveClientChecklist(user.pipelineChecklist),
    closedRecord: parseClientClosedRecord(user.pipelineClosedRecord),
    pipelineNotes: user.pipelineNotes,
    nextCallAt: user.nextCallAt?.toISOString() ?? null,
    confirmationCallAt: user.confirmationCallAt?.toISOString() ?? null,
    reminderAt: user.reminderAt?.toISOString() ?? null,
    reminderNote: user.reminderNote ?? null,
    lastCallOutcome: user.lastCallOutcome,
    preferredContactMethod:
      (user.preferredContactMethod as import("@/types/client-pipeline").ClientContactMethod | null) ??
      null,
    calendlyTeam:
      (user.calendlyTeam as UserRecord["calendlyTeam"]) ?? null,
    zoomJoinUrl: user.zoomJoinUrl ?? null,
    clientProfile: resolveClientProfile(user.clientProfile, {
      fullName: user.fullName,
    }),
    clientOrigin: user.clientOrigin as ClientOrigin,
    webFormSource: extractWebFormSource(user.pipelineNotes),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function mapDbClientRecord(user: ClientRecordWithPlans): UserRecord {
  const latestQuote = user.quotes?.[0];
  const cotizadorSource = latestQuote
    ? resolveCotizadorSourceFromQuote(latestQuote)
    : null;

  const assignedPlans = mapAssignedPlans(
    user.assignedPlans,
    user.advisedPlanCode,
  );
  const advisedPlan =
    mapPlanSummary(user.advisedPlan, { isChosen: true }) ??
    assignedPlans.find((plan) => plan.isChosen) ??
    null;

  return {
    ...mapDbUser(user),
    requestedPlan: mapRequestedPlan(latestQuote),
    advisedPlan,
    assignedPlans,
    cotizadorSource,
  };
}

export async function readClientOrThrow(
  userId: string,
): Promise<ClientRecordWithPlans> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: clientRecordInclude,
  });

  if (!user || user.role !== "CLIENT") {
    throw new ApiError("Cliente no encontrado.", 404, "NOT_FOUND");
  }

  return user;
}

export async function readUsers(role?: UserRole): Promise<UserRecord[]> {
  if (role === "CLIENT") {
    return readClientRecords();
  }

  const users = await prisma.user.findMany({
    where: role ? { role } : undefined,
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
    include: {
      assignedExecutive: {
        select: { id: true, fullName: true, email: true, executiveKind: true },
      },
    },
  });

  return users.map(mapDbUser);
}

export async function readUserById(id: string): Promise<UserRecord | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    include: clientRecordInclude,
  });
  return user ? mapDbClientRecord(user) : null;
}

export async function readUserByEmail(
  email: string,
): Promise<UserRecord | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: {
      assignedExecutive: {
        select: { id: true, fullName: true, email: true, executiveKind: true },
      },
    },
  });
  return user ? mapDbUser(user) : null;
}

export interface CreateUserInput {
  email: string;
  fullName: string;
  phone?: string | null;
  rut?: string | null;
  role?: UserRole;
  active?: boolean;
}

export async function createUser(input: CreateUserInput): Promise<UserRecord> {
  const user = await prisma.user.create({
    data: {
      email: input.email.trim().toLowerCase(),
      fullName: input.fullName.trim(),
      phone: input.phone?.trim() ?? null,
      rut: input.rut?.trim() ?? null,
      role: input.role ?? "CLIENT",
      active: input.active ?? true,
    },
    include: {
      assignedExecutive: {
        select: { id: true, fullName: true, email: true, executiveKind: true },
      },
    },
  });

  return mapDbUser(user);
}

export async function upsertUserByEmail(
  input: CreateUserInput,
): Promise<UserRecord> {
  const email = input.email.trim().toLowerCase();

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      fullName: input.fullName.trim(),
      phone: input.phone?.trim() ?? null,
      rut: input.rut?.trim() ?? null,
      role: input.role ?? "CLIENT",
      active: input.active ?? true,
      clientOrigin: "COTIZADOR",
    },
    update: {
      fullName: input.fullName.trim(),
      phone: input.phone?.trim() ?? null,
      rut: input.rut?.trim() ?? null,
      role: input.role ?? undefined,
      active: input.active ?? undefined,
      clientOrigin: "COTIZADOR",
    },
    include: {
      assignedExecutive: {
        select: { id: true, fullName: true, email: true, executiveKind: true },
      },
    },
  });

  return mapDbUser(user);
}

export async function readClientRecords(): Promise<UserRecord[]> {
  const users = await prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: [
      { clientOrigin: "asc" },
      { createdAt: "desc" },
      { fullName: "asc" },
    ],
    include: clientRecordInclude,
  });

  return users.map(mapDbClientRecord);
}

export async function readClientsForExecutive(
  executiveAccountId: string,
): Promise<UserRecord[]> {
  const users = await prisma.user.findMany({
    where: {
      role: "CLIENT",
      OR: [
        { assignedExecutiveId: executiveAccountId },
        { trackingExecutiveId: executiveAccountId },
      ],
    },
    orderBy: [
      { clientOrigin: "asc" },
      { createdAt: "desc" },
      { fullName: "asc" },
    ],
    include: clientRecordInclude,
  });

  return users.map(mapDbClientRecord);
}

export async function createManualClient(
  input: CreateManualClientInput,
  actor: { executiveAccountId: string; isAdmin: boolean },
): Promise<UserRecord> {
  let normalized;
  try {
    normalized = normalizeClientProfileInput(input, { requireTitularRut: false });
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : "Datos inválidos.",
      400,
      "INVALID_INPUT",
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: normalized.email },
    select: { id: true, role: true },
  });

  if (existing) {
    throw new ApiError(
      "Ya existe un cliente con ese correo electrónico.",
      409,
      "EMAIL_EXISTS",
    );
  }

  // Alta manual: el cliente queda en la cartera de quien lo registra.
  // Solo admin puede reasignar en el mismo request (u omitir asignación con null).
  let assignedExecutiveId: string | null = actor.executiveAccountId;
  if (actor.isAdmin && input.assignedExecutiveId !== undefined) {
    assignedExecutiveId = input.assignedExecutiveId;
  }

  if (assignedExecutiveId) {
    await assertAssignableExecutive(assignedExecutiveId);
  }

  const user = await prisma.user.create({
    data: {
      email: normalized.email,
      fullName: normalized.fullName,
      phone: normalized.phone,
      rut: normalized.rut,
      role: "CLIENT",
      active: true,
      clientOrigin: input.clientOrigin ?? "MANUAL",
      assignedExecutiveId,
      registeredById: actor.executiveAccountId,
      pipelineNotes: input.pipelineNotes?.trim() || null,
      clientProfile: normalized.profile as unknown as Prisma.InputJsonValue,
    },
    include: clientRecordInclude,
  });

  if (assignedExecutiveId) {
    queueExecutiveClientAssignmentEmail({
      clientUserId: user.id,
      executiveAccountId: assignedExecutiveId,
      assignmentType: "manual",
    });
  }

  return mapDbClientRecord(user);
}

async function syncClientQuotesExecutive(
  userId: string,
  executiveAccountId: string,
): Promise<void> {
  await prisma.quote.updateMany({
    where: { userId, executiveAccountId: null },
    data: { executiveAccountId },
  });
}

/**
 * Valida destino de cartera / cotización.
 * Membresía Isapres Premium nunca puede recibir clientes ni cotizaciones asignadas,
 * aunque se envíe su id o correo por API.
 */
export async function assertAssignableExecutive(
  executiveAccountId: string,
): Promise<void> {
  const executive = await prisma.staffAccount.findFirst({
    where: {
      id: executiveAccountId,
      role: { in: ["EXECUTIVE", "ADMIN"] },
      active: true,
    },
    select: { id: true, role: true, executiveKind: true },
  });

  if (!executive) {
    throw new ApiError(
      "La cuenta seleccionada no existe o no está activa.",
      400,
      "INVALID_EXECUTIVE",
    );
  }

  if (
    executive.role === "EXECUTIVE" &&
    !isClientAssignableExecutiveKind(executive.executiveKind)
  ) {
    throw new ApiError(
      "Prohibido: Membresía Isapres Premium no puede recibir clientes ni cotizaciones asignadas.",
      400,
      "MEMBERSHIP_ASSIGNMENT_FORBIDDEN",
    );
  }
}

export async function assignUserToExecutive(
  userId: string,
  executiveAccountId: string | null,
): Promise<UserRecord> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, assignedExecutiveId: true },
  });

  if (!existing || existing.role !== "CLIENT") {
    throw new ApiError("Cliente no encontrado.", 404, "NOT_FOUND");
  }

  if (executiveAccountId) {
    await assertAssignableExecutive(executiveAccountId);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { assignedExecutiveId: executiveAccountId },
    include: clientRecordInclude,
  });

  if (executiveAccountId) {
    await syncClientQuotesExecutive(userId, executiveAccountId);
    if (existing.assignedExecutiveId !== executiveAccountId) {
      queueExecutiveClientAssignmentEmail({
        clientUserId: userId,
        executiveAccountId,
        assignmentType: "manual",
      });
    }
  }

  return mapDbClientRecord(user);
}
