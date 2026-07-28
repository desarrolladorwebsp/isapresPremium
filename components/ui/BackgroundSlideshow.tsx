"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";

type BackgroundSlideshowProps = {
  images: readonly string[];
  intervalMs?: number;
};

export function BackgroundSlideshow({
  images,
  intervalMs = 5000,
}: BackgroundSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [images.length, intervalMs]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {images.map((src, index) => {
        const isActive = index === currentIndex;

        return (
          <motion.div
            key={src}
            className="absolute inset-0"
            initial={false}
            animate={{ opacity: isActive ? 1 : 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          >
            <motion.div
              key={isActive ? `active-${currentIndex}` : `idle-${index}`}
              className="absolute inset-0"
              initial={{ scale: 1 }}
              animate={{ scale: isActive ? 1.08 : 1 }}
              transition={{
                duration: intervalMs / 1000,
                ease: "linear",
              }}
            >
              <Image
                src={src}
                alt=""
                fill
                priority={index === 0}
                className="object-cover"
                sizes="100vw"
              />
            </motion.div>
          </motion.div>
        );
      })}
      <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
    </div>
  );
}
