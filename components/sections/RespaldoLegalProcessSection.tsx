"use client";

import { motion, useReducedMotion } from "framer-motion";
import { RESPALDO_LEGAL_PROCESS } from "@/constants/respaldo-legal";

export function RespaldoLegalProcessSection() {
  const reducedMotion = useReducedMotion();
  const steps = RESPALDO_LEGAL_PROCESS.steps;

  return (
    <section
      className="bg-brand-teal-dark px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24"
      aria-labelledby="respaldo-legal-process-heading"
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-eyebrow font-semibold uppercase tracking-widest text-brand-green">
            {RESPALDO_LEGAL_PROCESS.eyebrow}
          </p>
          <h2
            id="respaldo-legal-process-heading"
            className="mt-3 text-h2 text-balance font-heading font-bold tracking-tight text-white"
          >
            {RESPALDO_LEGAL_PROCESS.heading}
          </h2>
        </motion.div>

        <div className="relative mt-12 sm:mt-16">
          <div
            className="absolute left-5 top-5 hidden h-[calc(100%-2.5rem)] w-px bg-white/15 sm:block lg:left-0 lg:right-0 lg:top-5 lg:h-px lg:w-auto"
            aria-hidden="true"
          />

          <div className="grid gap-8 sm:gap-10 lg:grid-cols-4 lg:gap-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={reducedMotion ? false : { opacity: 0, y: 24 }}
                whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.5,
                  ease: "easeOut",
                  delay: index * 0.1,
                }}
                className="relative flex gap-4 sm:gap-5 lg:flex-col lg:gap-4"
              >
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-brand-green bg-brand-teal-dark text-base font-bold text-brand-green">
                  {index + 1}
                </div>

                <div className="lg:mt-1">
                  <h3 className="text-base font-heading font-bold tracking-tight text-white sm:text-lg">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/75 sm:text-[0.9375rem]">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
