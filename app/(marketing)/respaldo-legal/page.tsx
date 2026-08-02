import type { Metadata } from "next";
import { RespaldoLegalCtaSection } from "@/components/sections/RespaldoLegalCtaSection";
import { RespaldoLegalHeroSection } from "@/components/sections/RespaldoLegalHeroSection";
import { RespaldoLegalProcessSection } from "@/components/sections/RespaldoLegalProcessSection";
import { RespaldoLegalServicesSection } from "@/components/sections/RespaldoLegalServicesSection";
import {
  RESPALDO_LEGAL_HERO_POSTER,
  RESPALDO_LEGAL_HERO_POSTER_MOBILE,
} from "@/constants/respaldo-legal";
import { createPageMetadata } from "@/constants/seo";

export const metadata: Metadata = createPageMetadata("respaldoLegal");

export default function RespaldoLegalPage() {
  return (
    <main className="flex-1">
      <link
        rel="preload"
        as="image"
        href={RESPALDO_LEGAL_HERO_POSTER}
        media="(min-width: 768px)"
      />
      <link
        rel="preload"
        as="image"
        href={RESPALDO_LEGAL_HERO_POSTER_MOBILE}
        media="(max-width: 767px)"
      />
      <RespaldoLegalHeroSection />
      <RespaldoLegalServicesSection />
      <RespaldoLegalProcessSection />
      <RespaldoLegalCtaSection />
    </main>
  );
}
