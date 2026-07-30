"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Star } from "lucide-react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useRef } from "react";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import {
  LEGAL_BACKDROP_IMAGE,
  LEGAL_BACKING,
  LEGAL_FEATURES,
  type LegalFeature,
} from "@/constants/legal-backing";
import { RESPALDO_LEGAL_CTA } from "@/constants/respaldo-legal";
import { getWhatsAppUrl } from "@/constants/site";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

function LegalFeatureCard({
  feature,
  reducedMotion,
}: {
  feature: LegalFeature;
  reducedMotion: boolean;
}) {
  const Icon = feature.icon;

  return (
    <motion.article
      variants={cardVariants}
      whileHover={
        reducedMotion
          ? undefined
          : {
              y: -6,
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.18)",
            }
      }
      className="flex flex-col rounded-2xl border border-white/15 bg-white/10 p-5 shadow-lg backdrop-blur-md transition-colors hover:border-brand-green/40 hover:bg-white/15 sm:rounded-3xl sm:p-6"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-green/20 text-brand-green ring-1 ring-white/15 sm:h-12 sm:w-12">
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
      </div>

      <h3 className="mt-4 text-base font-heading font-bold tracking-tight text-white sm:text-lg">
        {feature.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-white/75 sm:text-[0.9375rem]">
        {feature.description}
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
  const whatsappUrl = getWhatsAppUrl(RESPALDO_LEGAL_CTA.whatsappMessage);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden"
      aria-labelledby="legal-backing-heading"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-brand-teal-dark via-brand-teal to-brand-green" />

      <motion.div
        className="absolute inset-0"
        style={
          reducedMotion ? undefined : { y: backgroundY, scale: backgroundScale }
        }
      >
        <Image
          src={LEGAL_BACKDROP_IMAGE}
          alt=""
          fill
          className="object-cover opacity-25 mix-blend-soft-light"
          sizes="100vw"
          priority={false}
        />
      </motion.div>

      {/* Modern layered overlays — soft depth without a flat dark wash */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand-teal-dark/80 via-brand-teal-dark/45 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-teal-dark/50 via-transparent to-brand-teal-dark/20"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-green/20 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-14 xl:gap-16">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: -28 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-xl"
          >
            <div className="inline-flex items-center gap-2 rounded-md border border-amber-400/70 bg-white/15 px-3 py-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-white shadow-sm backdrop-blur-sm sm:text-xs">
              <Star
                className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                aria-hidden="true"
              />
              {LEGAL_BACKING.badge}
            </div>

            <h2
              id="legal-backing-heading"
              className="mt-5 text-display text-balance font-heading font-extrabold tracking-tight"
            >
              <span className="block text-white">
                {LEGAL_BACKING.headingLead}
              </span>
              <span className="mt-1 block text-brand-green">
                {LEGAL_BACKING.headingAccent}
              </span>
            </h2>

            <p className="mt-5 max-w-lg text-body-lg leading-relaxed text-white/85">
              {LEGAL_BACKING.description}
            </p>

            <div className="mt-6 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-green text-white shadow-md">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-white sm:text-[0.9375rem]">
                  {LEGAL_BACKING.highlightTitle}
                </p>
                <p className="mt-0.5 text-sm text-white/70">
                  {LEGAL_BACKING.highlightSubtitle}
                </p>
              </div>
            </div>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <motion.a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={reducedMotion ? undefined : { scale: 1.04 }}
                whileTap={reducedMotion ? undefined : { scale: 0.97 }}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#25D366] px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition-shadow hover:shadow-xl sm:text-base"
              >
                <WhatsAppIcon className="h-5 w-5" />
                WhatsApp
              </motion.a>

              <Link
                href="/respaldo-legal"
                className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:text-base"
              >
                Conoce más
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial={reducedMotion ? false : "hidden"}
            whileInView={reducedMotion ? undefined : "visible"}
            viewport={{ once: true, margin: "-100px" }}
            className="grid gap-4 sm:grid-cols-2 sm:gap-5"
          >
            {LEGAL_FEATURES.map((feature) => (
              <LegalFeatureCard
                key={feature.title}
                feature={feature}
                reducedMotion={!!reducedMotion}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
