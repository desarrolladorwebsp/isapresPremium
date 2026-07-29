"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  LEGAL_BACKDROP_IMAGE,
  LEGAL_FEATURES,
} from "@/constants/legal-backing";
import { siteConfig } from "@/constants/site";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

function LegalFeatureCard({
  title,
  description,
  reducedMotion,
}: {
  title: string;
  description: string;
  reducedMotion: boolean;
}) {
  return (
    <motion.article
      variants={cardVariants}
      whileHover={
        reducedMotion
          ? undefined
          : {
              scale: 1.03,
              y: -4,
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.12)",
            }
      }
      transition={{ duration: 0.2 }}
      className="rounded-2xl bg-emerald-50/95 p-6 text-center shadow-md sm:rounded-3xl sm:p-8"
    >
      <h3 className="text-eyebrow font-bold uppercase tracking-wider text-emerald-800">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-emerald-900/75 sm:text-[0.9375rem]">
        {description}
      </p>
    </motion.article>
  );
}

export function LegalBackingSection() {
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "8%"]);
  const backgroundScale = useTransform(scrollYProgress, [0, 1], [1, 1.05]);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden"
      aria-labelledby="legal-backing-heading"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-brand-teal-dark via-brand-teal to-brand-green" />

      <motion.div
        className="absolute inset-0"
        style={reducedMotion ? undefined : { y: backgroundY, scale: backgroundScale }}
      >
        <Image
          src={LEGAL_BACKDROP_IMAGE}
          alt=""
          fill
          className="object-cover opacity-20 mix-blend-soft-light"
          sizes="100vw"
          priority={false}
        />
      </motion.div>

      <div className="absolute inset-0 bg-emerald-950/20" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[2fr_3fr] lg:gap-14 xl:gap-16">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: -30 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h2
              id="legal-backing-heading"
              className="text-display font-heading font-bold"
            >
              <span className="block tracking-[0.15em] text-white">
                ISAPRES PREMIUM
              </span>
              <span className="mt-2 block font-extrabold tracking-tight text-brand-green">
                TU RESPALDO LEGAL SIN COSTO
              </span>
            </h2>

            <p className="mt-6 max-w-xl text-body-lg leading-relaxed text-white/90">
              Con Isapres Premium no estás solo frente a tu Isapre. Te
              entregamos un equipo legal especializado que te acompaña desde el
              primer reclamo hasta acciones judiciales si es necesario —todo
              incluido en tu plan.
            </p>

            <motion.a
              href={`mailto:${siteConfig.contact.email}`}
              whileHover={reducedMotion ? undefined : { scale: 1.05 }}
              whileTap={reducedMotion ? undefined : { scale: 0.98 }}
              className="mt-8 inline-flex min-h-12 items-center rounded-xl bg-brand-teal-dark px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition-shadow hover:shadow-xl sm:text-base"
            >
              Mándanos un correo
            </motion.a>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial={reducedMotion ? false : "hidden"}
            whileInView={reducedMotion ? undefined : "visible"}
            viewport={{ once: true, margin: "-100px" }}
            className="grid gap-4 sm:grid-cols-2 sm:gap-6"
          >
            {LEGAL_FEATURES.map((feature) => (
              <LegalFeatureCard
                key={feature.title}
                title={feature.title}
                description={feature.description}
                reducedMotion={!!reducedMotion}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
