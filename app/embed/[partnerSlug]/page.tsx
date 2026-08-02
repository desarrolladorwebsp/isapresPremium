import { notFound } from "next/navigation";
import { PublicCotizadorView } from "@/components/cotizador";
import { loadPartnerEntityPage } from "@/lib/partner-entity/server";
import {
  isReservedRootSegment,
  isValidPartnerSlugSegment,
} from "@/lib/partner-entity/store";

interface EmbedPartnerPageProps {
  params: Promise<{ partnerSlug: string }>;
}

export default async function EmbedPartnerPage({ params }: EmbedPartnerPageProps) {
  const { partnerSlug } = await params;
  const decodedSlug = decodeURIComponent(partnerSlug).trim().toLowerCase();

  if (isReservedRootSegment(decodedSlug) || !isValidPartnerSlugSegment(decodedSlug)) {
    notFound();
  }

  const entity = await loadPartnerEntityPage(decodedSlug);

  if (!entity) {
    notFound();
  }

  return <PublicCotizadorView entity={entity} embedMode />;
}
