"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { NOSOTROS_MISSION_VISION } from "@/constants/nosotros";

export function NosotrosMissionVisionSection() {
  const reducedMotion = useReducedMotion();
  const { mission, vision } = NOSOTROS_MISSION_VISION;
  const MissionIcon = mission.icon;
  const VisionIcon = vision.icon;

  return (
    <section
      className="bg-white px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24 xl:px-16"
      aria-label="Misión y visión"
    >
      <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 md:gap-6 lg:gap-8">
        <motion.article
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col rounded-2xl border border-brand-teal/15 bg-white p-7 shadow-sm sm:p-8 lg:p-10"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-teal/10 text-brand-teal">
            <MissionIcon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
          </div>
          <h2 className="mt-5 font-heading text-h2 font-bold tracking-tight text-brand-teal-dark">
            {mission.titleBefore}{" "}
            <span className="text-brand-green">{mission.titleAccent}</span>
          </h2>
          <p className="mt-4 flex-1 text-body-lg leading-relaxed text-zinc-600">
            {mission.description}
          </p>
          <Link
            href={mission.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-1.5 self-end text-sm font-semibold text-brand-teal transition-colors hover:text-brand-teal-dark"
          >
            {mission.linkLabel}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </motion.article>

        <motion.article
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
          className="flex flex-col rounded-2xl border border-brand-teal/15 bg-white p-7 shadow-sm sm:p-8 lg:p-10"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-teal/10 text-brand-teal">
            <VisionIcon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
          </div>
          <h2 className="mt-5 font-heading text-h2 font-bold tracking-tight text-brand-teal-dark">
            {vision.titleBefore}{" "}
            <span className="text-brand-green">{vision.titleAccent}</span>
          </h2>
          <p className="mt-4 flex-1 text-body-lg leading-relaxed text-zinc-600">
            {vision.description}
          </p>
        </motion.article>
      </div>
    </section>
  );
}
