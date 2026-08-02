import { getFallbackPartnerEntity } from "@/lib/partner-entity/fallback-entities";
import {
  readPartnerEntityByAgentKey,
  toPublicPartnerEntity,
} from "@/lib/partner-entity/store";
import { NextResponse } from "next/server";

interface AgentRouteParams {
  params: Promise<{ embedKey: string }>;
}

export async function GET(_request: Request, { params }: AgentRouteParams) {
  const { embedKey } = await params;
  const normalized = decodeURIComponent(embedKey).trim().toLowerCase();

  const entity = await readPartnerEntityByAgentKey(normalized);
  if (entity) {
    return NextResponse.json(toPublicPartnerEntity(entity));
  }

  const fallback = getFallbackPartnerEntity(normalized);
  if (fallback) {
    return NextResponse.json(fallback);
  }

  return NextResponse.json({ error: "Agente no encontrado" }, { status: 404 });
}
