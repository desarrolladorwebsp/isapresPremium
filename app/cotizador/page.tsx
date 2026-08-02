import { cookies } from "next/headers";
import type { Metadata } from "next";
import { PublicCotizadorView } from "@/components/cotizador";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import {
  AGENT_QUERY_PARAM,
  PARTNER_ENTITY_COOKIE,
  PARTNER_ENTITY_QUERY_PARAM,
} from "@/lib/partner-entity/constants";
import { resolvePartnerEntityForCotizador } from "@/lib/partner-entity/server";
import { isEmbedSearchParam } from "@/lib/embed/is-embed-request";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";
import { isLegacySeoRequest } from "@/lib/seo/request-host";
import { buildCotizadorPageJsonLd } from "@/lib/seo/json-ld";

interface CotizadorPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readSingleParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export async function generateMetadata({
  searchParams,
}: CotizadorPageProps): Promise<Metadata> {
  const params = await searchParams;
  const legacyHost = await isLegacySeoRequest();

  if (isEmbedSearchParam(params.embed)) {
    return buildPageMetadata({
      title: "Cotizador embebido",
      description: "Vista embebida del cotizador de planes Isapre.",
      noIndex: true,
    });
  }

  const cookieStore = await cookies();
  const agentKey =
    readSingleParam(params[AGENT_QUERY_PARAM]) ??
    readSingleParam(params[PARTNER_ENTITY_QUERY_PARAM]);
  const entity = await resolvePartnerEntityForCotizador(
    agentKey,
    cookieStore.get(PARTNER_ENTITY_COOKIE)?.value,
  );

  const isBranded =
    entity && entity.slug !== "cotizadorpremium" && agentKey?.trim();

  const title = isBranded
    ? `Cotizar plan de salud con ${entity!.name}`
    : "Cotizador Premium — Cotiza tu plan Isapre";

  const description = isBranded
    ? `Compara planes Isapre con ${entity!.name}. Precios personalizados según tu edad, ingreso mensual y región en Chile.`
    : "Cotiza y compara planes Isapre en Cotizador Premium. Precios personalizados según tu edad, ingreso mensual y región en Chile.";

  const path = agentKey?.trim()
    ? `/cotizador?agent=${encodeURIComponent(agentKey.trim())}`
    : "/cotizador";

  return buildPageMetadata({
    title,
    description,
    path,
    absoluteTitle: !isBranded,
    forceNoIndex: legacyHost,
    keywords: [
      "cotizador premium",
      "cotizar plan isapre",
      "comparador planes salud",
      "precio plan isapre",
      "cotizador online chile",
      ...(isBranded ? [entity!.name.toLowerCase()] : ["cotizadorpremium.cl"]),
    ],
  });
}

export default async function CotizadorPage({ searchParams }: CotizadorPageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const cookieSlug = cookieStore.get(PARTNER_ENTITY_COOKIE)?.value;
  const agentKey =
    readSingleParam(params[AGENT_QUERY_PARAM]) ??
    readSingleParam(params[PARTNER_ENTITY_QUERY_PARAM]);

  const entity = await resolvePartnerEntityForCotizador(agentKey, cookieSlug);
  const embedMode = isEmbedSearchParam(params.embed);

  const isBranded =
    entity && entity.slug !== "cotizadorpremium" && agentKey?.trim();

  return (
    <>
      {embedMode ? null : (
        <JsonLdScript
          data={buildCotizadorPageJsonLd({
            partnerName: isBranded ? entity!.name : undefined,
          })}
        />
      )}
      <PublicCotizadorView entity={entity} embedMode={embedMode} />
    </>
  );
}
