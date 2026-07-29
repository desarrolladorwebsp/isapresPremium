"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { CLINICAS, type Clinica } from "@/constants/clinicas";

const GAP = 24;
const MIN_CARD_WIDTH = 260;
const MAX_VISIBLE_CARDS = 4;

type CarouselLayout = {
  visibleCount: number;
  cardWidth: number;
  cardStep: number;
  viewportWidth: number;
};

function computeLayout(containerWidth: number): CarouselLayout {
  const width = Math.floor(containerWidth);

  for (let count = MAX_VISIBLE_CARDS; count >= 1; count--) {
    const cardWidth = Math.floor((width - (count - 1) * GAP) / count);

    if (cardWidth >= MIN_CARD_WIDTH) {
      const viewportWidth = count * cardWidth + (count - 1) * GAP;
      return {
        visibleCount: count,
        cardWidth,
        cardStep: cardWidth + GAP,
        viewportWidth,
      };
    }
  }

  const cardWidth = Math.max(1, width);
  return {
    visibleCount: 1,
    cardWidth,
    cardStep: cardWidth + GAP,
    viewportWidth: cardWidth,
  };
}

function ClinicaCard({
  clinica,
  width,
  reducedMotion,
}: {
  clinica: Clinica;
  width: number;
  reducedMotion: boolean;
}) {
  return (
    <motion.article
      whileHover={reducedMotion ? undefined : { y: -4 }}
      transition={{ duration: 0.2 }}
      style={{ width, minWidth: width, maxWidth: width }}
      className="relative h-[400px] shrink-0 snap-start overflow-hidden rounded-2xl shadow-md [scroll-snap-stop:always] sm:h-[440px]"
    >
      <Image
        src={clinica.image}
        alt={clinica.name}
        fill
        className="object-cover"
        sizes={`${width}px`}
        draggable={false}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />

      <div className="absolute right-4 top-4 flex h-14 w-14 items-center justify-center rounded-full bg-white p-2 shadow-md sm:h-16 sm:w-16">
        <Image
          src={clinica.logo}
          alt={`Logo ${clinica.name}`}
          width={48}
          height={48}
          className="h-full w-full object-contain"
          draggable={false}
        />
      </div>

      <div className="absolute inset-x-0 bottom-0 p-5">
        <h3 className="text-h3 font-heading font-bold leading-tight tracking-tight text-white">
          {clinica.name}
        </h3>
        <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-white/90 sm:text-sm">
          {clinica.description}
        </p>
        <p className="mt-3 text-xs font-semibold text-brand-green">
          {clinica.region}
        </p>
      </div>
    </motion.article>
  );
}

export function ClinicsCarouselSection() {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScrollRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [layout, setLayout] = useState<CarouselLayout>({
    visibleCount: 1,
    cardWidth: 280,
    cardStep: 304,
    viewportWidth: 280,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const nextLayout = computeLayout(container.clientWidth);
      setLayout(nextLayout);
      setCurrentIndex((prev) =>
        Math.min(prev, Math.max(0, CLINICAS.length - nextLayout.visibleCount)),
      );
    };

    updateLayout();

    const observer = new ResizeObserver(updateLayout);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  const maxIndex = Math.max(0, CLINICAS.length - layout.visibleCount);
  const safeIndex = Math.min(currentIndex, maxIndex);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const nextIndex = Math.max(0, Math.min(index, maxIndex));
      isProgrammaticScrollRef.current = true;
      setCurrentIndex(nextIndex);

      viewport.scrollTo({
        left: nextIndex * layout.cardStep,
        behavior: reducedMotion ? "auto" : behavior,
      });

      window.setTimeout(
        () => {
          isProgrammaticScrollRef.current = false;
        },
        reducedMotion ? 0 : 450,
      );
    },
    [maxIndex, reducedMotion, layout.cardStep],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    viewport.scrollLeft = Math.min(currentIndex, maxIndex) * layout.cardStep;
    // Only re-sync when the card geometry changes (resize), not on every index update.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: layout-driven sync
  }, [layout.viewportWidth, layout.cardStep]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return;
      const index = Math.round(viewport.scrollLeft / layout.cardStep);
      setCurrentIndex(Math.max(0, Math.min(index, maxIndex)));
    };

    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [layout.cardStep, maxIndex]);

  return (
    <section
      className="overflow-hidden bg-white px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24"
      aria-label="Clínicas y centros de salud disponibles"
    >
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 24 }}
        whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mx-auto max-w-7xl"
      >
        <div ref={containerRef} className="relative">
          <div
            ref={viewportRef}
            className={`mx-auto snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
              reducedMotion ? "" : "scroll-smooth"
            }`}
            style={{ width: layout.viewportWidth, maxWidth: "100%" }}
          >
            <div className="flex" style={{ gap: GAP, width: "max-content" }}>
              {CLINICAS.map((clinica) => (
                <ClinicaCard
                  key={clinica.id}
                  clinica={clinica}
                  width={layout.cardWidth}
                  reducedMotion={!!reducedMotion}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => scrollToIndex(safeIndex - 1)}
            disabled={safeIndex === 0}
            aria-label="Clínica anterior"
            className="absolute left-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-brand-green text-white shadow-lg ring-2 ring-white/70 transition hover:bg-brand-teal disabled:cursor-not-allowed disabled:opacity-40 sm:left-4 sm:h-12 sm:w-12"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          <button
            type="button"
            onClick={() => scrollToIndex(safeIndex + 1)}
            disabled={safeIndex >= maxIndex}
            aria-label="Clínica siguiente"
            className="absolute right-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-brand-green text-white shadow-lg ring-2 ring-white/70 transition hover:bg-brand-teal disabled:cursor-not-allowed disabled:opacity-40 sm:right-4 sm:h-12 sm:w-12"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        <div className="mt-8 flex flex-nowrap items-center justify-center gap-0">
          {CLINICAS.map((clinica, index) => (
            <button
              key={clinica.id}
              type="button"
              onClick={() => scrollToIndex(Math.min(index, maxIndex))}
              aria-label={`Ir a ${clinica.name}`}
              aria-current={index === safeIndex ? "true" : undefined}
              className="flex h-11 w-6 shrink-0 items-center justify-center sm:w-7 md:w-8"
            >
              <span
                className={`block h-2.5 rounded-full transition-all ${
                  index === safeIndex
                    ? "w-5 bg-brand-green sm:w-6"
                    : "w-2 bg-zinc-300 sm:w-2.5"
                }`}
              />
            </button>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
