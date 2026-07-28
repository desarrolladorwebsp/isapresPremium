"use client";

import { HERO_SLIDES, TYPEWRITER_PHRASES } from "@/constants/cotizador";
import { BackgroundSlideshow } from "@/components/ui/BackgroundSlideshow";
import { TypewriterText } from "@/components/ui/TypewriterText";
import { CotizadorForm } from "@/components/sections/CotizadorForm";

export function HeroSection() {
  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] flex-col overflow-hidden">
      <BackgroundSlideshow images={HERO_SLIDES} intervalMs={5000} />

      <div className="relative z-10 flex flex-1 flex-col pt-10 sm:pt-12">
        <div className="flex flex-1 items-center px-5 pb-10 sm:px-8 lg:px-12 lg:pb-16">
          <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[2fr_3fr] lg:items-center lg:gap-12">
            <div className="text-white">
              <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl xl:text-[3.25rem]">
                Cotiza el mejor plan de Isapre.
              </h1>
              <p className="mt-4 text-2xl font-semibold capitalize sm:text-3xl lg:text-4xl">
                <TypewriterText phrases={TYPEWRITER_PHRASES} />
              </p>
            </div>

            <div id="cotizador" className="w-full scroll-mt-36">
              <CotizadorForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
