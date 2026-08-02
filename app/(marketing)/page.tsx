import type { Metadata } from "next";
import { ChatbotSection } from "@/components/sections/ChatbotSection";
import { ClinicsCarouselSection } from "@/components/sections/ClinicsCarouselSection";
import { ExpertsContactSection } from "@/components/sections/ExpertsContactSection";
import { GoogleReviewsSection } from "@/components/sections/GoogleReviewsSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { LegalBackingSection } from "@/components/sections/LegalBackingSection";
import { HERO_POSTER, HERO_POSTER_MOBILE } from "@/constants/hero";
import { createPageMetadata } from "@/constants/seo";

export const metadata: Metadata = createPageMetadata("home");

export default function Home() {
  return (
    <main className="flex-1">
      <link
        rel="preload"
        as="image"
        href={HERO_POSTER}
        media="(min-width: 768px)"
      />
      <link
        rel="preload"
        as="image"
        href={HERO_POSTER_MOBILE}
        media="(max-width: 767px)"
      />
      <HeroSection />
      <LegalBackingSection />
      <ChatbotSection />
      <ExpertsContactSection />
      <ClinicsCarouselSection />
      <GoogleReviewsSection />
    </main>
  );
}
