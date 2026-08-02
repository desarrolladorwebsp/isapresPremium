import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IsapreDetailView } from "@/components/platform/isapre/isapre-detail-view";
import { ISAPRE_PAGE_SLUGS } from "@/lib/isapre-pages/content";
import { loadIsaprePageData } from "@/lib/isapre-pages/load-isapre-page";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";

interface IsapreDetailPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return ISAPRE_PAGE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: IsapreDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadIsaprePageData(slug);

  if (!data) {
    return buildPageMetadata({
      title: "Isapre no encontrada",
      noIndex: true,
    });
  }

  const { content, stats } = data;
  const priceHint =
    stats.minPriceUf !== null
      ? ` Desde ${stats.minPriceUf.toLocaleString("es-CL")} UF.`
      : "";

  return buildPageMetadata({
    title: `Planes ${content.name} — Cotizar Isapre en Chile`,
    description: `${content.tagline}.${priceHint} Compara ${stats.planCount > 0 ? `${stats.planCount}+ planes` : "planes"} de ${content.name} con precios actualizados en Cotizador Premium.`,
    path: `/isapres/${content.id}`,
    keywords: [
      `planes ${content.name.toLowerCase()}`,
      `cotizar ${content.name.toLowerCase()}`,
      "isapre chile",
      "cotizador isapre",
    ],
  });
}

export default async function IsapreDetailPage({ params }: IsapreDetailPageProps) {
  const { slug } = await params;
  const data = await loadIsaprePageData(slug);

  if (!data) {
    notFound();
  }

  return <IsapreDetailView data={data} />;
}
