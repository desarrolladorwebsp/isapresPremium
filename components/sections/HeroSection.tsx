"use client";

import { motion, useReducedMotion } from "framer-motion";
import { HERO_VIDEOS, HERO_VIDEOS_MOBILE, TYPEWRITER_PHRASES } from "@/constants/cotizador";
import { HERO_POSTER, HERO_POSTER_MOBILE } from "@/constants/hero";
import { BackgroundSlideshow } from "@/components/ui/BackgroundSlideshow";
import { TypewriterText } from "@/components/ui/TypewriterText";
import { CotizadorForm } from "@/components/sections/CotizadorForm";

export function HeroSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] flex-col overflow-hidden">
      <BackgroundSlideshow
        videos={HERO_VIDEOS}
        mobileVideos={HERO_VIDEOS_MOBILE}
        poster={HERO_POSTER}
        mobilePoster={HERO_POSTER_MOBILE}
      />

      <div className="relative z-10 flex flex-1 flex-col pt-16 sm:pt-14 lg:pt-0">
        <div className="flex flex-1 items-start px-5 pb-10 pt-2 sm:items-center sm:px-8 sm:pt-0 lg:items-stretch lg:px-10 lg:pb-0 xl:px-16 2xl:px-24">
          <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_480px] lg:items-stretch lg:gap-12 xl:max-w-[1400px] xl:grid-cols-[minmax(0,1fr)_520px] xl:gap-16 2xl:max-w-[1500px] 2xl:grid-cols-[minmax(0,1fr)_560px]">
            <div className="flex items-start text-white sm:items-center lg:pr-4">
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 24 }}
                animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <h1 className="text-hero text-balance font-heading font-extrabold tracking-tight">
                  Cotiza el mejor plan de Isapre.
                </h1>
                <p className="mt-4 text-hero-sub font-heading font-semibold capitalize tracking-tight sm:mt-5">
                  <TypewriterText phrases={TYPEWRITER_PHRASES} />
                </p>
              </motion.div>
            </div>

            <div
              id="cotizador"
              className="flex w-full scroll-mt-36 lg:h-full lg:min-h-[calc(100vh-4rem)]"
            >
              <div className="flex h-full w-full max-w-none">
                <CotizadorForm />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
