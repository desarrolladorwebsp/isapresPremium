"use client";

import { Handshake, HeartPulse, Star, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  NOSOTROS_VALORES,
  NOSOTROS_VALORES_ITEMS,
} from "@/constants/nosotros";

const VALOR_ICONS: LucideIcon[] = [HeartPulse, Star, Handshake];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.14 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" as const },
  },
};

function ValorCard({
  title,
  description,
  icon: Icon,
  reducedMotion,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  reducedMotion: boolean;
}) {
  return (
    <motion.article
      variants={cardVariants}
      whileHover={
        reducedMotion
          ? undefined
          : { y: -6, boxShadow: "0 20px 40px rgba(0, 184, 148, 0.12)" }
      }
      className="group flex flex-col items-center rounded-2xl border border-zinc-100 bg-white px-6 py-10 shadow-sm transition-colors hover:border-brand-green/20 sm:rounded-3xl sm:px-8 sm:py-12"
    >
      <motion.div
        whileHover={reducedMotion ? undefined : { scale: 1.08 }}
        transition={{ type: "spring", stiffness: 320, damping: 18 }}
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-brand-green/70 bg-brand-green/5 sm:h-24 sm:w-24"
      >
        <Icon
          className="h-9 w-9 text-brand-green transition-transform motion-safe:group-hover:scale-110 sm:h-10 sm:w-10"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </motion.div>

      <h3 className="text-h3 font-heading font-bold tracking-tight text-zinc-800">
        {title}
      </h3>
      <p className="mt-3 max-w-[16rem] text-center text-sm leading-relaxed text-zinc-500 sm:text-base">
        {description}
      </p>
    </motion.article>
  );
}

export function NosotrosValoresSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      className="bg-white px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24 xl:px-16"
      aria-labelledby="nosotros-valores-heading"
    >
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center"
        >
          <h2
            id="nosotros-valores-heading"
            className="text-h2 font-heading font-extrabold uppercase tracking-wide"
          >
            <span className="text-brand-green">{NOSOTROS_VALORES.titleGreen}</span>{" "}
            <span className="text-zinc-800">{NOSOTROS_VALORES.titleDark}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-body-lg text-zinc-500">
            {NOSOTROS_VALORES.description}
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial={reducedMotion ? false : "hidden"}
          whileInView={reducedMotion ? undefined : "visible"}
          viewport={{ once: true, margin: "-60px" }}
          className="mt-12 grid gap-6 sm:mt-14 sm:grid-cols-3 sm:gap-5 lg:gap-8"
        >
          {NOSOTROS_VALORES_ITEMS.map((valor, index) => (
            <ValorCard
              key={valor.title}
              title={valor.title}
              description={valor.description}
              icon={VALOR_ICONS[index]}
              reducedMotion={!!reducedMotion}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
