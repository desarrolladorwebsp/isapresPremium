import { getPrismaClient, prisma } from "@/lib/prisma";
import type { PublicPlanReview } from "@/types/plan-review";

const DEFAULT_PUBLISHED_REVIEWS_LIMIT = 12;

export async function readPublishedPlanReviews(
  limit = DEFAULT_PUBLISHED_REVIEWS_LIMIT,
): Promise<PublicPlanReview[]> {
  if (!getPrismaClient().planReview) {
    console.warn(
      "readPublishedPlanReviews: prisma.planReview no disponible. Ejecuta `npx prisma generate` y reinicia el servidor.",
    );
    return [];
  }

  try {
    const rows = await prisma.planReview.findMany({
      where: { published: true },
      orderBy: [{ featured: "desc" }, { displayOrder: "asc" }, { createdAt: "desc" }],
      take: limit,
      include: {
        plan: {
          select: {
            uniqueCode: true,
            planName: true,
            isapreRef: { select: { name: true } },
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      authorName: row.authorName,
      authorAvatarUrl: row.authorAvatarUrl,
      executiveRating: row.executiveRating,
      comment: row.comment,
      planCode: row.plan.uniqueCode,
      planName: row.plan.planName,
      isapreName: row.plan.isapreRef.name,
      createdAt: row.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error("readPublishedPlanReviews", error);
    return [];
  }
}
