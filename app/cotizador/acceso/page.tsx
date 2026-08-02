import type { Metadata } from "next";
import StaffLoginPageClient from "./login-client";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Acceso staff",
  description: "Inicio de sesión para ejecutivos y administradores de Cotizador Premium.",
  path: "/cotizador/acceso",
  noIndex: true,
});

export default function StaffLoginPage() {
  return <StaffLoginPageClient />;
}
