import { cookies } from "next/headers";
import { PublicCotizadorView } from "@/components/cotizador";
import {
  AGENT_QUERY_PARAM,
  PARTNER_ENTITY_COOKIE,
  PARTNER_ENTITY_QUERY_PARAM,
} from "@/lib/partner-entity/constants";
import { resolvePartnerEntityForCotizador } from "@/lib/partner-entity/server";

interface EmbedHomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readSingleParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function EmbedHomePage({ searchParams }: EmbedHomePageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const cookieSlug = cookieStore.get(PARTNER_ENTITY_COOKIE)?.value;
  const agentKey =
    readSingleParam(params[AGENT_QUERY_PARAM]) ??
    readSingleParam(params[PARTNER_ENTITY_QUERY_PARAM]);

  const entity = await resolvePartnerEntityForCotizador(agentKey, cookieSlug);

  return <PublicCotizadorView entity={entity} embedMode />;
}
