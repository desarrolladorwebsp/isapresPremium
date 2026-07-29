import type { Metadata } from "next";
import { EmpresasHeroSection } from "@/components/sections/EmpresasHeroSection";
import { EmpresasNewsSection } from "@/components/sections/EmpresasNewsSection";
import { EmpresasServiceSection } from "@/components/sections/EmpresasServiceSection";
import { IsapresMarquee } from "@/components/sections/IsapresMarquee";

export const metadata: Metadata = {
  title: "Empresas",
  description:
    "Asesoría empresarial en Isapres: transparencia y seguridad para tu equipo.",
};

export default function EmpresasPage() {
  return (
    <main className="flex-1">
      <EmpresasHeroSection />
      <EmpresasServiceSection />
      <EmpresasNewsSection />
      <IsapresMarquee />
    </main>
  );
}
