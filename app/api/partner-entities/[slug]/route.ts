import { NextResponse } from "next/server";
import { getFallbackPartnerEntity } from "@/lib/partner-entity/fallback-entities";
import {
  toPublicPartnerEntity,
  readPartnerEntityBySlug,
} from "@/lib/partner-entity/store";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const normalized = decodeURIComponent(slug).trim().toLowerCase();

    const entity = await readPartnerEntityBySlug(normalized);
    if (entity) {
      return NextResponse.json(toPublicPartnerEntity(entity));
    }

    const fallback = getFallbackPartnerEntity(normalized);
    if (fallback) {
      return NextResponse.json(fallback);
    }

    return NextResponse.json(
      { error: "Entidad no encontrada." },
      { status: 404 },
    );
  } catch (error) {
    console.error("GET /api/partner-entities/[slug]", error);
    return NextResponse.json(
      { error: "No se pudo cargar la entidad." },
      { status: 500 },
    );
  }
}
