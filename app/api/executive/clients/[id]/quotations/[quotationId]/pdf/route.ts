import { NextResponse } from "next/server";
import { requireClientQuotationAccess } from "@/lib/api/client-quotation-access";
import { readClientQuotationEntity } from "@/lib/api/client-quotation-store";
import { buildClientQuotationPdf } from "@/lib/client-quotation/pdf";

interface RouteContext { params: Promise<{ id: string; quotationId: string }> }

export async function GET(request: Request, context: RouteContext) {
  const { id, quotationId } = await context.params;
  await requireClientQuotationAccess(request, id);
  const quotation = await readClientQuotationEntity(id, quotationId);
  if (!quotation) return NextResponse.json({ error: "Cotización no encontrada." }, { status: 404 });
  const pdf = await buildClientQuotationPdf(quotation);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quotation.number}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
