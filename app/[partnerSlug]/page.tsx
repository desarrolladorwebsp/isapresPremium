import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicCotizadorView } from "@/components/cotizador";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { loadPartnerEntityPage } from "@/lib/partner-entity/server";
import { isEmbedSearchParam } from "@/lib/embed/is-embed-request";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";
import { isLegacySeoRequest } from "@/lib/seo/request-host";
import { buildCotizadorPageJsonLd } from "@/lib/seo/json-ld";
import {
  isReservedRootSegment,
  isValidPartnerSlugSegment,
} from "@/lib/partner-entity/store";

interface PartnerCotizadorPageProps {
  params: Promise<{ partnerSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
  searchParams,
}: PartnerCotizadorPageProps): Promise<Metadata> {
  const { partnerSlug } = await params;
  const query = await searchParams;
  const decodedSlug = decodeURIComponent(partnerSlug).trim().toLowerCase();
  const legacyHost = await isLegacySeoRequest();

  if (isReservedRootSegment(decodedSlug) || !isValidPartnerSlugSegment(decodedSlug)) {
    return buildPageMetadata({
      title: "Página no encontrada",
      noIndex: true,
    });
  }

  const entity = await loadPartnerEntityPage(decodedSlug);

  if (!entity) {
    return buildPageMetadata({
      title: "Página no encontrada",
      noIndex: true,
    });
  }

  if (isEmbedSearchParam(query.embed)) {
    return buildPageMetadata({
      title: `Cotizador embebido — ${entity.name}`,
      noIndex: true,
    });
  }

  return buildPageMetadata({
    title: `Cotizar plan de salud con ${entity.name}`,
    description: `Compara y cotiza planes Isapre con ${entity.name}. Precios según tu edad, ingreso y región en Chile.`,
    path: `/${decodedSlug}`,
    forceNoIndex: legacyHost,
    keywords: [
      "cotizador isapre",
      entity.name.toLowerCase(),
      "planes de salud chile",
    ],
    ogImagePath: entity.logoUrl.startsWith("http") ? entity.logoUrl : undefined,
    ogImageAlt: `Logo de ${entity.name}`,
  });
}

export default async function PartnerCotizadorPage({
  params,
  searchParams,
}: PartnerCotizadorPageProps) {
  const { partnerSlug } = await params;
  const query = await searchParams;
  const decodedSlug = decodeURIComponent(partnerSlug).trim().toLowerCase();

  if (isReservedRootSegment(decodedSlug) || !isValidPartnerSlugSegment(decodedSlug)) {
    notFound();
  }

  const entity = await loadPartnerEntityPage(decodedSlug);

  if (!entity) {
    notFound();
  }

  const embedMode = isEmbedSearchParam(query.embed);

  return (
    <>
      {embedMode ? null : (
        <JsonLdScript
          data={buildCotizadorPageJsonLd({ partnerName: entity.name })}
        />
      )}
      <PublicCotizadorView entity={entity} embedMode={embedMode} />
    </>
  );
}
