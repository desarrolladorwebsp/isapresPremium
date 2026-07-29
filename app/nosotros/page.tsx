import type { Metadata } from "next";
import { NosotrosAboutSection } from "@/components/sections/NosotrosAboutSection";
import { NosotrosAdvisorySection } from "@/components/sections/NosotrosAdvisorySection";
import { NosotrosHeroSection } from "@/components/sections/NosotrosHeroSection";
import { NosotrosValoresSection } from "@/components/sections/NosotrosValoresSection";

export const metadata: Metadata = {
  title: "Nosotros",
  description:
    "Conoce a Isapres Premium: empresas, valores y personas al servicio de tu salud.",
};

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
