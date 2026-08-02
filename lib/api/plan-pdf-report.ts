import { ISAPRE_CATALOG } from "@/lib/isapre-catalog";
import { prisma } from "@/lib/prisma";
import type {
  IsaprePdfSummaryRow,
  MissingPlanPdfRow,
  PlanPdfReport,
} from "@/types/plan-pdf-report";

export async function buildPlanPdfReport(): Promise<PlanPdfReport> {
  const [isapres, plans] = await Promise.all([
    prisma.isapre.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.plan.findMany({
      select: {
        uniqueCode: true,
        planName: true,
        basePriceUf: true,
        hasTop: true,
        pdfUrl: true,
        zones: true,
        isapreId: true,
        isapreRef: { select: { name: true } },
        _count: { select: { coverages: true } },
      },
      orderBy: [{ isapreId: "asc" }, { uniqueCode: "asc" }],
    }),
  ]);

  const catalogNames = new Map(ISAPRE_CATALOG.map((item) => [item.id, item.name]));
  const isapreRows = new Map<string, { id: string; name: string }>();

  for (const item of ISAPRE_CATALOG) {
    isapreRows.set(item.id, { id: item.id, name: item.name });
  }
  for (const isapre of isapres) {
    isapreRows.set(isapre.id, { id: isapre.id, name: isapre.name });
  }

  const plansByIsapre = new Map<string, typeof plans>();
  for (const plan of plans) {
    const bucket = plansByIsapre.get(plan.isapreId) ?? [];
    bucket.push(plan);
    plansByIsapre.set(plan.isapreId, bucket);
  }

  const missingPlans: MissingPlanPdfRow[] = plans
    .filter((plan) => !plan.pdfUrl)
    .map((plan) => ({
      isapreId: plan.isapreId,
      isapre: plan.isapreRef.name,
      uniqueCode: plan.uniqueCode,
      planName: plan.planName,
      basePriceUf: plan.basePriceUf,
      coverageCount: plan._count.coverages,
      zones: plan.zones.join(", "),
      hasTop: plan.hasTop,
    }));

  const missingByIsapre = new Map<string, string[]>();
  for (const row of missingPlans) {
    const codes = missingByIsapre.get(row.isapreId) ?? [];
    codes.push(row.uniqueCode);
    missingByIsapre.set(row.isapreId, codes);
  }

  const summary: IsaprePdfSummaryRow[] = [...isapreRows.values()]
    .sort((a, b) => a.name.localeCompare(b.name, "es"))
    .map((isapre) => {
      const isaprePlans = plansByIsapre.get(isapre.id) ?? [];
      const conPdf = isaprePlans.filter((plan) => plan.pdfUrl).length;
      const sinPdf = isaprePlans.length - conPdf;
      const conCobertura = isaprePlans.filter(
        (plan) => plan._count.coverages > 0,
      ).length;

      return {
        isapreId: isapre.id,
        isapre: catalogNames.get(isapre.id) ?? isapre.name,
        totalPlanes: isaprePlans.length,
        conPdf,
        sinPdf,
        pctPdf:
          isaprePlans.length > 0
            ? Math.round((conPdf / isaprePlans.length) * 1000) / 10
            : 0,
        conCobertura,
        sinCobertura: isaprePlans.length - conCobertura,
        codigosSinPdf: missingByIsapre.get(isapre.id) ?? [],
      };
    });

  const conPdf = plans.filter((plan) => plan.pdfUrl).length;
  const sinPdf = missingPlans.length;

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      isapres: summary.length,
      planes: plans.length,
      conPdf,
      sinPdf,
      pctPdf:
        plans.length > 0 ? Math.round((conPdf / plans.length) * 1000) / 10 : 0,
    },
    summary,
    missingPlans,
  };
}
