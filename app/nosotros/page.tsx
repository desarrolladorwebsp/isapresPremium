import type { Metadata } from "next";
import { NosotrosAboutSection } from "@/components/sections/NosotrosAboutSection";
import { NosotrosAdvisorySection } from "@/components/sections/NosotrosAdvisorySection";
import { NosotrosHeroSection } from "@/components/sections/NosotrosHeroSection";
import { NosotrosValoresSection } from "@/components/sections/NosotrosValoresSection";
import { createPageMetadata } from "@/constants/seo";

export const metadata: Metadata = createPageMetadata("nosotros");

export default function NosotrosPage() {
  return (
    <main className="flex-1">
      <NosotrosHeroSection />
      <NosotrosValoresSection />
      <NosotrosAboutSection />
      <NosotrosAdvisorySection />
    </main>
  );
}
