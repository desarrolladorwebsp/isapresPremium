import { NextResponse } from "next/server";
import {
  assignQuoteToExecutive,
  readQuoteById,
  updateQuoteAssignment,
  updateQuoteStatus,
} from "@/lib/api/quote-store";
import { apiErrorResponse, parseJsonBody } from "@/lib/api/api-error";
import {
  requireAdminSession,
  requireExecutiveSession,
} from "@/lib/auth/require-auth";
import type { QuoteActivityActor } from "@/types/quote-activity";
import type { QuoteStatus } from "@/types/quote";
import { QUOTE_STATUS_OPTIONS } from "@/lib/quote-status";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const VALID_STATUSES = new Set<QuoteStatus>(QUOTE_STATUS_OPTIONS);

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;
    const quote = await readQuoteById(id);

    if (!quote) {
      return NextResponse.json({ error: "Cotización no encontrada." }, { status: 404 });
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error("GET /api/quotes/[id]", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = (await parseJsonBody(request)) as Record<string, unknown>;

    let isAdmin = false;
    let executiveId: string | null = null;
    let actor: QuoteActivityActor = { realm: "system", name: "Sistema" };

    try {
      const admin = await requireAdminSession(request);
      isAdmin = true;
      actor = { realm: "admin", id: admin.user.id, name: admin.user.fullName };
    } catch {
      const executive = await requireExecutiveSession(request);
      executiveId = executive.user.id;
      actor = {
        realm: "executive",
        id: executive.user.id,
        name: executive.user.fullName,
      };
    }

    const quote = await readQuoteById(id);
    if (!quote) {
      return NextResponse.json({ error: "Cotización no encontrada." }, { status: 404 });
    }

    const status =
      typeof payload.status === "string" &&
      VALID_STATUSES.has(payload.status as QuoteStatus)
        ? (payload.status as QuoteStatus)
        : undefined;

    if (payload.assignToMe === true) {
      if (!executiveId) {
        return NextResponse.json({ error: "No autorizado." }, { status: 403 });
      }

      const updated = await assignQuoteToExecutive(id, executiveId, actor);
      return NextResponse.json(updated);
    }

    if (payload.executiveAccountId !== undefined) {
      if (!isAdmin) {
        return NextResponse.json({ error: "No autorizado." }, { status: 403 });
      }

      const executiveAccountId =
        payload.executiveAccountId === null
          ? null
          : typeof payload.executiveAccountId === "string"
            ? payload.executiveAccountId
            : null;

      const updated = await updateQuoteAssignment({
        quoteId: id,
        executiveAccountId,
        status,
        actor,
      });
      return NextResponse.json(updated);
    }

    if (status) {
      if (isAdmin) {
        const updated = await updateQuoteAssignment({
          quoteId: id,
          executiveAccountId: quote.executiveAccountId ?? null,
          status,
          actor,
        });
        return NextResponse.json(updated);
      }

      if (!executiveId || quote.executiveAccountId !== executiveId) {
        return NextResponse.json(
          { error: "Solo puedes actualizar leads asignados a ti." },
          { status: 403 },
        );
      }

      const updated = await updateQuoteStatus(id, status, actor);
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Sin cambios válidos." }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/quotes/[id]", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
