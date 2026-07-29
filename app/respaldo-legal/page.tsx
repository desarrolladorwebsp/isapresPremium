import type { Metadata } from "next";
import { RespaldoLegalCtaSection } from "@/components/sections/RespaldoLegalCtaSection";
import { RespaldoLegalHeroSection } from "@/components/sections/RespaldoLegalHeroSection";
import { RespaldoLegalProcessSection } from "@/components/sections/RespaldoLegalProcessSection";
import { RespaldoLegalServicesSection } from "@/components/sections/RespaldoLegalServicesSection";
import { createPageMetadata } from "@/constants/seo";

export const metadata: Metadata = createPageMetadata("respaldoLegal");

export default function RespaldoLegalPage() {
  return (
    <main className="flex-1">
      <RespaldoLegalHeroSection />
      <RespaldoLegalServicesSection />
      <RespaldoLegalProcessSection />
      <RespaldoLegalCtaSection />
    </main>
  );
}
