import { NextResponse } from "next/server";
import { readPublishedPlanReviews } from "@/lib/api/plan-review-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(Number(limitParam) || 12, 24) : 12;

    const reviews = await readPublishedPlanReviews(limit);

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("GET /api/reviews/public", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las reseñas." },
      { status: 500 },
    );
  }
}
