"use client";

import Image from "next/image";
import { ArrowRight, Users } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { NOSOTROS_HERO } from "@/constants/nosotros";

export function NosotrosHeroSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      className="relative isolate overflow-hidden bg-[#f3f6f5]"
      aria-labelledby="nosotros-hero-heading"
    >
      {/* Desktop: photo as right-side full-height background of the hero */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[48%] lg:block xl:w-[50%]">
        <Image
          src={NOSOTROS_HERO.image}
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="50vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#f3f6f5] via-[#f3f6f5]/35 to-transparent"
          aria-hidden
        />
      </div>

      {/* Mobile: photo as full hero background */}
      <div className="pointer-events-none absolute inset-0 lg:hidden">
        <Image
          src={NOSOTROS_HERO.image}
          alt=""
          fill
          priority
          className="object-cover object-[center_25%]"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#f3f6f5]/95 via-[#f3f6f5]/88 to-[#f3f6f5]/55"
          aria-hidden
        />
      </div>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:gap-8 lg:px-10 lg:py-0 xl:px-16">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 22 }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="max-w-xl"
        >
          <p className="text-eyebrow font-bold uppercase tracking-[0.18em] text-brand-teal">
            {NOSOTROS_HERO.eyebrow}
          </p>

          <h1
            id="nosotros-hero-heading"
            className="mt-4 text-balance font-heading text-[clamp(2.25rem,1.6rem+2.4vw,3.75rem)] font-extrabold leading-[1.08] tracking-tight text-brand-teal-dark"
          >
            {NOSOTROS_HERO.headingBefore}{" "}
            <span className="text-brand-green">
              {NOSOTROS_HERO.headingAccent}
            </span>{" "}
            {NOSOTROS_HERO.headingAfter}
          </h1>

          <p className="mt-5 max-w-lg text-body-lg leading-relaxed text-zinc-600">
            {NOSOTROS_HERO.description}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <motion.a
              href={NOSOTROS_HERO.primaryCta.href}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={reducedMotion ? undefined : { scale: 1.03 }}
              whileTap={reducedMotion ? undefined : { scale: 0.98 }}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-teal px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-teal/25 transition-colors hover:bg-brand-teal-dark sm:text-base"
            >
              {NOSOTROS_HERO.primaryCta.label}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </motion.a>

            <motion.a
              href={NOSOTROS_HERO.secondaryCta.href}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={reducedMotion ? undefined : { scale: 1.03 }}
              whileTap={reducedMotion ? undefined : { scale: 0.98 }}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-brand-teal/25 bg-white px-7 py-3.5 text-sm font-semibold text-brand-teal-dark transition-colors hover:border-brand-teal/40 hover:bg-brand-teal/5 sm:text-base"
            >
              <WhatsAppIcon className="h-5 w-5 text-[#25D366]" />
              {NOSOTROS_HERO.secondaryCta.label}
            </motion.a>
          </div>
        </motion.div>

        <div className="relative flex min-h-[200px] items-end justify-end lg:min-h-[70vh]">
          <motion.aside
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
            className="w-full max-w-sm rounded-2xl border border-white/80 bg-white p-5 shadow-xl sm:p-6 lg:mb-16 lg:mr-2"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-green/15 text-brand-green">
                <Users className="h-5 w-5" strokeWidth={2} aria-hidden />
              </div>
              <div>
                <p className="font-heading text-2xl font-extrabold tracking-tight text-brand-green sm:text-3xl">
                  {NOSOTROS_HERO.floatingCard.value}
                </p>
                <p className="mt-0.5 text-sm leading-snug text-zinc-600">
                  {NOSOTROS_HERO.floatingCard.label}
                </p>
              </div>
            </div>
          </motion.aside>
        </div>
      </div>

      <span className="sr-only">{NOSOTROS_HERO.imageAlt}</span>
    </section>
  );
}
