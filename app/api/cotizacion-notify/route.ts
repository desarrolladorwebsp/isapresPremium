import { NextResponse } from "next/server";
import { ApiError, apiErrorResponse, parseJsonBody } from "@/lib/api/api-error";
import { parseCotizacionNotifyInput } from "@/lib/email/cotizacion-notify-schema";
import { sendCotizacionNotifyEmails } from "@/lib/email/send-cotizacion-notify";
import { enforcePublicPostGuard } from "@/lib/security/public-post-guard";

export async function POST(request: Request) {
  try {
    const blocked = enforcePublicPostGuard(request, "cotizacion-notify");
    if (blocked) return blocked;

    const payload = await parseJsonBody(request);
    const data = parseCotizacionNotifyInput(payload);
    const result = await sendCotizacionNotifyEmails(data);

    return NextResponse.json({
      ok: true,
      userId: result.userId,
      adminId: result.adminId,
      adminEmailFailed: result.adminEmailFailed ?? false,
    });
  } catch (error) {
    console.error("POST /api/cotizacion-notify", error);

    if (error instanceof Error && !(error instanceof ApiError)) {
      const { body, status } = apiErrorResponse(
        new ApiError(error.message, 400),
      );
      return NextResponse.json(body, { status });
    }

    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
