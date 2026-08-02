import type { Metadata } from "next";
import { EmpresasHeroSection } from "@/components/sections/EmpresasHeroSection";
import { EmpresasNewsSection } from "@/components/sections/EmpresasNewsSection";
import { EmpresasServiceSection } from "@/components/sections/EmpresasServiceSection";
import {
  EMPRESAS_HERO_POSTER,
  EMPRESAS_HERO_POSTER_MOBILE,
} from "@/constants/empresas";
import { createPageMetadata } from "@/constants/seo";

export const metadata: Metadata = createPageMetadata("empresas");

export default function EmpresasPage() {
  return (
    <main className="flex-1">
      <link
        rel="preload"
        as="image"
        href={EMPRESAS_HERO_POSTER}
        media="(min-width: 768px)"
      />
      <link
        rel="preload"
        as="image"
        href={EMPRESAS_HERO_POSTER_MOBILE}
        media="(max-width: 767px)"
      />
      <EmpresasHeroSection />
      <EmpresasServiceSection />
      <EmpresasNewsSection />
    </main>
  );
}
