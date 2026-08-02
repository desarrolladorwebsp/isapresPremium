import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Cotizador embebible",
  description: "Widget embebido del cotizador de planes Isapre.",
  noIndex: true,
});

export default function EmbedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
