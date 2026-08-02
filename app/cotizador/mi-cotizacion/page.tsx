import { cookies } from "next/headers";
import type { Metadata } from "next";
import { MiCotizacionView } from "@/components/cotizador/public/mi-cotizacion-view";
import {
  decodeMiCotizacionSnapshot,
  MI_COTIZACION_DATA_PARAM,
} from "@/lib/cotizacion-notify/mi-cotizacion-share";
import {
  AGENT_QUERY_PARAM,
  PARTNER_ENTITY_COOKIE,
  PARTNER_ENTITY_QUERY_PARAM,
} from "@/lib/partner-entity/constants";
import { resolvePartnerEntityForCotizador } from "@/lib/partner-entity/server";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";

interface MiCotizacionPageProps {
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
}: MiCotizacionPageProps): Promise<Metadata> {
  const params = await searchParams;
  const agentKey =
    readSingleParam(params[AGENT_QUERY_PARAM]) ??
    readSingleParam(params[PARTNER_ENTITY_QUERY_PARAM]);
  const cookieStore = await cookies();
  const entity = await resolvePartnerEntityForCotizador(
    agentKey,
    cookieStore.get(PARTNER_ENTITY_COOKIE)?.value,
  );

  const brand = entity?.name ?? "Cotizador Premium";

  return buildPageMetadata({
    title: `Tu cotización — ${brand}`,
    description: `Resumen de tu cotización de planes Isapre con ${brand}.`,
    path: "/cotizador/mi-cotizacion",
    noIndex: true,
  });
}

export default async function MiCotizacionPage({
  searchParams,
}: MiCotizacionPageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const agentKey =
    readSingleParam(params[AGENT_QUERY_PARAM]) ??
    readSingleParam(params[PARTNER_ENTITY_QUERY_PARAM]);
  const entity = await resolvePartnerEntityForCotizador(
    agentKey,
    cookieStore.get(PARTNER_ENTITY_COOKIE)?.value,
  );
  const snapshot = decodeMiCotizacionSnapshot(
    readSingleParam(params[MI_COTIZACION_DATA_PARAM]),
  );

  return <MiCotizacionView entity={entity} snapshot={snapshot} />;
}
