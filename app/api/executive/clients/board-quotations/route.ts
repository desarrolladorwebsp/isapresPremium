import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/api-error";
import { AUTH_REALM } from "@/lib/auth/constants";
import { assertSessionStaffSection, requireExecutiveOrAdminSession } from "@/lib/auth/require-auth";
import { summarizeClientBoardQuotations } from "@/lib/executive/client-board";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { realm, user } = await requireExecutiveOrAdminSession(request);
    assertSessionStaffSection(realm, user, "clientes");
    const rows = await prisma.clientQuotation.findMany({
      where: {
        status: { in: ["SENT", "ACCEPTED", "RECEIVED"] },
        client: {
          role: "CLIENT",
          ...(realm === AUTH_REALM.admin ? {} : {
            OR: [{ assignedExecutiveId: user.id }, { trackingExecutiveId: user.id }],
          }),
        },
      },
      select: {
        clientId: true,
        status: true,
        sentAt: true,
        validUntil: true,
        holderSelections: true,
        activities: {
          where: {
            OR: [
              { activityType: "EMAIL_SENT" },
              { activityType: "STATUS_CHANGED", newValue: "SENT" },
            ],
          },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: [{ acceptedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }, { id: "asc" }],
    });

    // A WhatsApp link opening is a distinct activity and does not confirm delivery.
    return NextResponse.json(summarizeClientBoardQuotations(rows.map(({ activities, ...row }) => ({
      ...row,
      sentConfirmed: activities.length > 0,
    }))));
  } catch (error) {
    console.error("GET client board quotations", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
