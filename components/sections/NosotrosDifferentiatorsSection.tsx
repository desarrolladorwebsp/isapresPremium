"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { NOSOTROS_DIFFERENTIATORS } from "@/constants/nosotros";

export function NosotrosDifferentiatorsSection() {
  const reducedMotion = useReducedMotion();
  const { titleBefore, titleAccent, titleAfter, items } =
    NOSOTROS_DIFFERENTIATORS;

  return (
    <section
      className="bg-[#f4f7f6] px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24 xl:px-16"
      aria-labelledby="nosotros-differentiators-heading"
    >
      <div className="mx-auto max-w-7xl">
        <motion.h2
          id="nosotros-differentiators-heading"
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center font-heading text-h2 font-extrabold uppercase tracking-tight text-brand-teal-dark"
        >
          {titleBefore}{" "}
          <span className="text-brand-green">{titleAccent}</span>
          {titleAfter}
        </motion.h2>

        <div className="mt-12 grid gap-6 sm:mt-14 md:grid-cols-3 md:gap-5 lg:gap-7">
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.article
                key={item.title}
                initial={reducedMotion ? false : { opacity: 0, y: 24 }}
                whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.5,
                  ease: "easeOut",
                  delay: index * 0.08,
                }}
                className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-100 transition-shadow hover:shadow-lg"
              >
                <div className="relative aspect-[16/11] overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.imageAlt}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-brand-teal-dark/40 via-transparent to-transparent"
                    aria-hidden
                  />
                  <div className="absolute bottom-3 left-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-teal text-white shadow-md ring-4 ring-white">
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-heading text-h3 font-bold tracking-tight text-brand-teal-dark">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-[0.9375rem]">
                    {item.description}
                  </p>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
