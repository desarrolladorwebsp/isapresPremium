"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { NOSOTROS_ADVISORY } from "@/constants/nosotros";
import { siteConfig } from "@/constants/site";

export function NosotrosAdvisorySection() {
  const reducedMotion = useReducedMotion();
  const calendlyUrl = siteConfig.calendly.meetingUrl;

  return (
    <section
      className="relative overflow-hidden px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24 xl:px-16"
      aria-labelledby="nosotros-advisory-heading"
    >
      <div className="absolute inset-0 bg-brand-teal-dark" aria-hidden="true" />

      <div className="absolute inset-0" aria-hidden="true">
        <Image
          src={NOSOTROS_ADVISORY.backgroundImage}
          alt=""
          fill
          className="object-cover opacity-30 blur-sm"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-brand-teal-dark/75" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, x: -32 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center lg:text-left"
        >
          <h2
            id="nosotros-advisory-heading"
            className="text-h2 text-balance font-heading font-bold tracking-tight text-white"
          >
            {NOSOTROS_ADVISORY.heading}
          </h2>

          <p className="mt-5 text-body-lg leading-relaxed text-white/90">
            {NOSOTROS_ADVISORY.description}
          </p>

          <motion.a
            href={calendlyUrl}
            target="_blank"
            rel="noopener noreferrer"
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.2 }}
            whileHover={reducedMotion ? undefined : { scale: 1.05, y: -2 }}
            whileTap={reducedMotion ? undefined : { scale: 0.97 }}
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-brand-green px-10 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg transition-colors hover:bg-brand-green/90 hover:shadow-xl sm:text-base"
          >
            {NOSOTROS_ADVISORY.ctaLabel}
          </motion.a>
        </motion.div>

        <div className="relative mx-auto h-[320px] w-full max-w-md sm:h-[360px] lg:mx-0 lg:max-w-lg lg:h-[400px]">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: 40, y: -20 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.65, ease: "easeOut", delay: 0.1 }}
            whileHover={reducedMotion ? undefined : { y: -4 }}
            className="absolute left-0 top-0 z-10 w-[72%] overflow-hidden rounded-2xl border-4 border-white shadow-2xl sm:rounded-3xl"
          >
            <Image
              src={NOSOTROS_ADVISORY.images[0].src}
              alt={NOSOTROS_ADVISORY.images[0].alt}
              width={480}
              height={360}
              className="aspect-[4/3] w-full object-cover"
              sizes="(max-width: 1024px) 60vw, 320px"
            />
          </motion.div>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: 40, y: 20 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.65, ease: "easeOut", delay: 0.25 }}
            whileHover={reducedMotion ? undefined : { y: -4 }}
            className="absolute bottom-0 right-0 z-20 w-[68%] overflow-hidden rounded-2xl border-4 border-white shadow-2xl sm:rounded-3xl"
          >
            <Image
              src={NOSOTROS_ADVISORY.images[1].src}
              alt={NOSOTROS_ADVISORY.images[1].alt}
              width={480}
              height={360}
              className="aspect-[4/3] w-full object-cover"
              sizes="(max-width: 1024px) 55vw, 300px"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
