import { NextResponse } from "next/server";
import { ApiError, apiErrorResponse, parseJsonBody } from "@/lib/api/api-error";
import { parseCompanyAgreementInquiryInput } from "@/lib/email/company-agreement-schema";
import { sendCompanyAgreementInquiryEmail } from "@/lib/email/send-company-agreement-inquiry";
import { enforcePublicPostGuard } from "@/lib/security/public-post-guard";

export async function POST(request: Request) {
  try {
    const blocked = enforcePublicPostGuard(request, "company-agreement");
    if (blocked) return blocked;

    const payload = await parseJsonBody(request);
    const data = parseCompanyAgreementInquiryInput(payload);
    const result = await sendCompanyAgreementInquiryEmail(data);

    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    console.error("POST /api/company-agreement-inquiry", error);

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
