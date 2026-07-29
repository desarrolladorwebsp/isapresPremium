"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

const DESKTOP_MQ = "(min-width: 768px)";

type BackgroundSlideshowProps = {
  /** Landscape videos for tablet/desktop. */
  videos: readonly string[];
  /** Portrait videos for mobile. Falls back to `videos` if omitted. */
  mobileVideos?: readonly string[];
  /** Overlay above the video. Defaults to a dark scrim. */
  overlayClassName?: string;
};

function subscribeDesktop(onStoreChange: () => void) {
  const media = window.matchMedia(DESKTOP_MQ);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getDesktopSnapshot() {
  return window.matchMedia(DESKTOP_MQ).matches;
}

function getDesktopServerSnapshot() {
  return false;
}

function useIsDesktop() {
  return useSyncExternalStore(
    subscribeDesktop,
    getDesktopSnapshot,
    getDesktopServerSnapshot,
  );
}

async function ensurePlaying(video: HTMLVideoElement) {
  try {
    if (video.paused) {
      await video.play();
    }
  } catch {
    // Autoplay can be blocked until muted + playsInline; retry shortly.
    window.setTimeout(() => {
      void video.play().catch(() => {});
    }, 120);
  }
}

export function BackgroundSlideshow({
  videos,
  mobileVideos,
  overlayClassName = "bg-black/55",
}: BackgroundSlideshowProps) {
  const reducedMotion = useReducedMotion();
  const isDesktop = useIsDesktop();
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const playlistKeyRef = useRef(isDesktop ? "desktop" : "mobile");

  const activeVideos = isDesktop ? videos : (mobileVideos ?? videos);
  const playlistKey = isDesktop ? "desktop" : "mobile";

  // Reset index only when switching mobile ↔ desktop playlist.
  useEffect(() => {
    if (playlistKeyRef.current !== playlistKey) {
      playlistKeyRef.current = playlistKey;
      setCurrentIndex(0);
      videoRefs.current = [];
    }
  }, [playlistKey]);

  const goNext = useCallback(() => {
    if (activeVideos.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % activeVideos.length);
  }, [activeVideos.length]);

  // Keep the active clip playing; advance when it ends.
  useEffect(() => {
    const video = videoRefs.current[currentIndex];
    if (!video) return;

    videoRefs.current.forEach((other, index) => {
      if (!other || index === currentIndex) return;
      other.pause();
      other.currentTime = 0;
    });

    if (reducedMotion) {
      video.pause();
      video.currentTime = 0;
      return;
    }

    const onEnded = () => goNext();
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void ensurePlaying(video);
      }
    };

    video.loop = activeVideos.length <= 1;
    void ensurePlaying(video);

    video.addEventListener("ended", onEnded);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      video.removeEventListener("ended", onEnded);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [currentIndex, reducedMotion, activeVideos, goNext, playlistKey]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-zinc-900">
      {activeVideos.map((src, index) => {
        const isActive = index === currentIndex;

        return (
          <motion.div
            key={`${playlistKey}-${src}`}
            className="absolute inset-0"
            initial={false}
            animate={{ opacity: isActive ? 1 : 0 }}
            transition={{
              duration: reducedMotion ? 0.25 : 0.9,
              ease: "easeInOut",
            }}
          >
            <video
              ref={(el) => {
                videoRefs.current[index] = el;
                if (el && index === currentIndex && !reducedMotion) {
                  void ensurePlaying(el);
                }
              }}
              className="absolute inset-0 h-full w-full object-cover"
              src={src}
              muted
              playsInline
              autoPlay={isActive && !reducedMotion}
              preload={index === currentIndex || index === (currentIndex + 1) % activeVideos.length ? "auto" : "metadata"}
              aria-hidden="true"
            />
          </motion.div>
        );
      })}
      <div className={`absolute inset-0 ${overlayClassName}`} aria-hidden="true" />
    </div>
  );
}
