import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Administración",
  description: "Panel de administración de Cotizador Premium.",
  noIndex: true,
});

export default function CotizadorAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
