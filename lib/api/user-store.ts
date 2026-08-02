import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api/api-error";
import { queueExecutiveClientAssignmentEmail } from "@/lib/email/notify-executive-client-assignment";
import {
  parseClientClosedRecord,
  resolveClientChecklist,
} from "@/lib/client-pipeline/constants";
import { resolveClientProfile, normalizeClientProfileInput } from "@/lib/client-profile/constants";
import { resolveCotizadorSourceFromQuote } from "@/lib/partner-entity/source-label";
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
};

type PlanSummary = Pick<Plan, "uniqueCode" | "planName"> & {
  isapreRef: Pick<Isapre, "name">;
};

type QuoteWithPlan = Quote & {
  plan: PlanSummary | null;
};

export type ClientRecordWithPlans = DbUser & {
  assignedExecutive?: Pick<
    StaffAccount,
    "id" | "fullName" | "email" | "executiveKind"
  > | null;
  quotes?: QuoteWithPlan[];
  advisedPlan?: PlanSummary | null;
};

export const clientRecordInclude = {
  assignedExecutive: {
    select: { id: true, fullName: true, email: true, executiveKind: true },
  },
  quotes: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    include: {
      plan: {
        select: {
          uniqueCode: true,
          planName: true,
          isapreRef: { select: { name: true } },
        },
      },
    },
  },
  advisedPlan: {
    select: {
      uniqueCode: true,
      planName: true,
      isapreRef: { select: { name: true } },
    },
  },
} as const;

function mapPlanSummary(plan: PlanSummary | null | undefined): ClientPlanSnapshot | null {
  if (!plan) return null;
  return {
    planCode: plan.uniqueCode,
    planName: plan.planName,
    isapre: plan.isapreRef.name,
  };
}

function mapRequestedPlan(quote: QuoteWithPlan | undefined): ClientPlanSnapshot | null {
  if (!quote?.planCode && !quote?.plan) return null;

  return {
    planCode: quote.planCode ?? quote.plan?.uniqueCode ?? "",
    planName: quote.plan?.planName ?? "",
    isapre: quote.plan?.isapreRef?.name ?? "",
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
    pipelineStatus: user.pipelineStatus as ClientPipelineStatus,
    checklist: resolveClientChecklist(user.pipelineChecklist),
    closedRecord: parseClientClosedRecord(user.pipelineClosedRecord),
    pipelineNotes: user.pipelineNotes,
    nextCallAt: user.nextCallAt?.toISOString() ?? null,
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
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function mapDbClientRecord(user: ClientRecordWithPlans): UserRecord {
  const latestQuote = user.quotes?.[0];
  const cotizadorSource = latestQuote
    ? resolveCotizadorSourceFromQuote(latestQuote)
    : null;

  return {
    ...mapDbUser(user),
    requestedPlan: mapRequestedPlan(latestQuote),
    advisedPlan: mapPlanSummary(user.advisedPlan),
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
      assignedExecutiveId: executiveAccountId,
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
    normalized = normalizeClientProfileInput(input, { requireTitularRut: true });
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

  let assignedExecutiveId: string | null = actor.executiveAccountId;
  if (actor.isAdmin && input.assignedExecutiveId !== undefined) {
    assignedExecutiveId = input.assignedExecutiveId;
    if (assignedExecutiveId) {
      await assertAssignableExecutive(assignedExecutiveId);
    }
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

async function assertAssignableExecutive(
  executiveAccountId: string,
): Promise<void> {
  const executive = await prisma.staffAccount.findFirst({
    where: {
      id: executiveAccountId,
      role: "EXECUTIVE",
      active: true,
    },
    select: { id: true },
  });

  if (!executive) {
    throw new ApiError(
      "El ejecutivo seleccionado no existe o no está activo.",
      400,
      "INVALID_EXECUTIVE",
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
