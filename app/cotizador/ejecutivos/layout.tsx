import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Panel de ejecutivos",
  description: "Panel interno de ejecutivos de Cotizador Premium.",
  noIndex: true,
});

export default function CotizadorEjecutivosLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
