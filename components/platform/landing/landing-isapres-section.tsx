"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { landing } from "./landing-tokens";
import { LandingIsapreCard } from "./landing-isapre-card";
import { LandingSectionBackdrop } from "./landing-section-backdrop";
import { LANDING_ISAPRES } from "./landing-isapres-data";
import { LANDING_SECTION_BACKGROUNDS, LANDING_SECTION_BACKGROUND_ALTS } from "./landing-visual-config";

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 36 : -36,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 36 : -36,
    opacity: 0,
  }),
};

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      {direction === "left" ? (
        <path d="M12 4l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M8 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function resolveItemsPerPage(width: number): number {
  if (width >= 1024) return 6;
  if (width >= 768) return 4;
  return 2;
}

export function LandingIsapresSection() {
  const reducedMotion = useReducedMotion();
  const [itemsPerPage, setItemsPerPage] = useState(2);
  const [[page, direction], setPage] = useState([0, 0]);

  useEffect(() => {
    const handleResize = () => {
      setItemsPerPage(resolveItemsPerPage(window.innerWidth));
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const totalPages = Math.ceil(LANDING_ISAPRES.length / itemsPerPage);

  useEffect(() => {
    if (page >= totalPages && totalPages > 0) {
      setPage([totalPages - 1, 0]);
    }
  }, [totalPages, page]);

  const paginate = useCallback(
    (step: number) => {
      if (totalPages <= 1) return;
      let nextPage = page + step;
      if (nextPage < 0) nextPage = totalPages - 1;
      if (nextPage >= totalPages) nextPage = 0;
      setPage([nextPage, step]);
    },
    [page, totalPages],
  );

  const currentItems = LANDING_ISAPRES.slice(
    page * itemsPerPage,
    (page + 1) * itemsPerPage,
  );

  return (
    <section
      id="isapres"
      className={`${landing.sectionSurface} landing-isapres-section landing-section-with-photo relative overflow-hidden`}
      aria-labelledby="landing-isapres-title"
    >
      <LandingSectionBackdrop
        imageSrc={LANDING_SECTION_BACKGROUNDS.isapres}
        imageAlt={LANDING_SECTION_BACKGROUND_ALTS.isapres}
        variant="isapres"
      />
      <div className="landing-isapres-mesh pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="landing-grid-pattern pointer-events-none absolute inset-0 opacity-35" aria-hidden />

      <div className={`${landing.container} relative py-20 sm:py-24 lg:py-28`}>
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className={landing.badge}>7 Isapres disponibles</span>
          <h2
            id="landing-isapres-title"
            className="landing-text-gradient mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Directorio de Isapres
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed premium-text-secondary sm:text-lg">
            Explora las opciones disponibles en el sistema privado de salud y
            cotiza planes reales con precios actualizados.
          </p>
        </motion.div>

        <div className="relative mt-14 min-h-[480px] sm:mt-16 sm:min-h-[520px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`${page}-${itemsPerPage}`}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 220, damping: 28 },
                opacity: { duration: 0.35 },
              }}
              className="grid grid-cols-1 gap-x-6 gap-y-20 md:grid-cols-2 lg:grid-cols-3 lg:gap-x-8"
            >
              {currentItems.map((item) => (
                <LandingIsapreCard key={item.id} item={item} />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {totalPages > 1 ? (
          <div className="mt-10 flex items-center justify-center gap-5 sm:gap-6">
            <motion.button
              type="button"
              onClick={() => paginate(-1)}
              aria-label="Página anterior"
              whileHover={reducedMotion ? undefined : { scale: 1.05 }}
              whileTap={reducedMotion ? undefined : { scale: 0.97 }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border/80 bg-background/90 text-muted shadow-sm backdrop-blur-sm transition-colors hover:border-primary/30 hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:h-12 sm:w-12"
            >
              <ChevronIcon direction="left" />
            </motion.button>

            <div className="flex items-center gap-2" role="tablist" aria-label="Páginas del directorio">
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  role="tab"
                  aria-selected={index === page}
                  aria-label={`Ir a la página ${index + 1}`}
                  onClick={() => setPage([index, index > page ? 1 : -1])}
                  className={`h-2.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 ${
                    index === page
                      ? "w-8 bg-primary"
                      : "w-2.5 bg-border hover:bg-muted"
                  }`}
                />
              ))}
            </div>

            <motion.button
              type="button"
              onClick={() => paginate(1)}
              aria-label="Página siguiente"
              whileHover={reducedMotion ? undefined : { scale: 1.05 }}
              whileTap={reducedMotion ? undefined : { scale: 0.97 }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border/80 bg-background/90 text-muted shadow-sm backdrop-blur-sm transition-colors hover:border-primary/30 hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:h-12 sm:w-12"
            >
              <ChevronIcon direction="right" />
            </motion.button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
