import "server-only";

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api/api-error";
import { logClientActivity } from "@/lib/api/client-activity-store";
import { resolveAppBaseUrl } from "@/lib/platform/routing";
import {
  SENT_QUOTATION_KPI_STATUSES,
  type SentQuotationKpiRow,
  type SentQuotationKpiStatus,
} from "@/lib/executive/sent-quotation-kpi";
import type {
  ClientQuotationPlanSnapshot,
  ClientQuotationRecord,
  ClientQuotationStatus,
} from "@/types/client-quotation";
import type { Prisma } from "@prisma/client";

const quotationInclude = {
  executive: { select: { fullName: true } },
  items: { orderBy: { position: "asc" as const } },
  activities: { orderBy: { createdAt: "desc" as const } },
} as const;

type QuotationRow = Prisma.ClientQuotationGetPayload<{
  include: typeof quotationInclude;
}>;

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function mapQuotation(row: QuotationRow): ClientQuotationRecord {
  return {
    id: row.id,
    number: row.number,
    clientId: row.clientId,
    executiveId: row.executiveId,
    executiveName: row.executive.fullName,
    status: row.status as ClientQuotationStatus,
    version: row.version,
    pdfUrl: `/api/executive/clients/${encodeURIComponent(row.clientId)}/quotations/${encodeURIComponent(row.id)}/pdf`,
    validUntil: row.validUntil?.toISOString() ?? null,
    issuedAt: row.issuedAt?.toISOString() ?? null,
    sentAt: row.sentAt?.toISOString() ?? null,
    receivedAt: row.receivedAt?.toISOString() ?? null,
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    rejectedAt: row.rejectedAt?.toISOString() ?? null,
    voidedAt: row.voidedAt?.toISOString() ?? null,
    outcomeReason: row.outcomeReason,
    plans: row.items.map(
      (item) => item.planSnapshot as unknown as ClientQuotationPlanSnapshot,
    ),
    activities: row.activities.map((activity) => ({
      id: activity.id,
      activityType: activity.activityType,
      actorName: activity.actorName,
      channel: activity.channel,
      previousValue: activity.previousValue,
      newValue: activity.newValue,
      description: activity.description,
      createdAt: activity.createdAt.toISOString(),
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function snapshotName(value: unknown, key: string): string {
  if (!value || typeof value !== "object") return "";
  const raw = (value as Record<string, unknown>)[key];
  return typeof raw === "string" ? raw.trim() : "";
}

function isapresFromItems(
  items: Array<{ planSnapshot: unknown }>,
): string[] {
  const names: string[] = [];
  for (const item of items) {
    const name = snapshotName(item.planSnapshot, "isapre");
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

/** Cotizaciones ya enviadas, para el KPI de inicio y la tabla de reportes. */
export async function listSentQuotationsForKpi(
  executiveId?: string | null,
): Promise<SentQuotationKpiRow[]> {
  const rows = await prisma.clientQuotation.findMany({
    where: {
      status: { in: [...SENT_QUOTATION_KPI_STATUSES] },
      sentAt: { not: null },
      ...(executiveId ? { executiveId } : {}),
    },
    select: {
      id: true,
      number: true,
      clientId: true,
      executiveId: true,
      status: true,
      sentAt: true,
      receivedAt: true,
      acceptedAt: true,
      rejectedAt: true,
      clientSnapshot: true,
      client: { select: { fullName: true } },
      executive: { select: { fullName: true } },
      items: { select: { planSnapshot: true }, orderBy: { position: "asc" } },
    },
    orderBy: { sentAt: "desc" },
  });

  return rows.flatMap((row) => {
    if (!row.sentAt) return [];
    const status = row.status as SentQuotationKpiStatus;
    if (!SENT_QUOTATION_KPI_STATUSES.includes(status)) return [];
    return [{
      id: row.id,
      number: row.number,
      clientId: row.clientId,
      clientName:
        row.client.fullName.trim() ||
        snapshotName(row.clientSnapshot, "fullName") ||
        "Cliente",
      executiveId: row.executiveId,
      executiveName: row.executive.fullName.trim() || "Ejecutivo",
      status,
      sentAt: row.sentAt.toISOString(),
      receivedAt: row.receivedAt?.toISOString() ?? null,
      acceptedAt: row.acceptedAt?.toISOString() ?? null,
      rejectedAt: row.rejectedAt?.toISOString() ?? null,
      isapres: isapresFromItems(row.items),
    }];
  });
}

export async function listClientQuotations(clientId: string) {
  const rows = await prisma.clientQuotation.findMany({
    where: { clientId },
    include: quotationInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapQuotation);
}

export async function readClientQuotation(clientId: string, quotationId: string) {
  const row = await prisma.clientQuotation.findFirst({
    where: { id: quotationId, clientId },
    include: quotationInclude,
  });
  return row ? mapQuotation(row) : null;
}

export async function readClientQuotationEntity(clientId: string, quotationId: string) {
  return prisma.clientQuotation.findFirst({
    where: { id: quotationId, clientId },
    include: quotationInclude,
  });
}

export async function createClientQuotation(input: {
  clientId: string;
  executiveId: string;
  executiveName: string;
  executiveEmail: string;
  executivePhone?: string | null;
  planCodes: string[];
}) {
  const planCodes = [...new Set(input.planCodes.map((code) => code.trim()).filter(Boolean))];
  if (planCodes.length < 1 || planCodes.length > 3) {
    throw new ApiError("Selecciona entre 1 y 3 planes propuestos.", 400, "INVALID_PLAN_COUNT");
  }

  const client = await prisma.user.findUnique({
    where: { id: input.clientId },
    include: {
      assignedPlans: {
        where: { planCode: { in: planCodes } },
        include: {
          plan: {
            include: {
              isapreRef: { select: { name: true } },
              coverages: { orderBy: { clinicName: "asc" } },
            },
          },
        },
      },
      quotes: {
        where: { planCode: { in: planCodes } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!client) throw new ApiError("Cliente no encontrado.", 404);
  if (client.assignedPlans.length !== planCodes.length) {
    throw new ApiError(
      "Solo puedes cotizar planes que estén agregados a la propuesta del cliente.",
      400,
      "PLAN_NOT_ASSIGNED",
    );
  }

  const orderedPlans = planCodes.map((code) =>
    client.assignedPlans.find((assigned) => assigned.planCode === code)!,
  );
  const snapshots: ClientQuotationPlanSnapshot[] = orderedPlans.map(({ plan }) => {
    const quoted = client.quotes.find((quote) => quote.planCode === plan.uniqueCode);
    return {
      planCode: plan.uniqueCode,
      planName: plan.planName,
      isapre: plan.isapreRef.name,
      planType: plan.planType,
      basePriceUf: plan.basePriceUf,
      finalPriceUf: quoted?.finalPriceUf ?? plan.basePriceUf,
      finalPriceClp: quoted?.finalPriceClp ?? null,
      coverageSummary: plan.coverages.slice(0, 12).map(
        (coverage) => `${coverage.clinicName}: ${coverage.percentage}% ${coverage.type}`,
      ),
      planPdfUrl: plan.pdfUrl || plan.pdfPublicId
        ? `${resolveAppBaseUrl()}/api/plans/${encodeURIComponent(plan.uniqueCode)}/pdf`
        : null,
    };
  });

  const now = new Date();
  const number = `COT-${now.getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + 15);

  const row = await prisma.clientQuotation.create({
    data: {
      number,
      clientId: input.clientId,
      executiveId: input.executiveId,
      issuedAt: now,
      validUntil,
      clientSnapshot: jsonValue({
        fullName: client.fullName,
        email: client.email,
        phone: client.phone,
        rut: client.rut,
      }),
      executiveSnapshot: jsonValue({
        fullName: input.executiveName,
        email: input.executiveEmail,
        phone: input.executivePhone ?? null,
      }),
      items: {
        create: snapshots.map((snapshot, index) => ({
          planCode: snapshot.planCode,
          position: index + 1,
          planSnapshot: jsonValue(snapshot),
        })),
      },
      activities: {
        create: {
          activityType: "CREATED",
          actorId: input.executiveId,
          actorName: input.executiveName,
          description: `Cotización ${number} creada con ${snapshots.length} propuesta${snapshots.length === 1 ? "" : "s"}.`,
          metadata: jsonValue({ planCount: snapshots.length }),
        },
      },
    },
    include: quotationInclude,
  });

  await logClientActivity({
    userId: input.clientId,
    activityType: "QUOTATION_CREATED",
    newValue: row.id,
    actor: { realm: "executive", id: input.executiveId, name: input.executiveName },
    description: `Cotización ${number} creada con ${snapshots.length} propuesta${snapshots.length === 1 ? "" : "s"}.`,
  });
  return mapQuotation(row);
}

const ALLOWED_TRANSITIONS: Record<ClientQuotationStatus, ClientQuotationStatus[]> = {
  DRAFT: ["SENT", "VOIDED"],
  SENT: ["ACCEPTED", "REJECTED", "VOIDED"],
  ACCEPTED: ["RECEIVED", "VOIDED"],
  RECEIVED: ["VOIDED"],
  REJECTED: ["VOIDED"],
  VOIDED: [],
};

export async function updateClientQuotationStatus(input: {
  clientId: string;
  quotationId: string;
  status: ClientQuotationStatus;
  reason?: string | null;
  actorId: string;
  actorName: string;
}) {
  const current = await prisma.clientQuotation.findFirst({
    where: { id: input.quotationId, clientId: input.clientId },
  });
  if (!current) throw new ApiError("Cotización no encontrada.", 404);
  const previous = current.status as ClientQuotationStatus;
  if (previous !== input.status && !ALLOWED_TRANSITIONS[previous].includes(input.status)) {
    throw new ApiError(`No se puede cambiar de ${previous} a ${input.status}.`, 400, "INVALID_STATUS_TRANSITION");
  }

  const now = new Date();
  const timestamp =
    input.status === "SENT" ? { sentAt: current.sentAt ?? now } :
    input.status === "RECEIVED" ? { receivedAt: current.receivedAt ?? now } :
    input.status === "ACCEPTED" ? { acceptedAt: current.acceptedAt ?? now } :
    input.status === "REJECTED" ? { rejectedAt: current.rejectedAt ?? now } :
    input.status === "VOIDED" ? { voidedAt: current.voidedAt ?? now } : {};

  const row = await prisma.clientQuotation.update({
    where: { id: current.id },
    data: {
      status: input.status,
      outcomeReason: input.reason?.trim() || current.outcomeReason,
      ...timestamp,
      activities: previous === input.status ? undefined : {
        create: {
          activityType: "STATUS_CHANGED",
          actorId: input.actorId,
          actorName: input.actorName,
          previousValue: previous,
          newValue: input.status,
          description: input.reason?.trim() || `Estado actualizado de ${previous} a ${input.status}.`,
        },
      },
    },
    include: quotationInclude,
  });
  if (previous !== input.status) {
    await logClientActivity({
      userId: input.clientId,
      activityType: "QUOTATION_STATUS_CHANGED",
      previousValue: previous,
      newValue: input.status,
      actor: { realm: "executive", id: input.actorId, name: input.actorName },
      description: `Cotización ${current.number}: ${previous} → ${input.status}.`,
    });
  }
  return mapQuotation(row);
}

export async function recordQuotationDelivery(input: {
  clientId: string;
  quotationId: string;
  channel: "EMAIL" | "WHATSAPP";
  success: boolean;
  actorId: string;
  actorName: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  const current = await prisma.clientQuotation.findFirst({
    where: { id: input.quotationId, clientId: input.clientId },
  });
  if (!current) throw new ApiError("Cotización no encontrada.", 404);
  const shouldMarkSent = input.success && current.status === "DRAFT";
  const now = new Date();
  const activityType = input.channel === "EMAIL"
    ? (input.success ? "EMAIL_SENT" : "EMAIL_FAILED")
    : "WHATSAPP_OPENED";
  const row = await prisma.clientQuotation.update({
    where: { id: current.id },
    data: {
      ...(shouldMarkSent ? { status: "SENT", sentAt: current.sentAt ?? now } : {}),
      activities: {
        create: {
          activityType,
          actorId: input.actorId,
          actorName: input.actorName,
          channel: input.channel,
          description: input.channel === "EMAIL"
            ? (input.success ? "Cotización enviada por correo." : "Falló el envío de la cotización por correo.")
            : "Se abrió WhatsApp con el enlace de la cotización.",
          metadata: input.metadata ? jsonValue(input.metadata) : undefined,
        },
      },
    },
    include: quotationInclude,
  });
  if (input.success) {
    await logClientActivity({
      userId: input.clientId,
      activityType: "QUOTATION_SENT",
      newValue: input.channel,
      actor: { realm: "executive", id: input.actorId, name: input.actorName },
      description: input.channel === "EMAIL"
        ? `Cotización ${current.number} enviada por correo.`
        : `Cotización ${current.number}: se abrió WhatsApp para compartirla.`,
    });
  }
  return mapQuotation(row);
}
