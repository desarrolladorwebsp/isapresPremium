import { HeroSection } from "@/components/sections/HeroSection";
import { IsapresMarquee } from "@/components/sections/IsapresMarquee";
import { LegalBackingSection } from "@/components/sections/LegalBackingSection";

export default function Home() {
  return (
    <main className="flex-1">
      <HeroSection />
      <IsapresMarquee />
      <LegalBackingSection />
    </main>
  );
}
