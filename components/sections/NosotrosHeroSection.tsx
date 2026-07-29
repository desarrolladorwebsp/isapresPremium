"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  NOSOTROS_HERO,
  NOSOTROS_HERO_VIDEOS,
  NOSOTROS_TYPEWRITER_PHRASES,
} from "@/constants/nosotros";
import { BackgroundSlideshow } from "@/components/ui/BackgroundSlideshow";
import { TypewriterText } from "@/components/ui/TypewriterText";

export function NosotrosHeroSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] flex-col overflow-hidden">
      <BackgroundSlideshow videos={NOSOTROS_HERO_VIDEOS} intervalMs={8000} />

      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-white/35 via-black/15 to-black/45"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-1 items-center px-5 py-20 sm:px-8 sm:py-16 lg:px-10 xl:px-16">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto w-full max-w-7xl"
        >
          <p className="flex items-center gap-3 text-eyebrow font-semibold uppercase tracking-widest text-white">
            <span
              className="h-px w-10 bg-brand-green sm:w-12"
              aria-hidden="true"
            />
            {NOSOTROS_HERO.eyebrow}
          </p>

          <h1 className="mt-5 text-hero text-balance font-heading font-extrabold tracking-tight text-brand-teal-dark sm:mt-6">
            {NOSOTROS_HERO.heading}
          </h1>

          <p className="mt-3 text-hero-sub font-heading font-semibold capitalize tracking-tight sm:mt-4">
            <TypewriterText phrases={NOSOTROS_TYPEWRITER_PHRASES} />
          </p>
        </motion.div>
      </div>
    </section>
  );
}
