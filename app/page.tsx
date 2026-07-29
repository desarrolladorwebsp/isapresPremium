import type { Metadata } from "next";
import { ChatbotSection } from "@/components/sections/ChatbotSection";
import { ClinicsCarouselSection } from "@/components/sections/ClinicsCarouselSection";
import { ExpertsContactSection } from "@/components/sections/ExpertsContactSection";
import { GoogleReviewsSection } from "@/components/sections/GoogleReviewsSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { IsapresMarquee } from "@/components/sections/IsapresMarquee";
import { LegalBackingSection } from "@/components/sections/LegalBackingSection";
import { createPageMetadata } from "@/constants/seo";

export const metadata: Metadata = createPageMetadata("home");

export default function Home() {
  return (
    <main className="flex-1">
      <HeroSection />
      <IsapresMarquee />
      <LegalBackingSection />
      <ChatbotSection />
      <ExpertsContactSection />
      <ClinicsCarouselSection />
      <GoogleReviewsSection />
    </main>
  );
}
