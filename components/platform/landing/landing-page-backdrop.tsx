"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  LANDING_FAMILY_HERO_IMAGE,
  LANDING_FAMILY_HERO_ALT,
} from "./landing-visual-config";

/** Fondo ambiental a ancho completo — imagen de familia + degradados de legibilidad. */
export function LandingPageBackdrop() {
  const reducedMotion = useReducedMotion();

  return (
    <div
      className="landing-page-backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <motion.div
        initial={reducedMotion ? false : { scale: 1.06 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0"
      >
        <Image
          src={LANDING_FAMILY_HERO_IMAGE}
          alt={LANDING_FAMILY_HERO_ALT}
          fill
          priority
          className="object-cover object-[68%_center] lg:object-[72%_center]"
          sizes="100vw"
          quality={90}
        />
      </motion.div>

      {/* Degradados premium — legibilidad izquierda, familia visible derecha */}
      <div className="landing-page-backdrop-gradient absolute inset-0" />
    </div>
  );
}
