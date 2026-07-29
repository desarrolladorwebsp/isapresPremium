"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type BackgroundSlideshowProps = {
  videos: readonly string[];
  intervalMs?: number;
};

export function BackgroundSlideshow({
  videos,
  intervalMs = 8000,
}: BackgroundSlideshowProps) {
  const reducedMotion = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);

  useEffect(() => {
    if (reducedMotion || videos.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % videos.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [videos.length, intervalMs, reducedMotion]);

  useEffect(() => {
    const active = videoRefs.current[currentIndex];
    const listeners: Array<{
      video: HTMLVideoElement;
      handler: () => void;
    }> = [];

    videoRefs.current.forEach((video, index) => {
      if (!video) return;

      if (index === currentIndex && !reducedMotion) {
        const playActive = () => {
          video.currentTime = 0;
          void video.play().catch(() => {});
        };

        if (video.readyState >= 2) {
          playActive();
        } else {
          video.addEventListener("loadeddata", playActive);
          listeners.push({ video, handler: playActive });
        }
        return;
      }

      video.pause();
      if (video.readyState >= 1) {
        video.currentTime = 0;
      }
    });

    return () => {
      listeners.forEach(({ video, handler }) => {
        video.removeEventListener("loadeddata", handler);
      });
      active?.pause();
    };
  }, [currentIndex, reducedMotion]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {videos.map((src, index) => {
        const isActive = index === currentIndex;

        return (
          <motion.div
            key={src}
            className="absolute inset-0"
            initial={false}
            animate={{ opacity: isActive ? 1 : 0 }}
            transition={{
              duration: reducedMotion ? 0.3 : 1.2,
              ease: "easeInOut",
            }}
          >
            <video
              ref={(el) => {
                videoRefs.current[index] = el;
              }}
              className="absolute inset-0 h-full w-full object-cover"
              src={src}
              muted
              playsInline
              loop
              preload={index === 0 || index === 1 ? "auto" : "metadata"}
              aria-hidden="true"
            />
          </motion.div>
        );
      })}
      <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
    </div>
  );
}
