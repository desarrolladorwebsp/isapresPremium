import { prisma } from "@/lib/prisma";
import {
  autoAssignClientExecutive,
  pickExecutiveRoundRobin,
} from "@/lib/api/lead-assignment";
import {
  formatStatusLabel,
  logQuoteActivity,
  resolveExecutiveName,
} from "@/lib/api/quote-activity-store";
import { queueExecutiveClientAssignmentEmail } from "@/lib/email/notify-executive-client-assignment";
import type { QuoteActivityActor } from "@/types/quote-activity";
import type { CreateQuoteInput, QuoteRecord, QuoteStatus } from "@/types/quote";
import type { Quote as DbQuote, Plan, Isapre, StaffAccount } from "@prisma/client";
import { upsertUserByEmail } from "./user-store";

type QuoteWithRelations = DbQuote & {
  plan?: (Pick<Plan, "planName"> & { isapreRef: Pick<Isapre, "name"> }) | null;
  executiveAccount?: Pick<StaffAccount, "fullName"> | null;
};

function mapDbQuote(quote: QuoteWithRelations): QuoteRecord {
  const dependentAges = Array.isArray(quote.dependentAges)
    ? (quote.dependentAges as number[])
    : undefined;

  return {
    id: quote.id,
    userId: quote.userId,
    planCode: quote.planCode,
    status: quote.status as QuoteStatus,
    fullName: quote.fullName,
    email: quote.email,
    phone: quote.phone,
    rut: quote.rut,
    region: quote.region,
    sex: quote.sex,
    monthlyIncome: quote.monthlyIncome,
    contributorAge: quote.contributorAge,
    dependentsCount: quote.dependentsCount,
    dependentAges,
    contactPreference: quote.contactPreference,
    quoteReason: quote.quoteReason,
    finalPriceUf: quote.finalPriceUf,
    finalPriceClp: quote.finalPriceClp,
    ufValue: quote.ufValue,
    beneficiaryCount: quote.beneficiaryCount,
    totalFactors: quote.totalFactors,
    notes: quote.notes,
    partnerEntitySlug: quote.partnerEntitySlug,
    partnerEntityName: quote.partnerEntityName,
    companyAgreementRut: quote.companyAgreementRut,
    companyAgreementName: quote.companyAgreementName,
    companyAgreementDiscount: quote.companyAgreementDiscount,
    executiveAccountId: quote.executiveAccountId,
    executiveName: quote.executiveAccount?.fullName ?? null,
    planName: quote.plan?.planName ?? null,
    planIsapre: quote.plan?.isapreRef?.name ?? null,
    createdAt: quote.createdAt.toISOString(),
    updatedAt: quote.updatedAt.toISOString(),
  };
}

const quoteInclude = {
  plan: {
    select: {
      planName: true,
      isapreRef: { select: { name: true } },
    },
  },
  executiveAccount: {
    select: { fullName: true },
  },
} as const;

export async function readQuotes(): Promise<QuoteRecord[]> {
  const quotes = await prisma.quote.findMany({
    orderBy: { createdAt: "desc" },
    include: quoteInclude,
  });

  return quotes.map(mapDbQuote);
}

export async function readQuotesForExecutive(
  executiveAccountId: string,
): Promise<QuoteRecord[]> {
  const quotes = await prisma.quote.findMany({
    where: { executiveAccountId },
    orderBy: { createdAt: "desc" },
    include: quoteInclude,
  });

  return quotes.map(mapDbQuote);
}

export async function readQuoteById(id: string): Promise<QuoteRecord | null> {
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: quoteInclude,
  });
  return quote ? mapDbQuote(quote) : null;
}

export async function createQuote(
  input: CreateQuoteInput,
): Promise<QuoteRecord> {
  const client = await upsertUserByEmail({
    email: input.email,
    fullName: input.fullName,
    phone: input.phone,
    rut: input.rut ?? null,
    role: "CLIENT",
  });

  // Solo hereda un ejecutivo ya asignado manualmente; sin auto-asignación al cotizar.
  const executiveAccountId = client.assignedExecutiveId;

  const quote = await prisma.quote.create({
    data: {
      userId: client.id,
      executiveAccountId,
      planCode: input.planCode ?? null,
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      rut: input.rut?.trim() ?? null,
      region: input.region ?? null,
      sex: input.sex ?? null,
      monthlyIncome: input.monthlyIncome ?? null,
      contributorAge: input.contributorAge ?? null,
      dependentsCount: input.dependentsCount ?? 0,
      dependentAges: input.dependentAges ?? undefined,
      contactPreference: input.contactPreference ?? null,
      quoteReason: input.quoteReason ?? null,
      finalPriceUf: input.finalPriceUf ?? null,
      finalPriceClp: input.finalPriceClp ?? null,
      ufValue: input.ufValue ?? null,
      beneficiaryCount: input.beneficiaryCount ?? null,
      totalFactors: input.totalFactors ?? null,
      notes: input.notes ?? null,
      partnerEntitySlug: input.partnerEntitySlug?.trim().toLowerCase() || null,
      partnerEntityName: input.partnerEntityName?.trim() || null,
      companyAgreementRut: input.companyAgreementRut?.trim() || null,
      companyAgreementName: input.companyAgreementName?.trim() || null,
      companyAgreementDiscount: input.companyAgreementDiscount ?? null,
    },
    include: quoteInclude,
  });

  if (executiveAccountId && client.id) {
    await prisma.quote.updateMany({
      where: { userId: client.id, executiveAccountId: null },
      data: { executiveAccountId },
    });
  }

  await logQuoteActivity({
    quoteId: quote.id,
    activityType: "CREATED",
    description: "Prospecto registrado desde el cotizador.",
    actor: { realm: "system", name: "Sistema" },
  });

  if (executiveAccountId) {
    const executiveName = await resolveExecutiveName(executiveAccountId);
    await logQuoteActivity({
      quoteId: quote.id,
      activityType: "EXECUTIVE_ASSIGNED",
      newValue: executiveAccountId,
      description: executiveName
        ? `Asignado automáticamente a ${executiveName}.`
        : "Asignado automáticamente al ejecutivo con menor carga.",
      actor: { realm: "system", name: "Sistema" },
    });
  }

  return mapDbQuote(quote);
}

export async function updateQuoteAssignment(input: {
  quoteId: string;
  executiveAccountId: string | null;
  status?: QuoteStatus;
  actor?: QuoteActivityActor;
}): Promise<QuoteRecord> {
  const existing = await readQuoteById(input.quoteId);
  const previousClientExecutiveId = existing?.userId
    ? (
        await prisma.user.findUnique({
          where: { id: existing.userId },
          select: { assignedExecutiveId: true },
        })
      )?.assignedExecutiveId ?? null
    : null;

  const quote = await prisma.quote.update({
    where: { id: input.quoteId },
    data: {
      executiveAccountId: input.executiveAccountId,
      status: input.status,
    },
    include: quoteInclude,
  });

  if (input.executiveAccountId && quote.userId) {
    await prisma.user.update({
      where: { id: quote.userId },
      data: { assignedExecutiveId: input.executiveAccountId },
    });

    if (previousClientExecutiveId !== input.executiveAccountId) {
      queueExecutiveClientAssignmentEmail({
        clientUserId: quote.userId,
        executiveAccountId: input.executiveAccountId,
        assignmentType: "manual",
        quoteId: input.quoteId,
      });
    }
  }

  if (existing && existing.executiveAccountId !== input.executiveAccountId) {
    const previousName =
      existing.executiveName ??
      (await resolveExecutiveName(existing.executiveAccountId));
    const nextName = await resolveExecutiveName(input.executiveAccountId);

    if (input.executiveAccountId) {
      await logQuoteActivity({
        quoteId: input.quoteId,
        activityType: existing.executiveAccountId
          ? "EXECUTIVE_ASSIGNED"
          : "EXECUTIVE_ASSIGNED",
        previousValue: existing.executiveAccountId,
        newValue: input.executiveAccountId,
        actor: input.actor,
        description: existing.executiveAccountId
          ? `Reasignado de ${previousName ?? "sin ejecutivo"} a ${nextName ?? "ejecutivo"}.`
          : `Asignado a ${nextName ?? "ejecutivo"}.`,
      });
    } else {
      await logQuoteActivity({
        quoteId: input.quoteId,
        activityType: "EXECUTIVE_UNASSIGNED",
        previousValue: existing.executiveAccountId,
        actor: input.actor,
        description: previousName
          ? `Desasignado de ${previousName}.`
          : "Prospecto sin ejecutivo asignado.",
      });
    }
  }

  if (
    existing &&
    input.status &&
    existing.status !== input.status
  ) {
    await logQuoteActivity({
      quoteId: input.quoteId,
      activityType: "STATUS_CHANGED",
      previousValue: existing.status,
      newValue: input.status,
      actor: input.actor,
      description: `Estado actualizado de ${formatStatusLabel(existing.status)} a ${formatStatusLabel(input.status)}.`,
    });
  }

  return mapDbQuote(quote);
}

export async function assignQuoteToExecutive(
  quoteId: string,
  executiveAccountId: string,
  actor?: QuoteActivityActor,
): Promise<QuoteRecord> {
  return updateQuoteAssignment({ quoteId, executiveAccountId, actor });
}

export async function updateQuoteStatus(
  quoteId: string,
  status: QuoteStatus,
  actor?: QuoteActivityActor,
): Promise<QuoteRecord> {
  const existing = await readQuoteById(quoteId);

  const quote = await prisma.quote.update({
    where: { id: quoteId },
    data: { status },
    include: quoteInclude,
  });

  if (existing && existing.status !== status) {
    await logQuoteActivity({
      quoteId,
      activityType: "STATUS_CHANGED",
      previousValue: existing.status,
      newValue: status,
      actor,
      description: `Estado actualizado de ${formatStatusLabel(existing.status)} a ${formatStatusLabel(status)}.`,
    });
  }

  return mapDbQuote(quote);
}

/** Asigna todos los leads sin ejecutivo usando round-robin equitativo. */
export async function distributeUnassignedQuotes(
  actor?: QuoteActivityActor,
): Promise<{
  assigned: number;
  remaining: number;
}> {
  const unassigned = await prisma.quote.findMany({
    where: { executiveAccountId: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, userId: true },
  });

  let assigned = 0;

  for (const quote of unassigned) {
    let executiveAccountId: string | null = null;

    if (quote.userId) {
      executiveAccountId = await autoAssignClientExecutive(quote.userId);
    }

    if (!executiveAccountId) {
      executiveAccountId = await pickExecutiveRoundRobin();
      if (executiveAccountId && quote.userId) {
        await prisma.user.update({
          where: { id: quote.userId },
          data: { assignedExecutiveId: executiveAccountId },
        });
      }
    }

    if (!executiveAccountId) break;

    await updateQuoteAssignment({
      quoteId: quote.id,
      executiveAccountId,
      actor: actor ?? { realm: "system", name: "Sistema" },
    });

    assigned += 1;
  }

  const remaining = await prisma.quote.count({
    where: { executiveAccountId: null },
  });

  return { assigned, remaining };
}

export interface ExecutiveAssignmentStat {
  executiveId: string;
  fullName: string;
  email: string;
  active: boolean;
  assignedCount: number;
}

/** Conteo de leads por ejecutivo (para balance en panel admin). */
export async function readExecutiveAssignmentStats(): Promise<
  ExecutiveAssignmentStat[]
> {
  const executives = await prisma.staffAccount.findMany({
    where: { role: "EXECUTIVE" },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, email: true, active: true },
  });

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

  return executives.map((executive) => ({
    executiveId: executive.id,
    fullName: executive.fullName,
    email: executive.email,
    active: executive.active,
    assignedCount: countByExecutive.get(executive.id) ?? 0,
  }));
}
