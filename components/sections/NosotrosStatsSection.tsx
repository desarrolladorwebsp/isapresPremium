"use client";

import { motion, useReducedMotion } from "framer-motion";
import { NOSOTROS_STATS } from "@/constants/nosotros";

export function NosotrosStatsSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      className="border-y border-zinc-100 bg-white px-5 py-12 sm:px-8 sm:py-14 lg:px-10 xl:px-16"
      aria-label="Indicadores Isapres Premium"
    >
      <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {NOSOTROS_STATS.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.4,
                ease: "easeOut",
                delay: index * 0.05,
              }}
              className="flex flex-col items-center text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-brand-teal/25 text-brand-teal">
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </div>
              <p className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-brand-teal sm:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-zinc-500">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
