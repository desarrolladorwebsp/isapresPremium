import type { Metadata } from "next";
import { NosotrosCtaSection } from "@/components/sections/NosotrosCtaSection";
import { NosotrosDifferentiatorsSection } from "@/components/sections/NosotrosDifferentiatorsSection";
import { NosotrosHeroSection } from "@/components/sections/NosotrosHeroSection";
import { NosotrosMissionVisionSection } from "@/components/sections/NosotrosMissionVisionSection";
import { NosotrosStatsSection } from "@/components/sections/NosotrosStatsSection";
import { NosotrosTestimonialsSection } from "@/components/sections/NosotrosTestimonialsSection";
import { createPageMetadata } from "@/constants/seo";

export const metadata: Metadata = createPageMetadata("nosotros");

export default function NosotrosPage() {
  return (
    <main className="flex-1">
      <NosotrosHeroSection />
      <NosotrosMissionVisionSection />
      <NosotrosDifferentiatorsSection />
      <NosotrosTestimonialsSection />
      <NosotrosStatsSection />
      <NosotrosCtaSection />
    </main>
  );
}
