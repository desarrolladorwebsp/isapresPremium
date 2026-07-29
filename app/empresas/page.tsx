import type { Metadata } from "next";
import { EmpresasHeroSection } from "@/components/sections/EmpresasHeroSection";
import { EmpresasNewsSection } from "@/components/sections/EmpresasNewsSection";
import { EmpresasServiceSection } from "@/components/sections/EmpresasServiceSection";
import { IsapresMarquee } from "@/components/sections/IsapresMarquee";
import { createPageMetadata } from "@/constants/seo";

export const metadata: Metadata = createPageMetadata("empresas");

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
