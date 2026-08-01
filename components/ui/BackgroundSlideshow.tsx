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
    if (video.ended) {
      video.currentTime = 0;
    }
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
  const advancingRef = useRef(false);

  const activeVideos = isDesktop ? videos : (mobileVideos ?? videos);
  const playlistKey = isDesktop ? "desktop" : "mobile";
  const isSingleClip = activeVideos.length <= 1;

  // Reset index only when switching mobile ↔ desktop playlist.
  useEffect(() => {
    if (playlistKeyRef.current !== playlistKey) {
      playlistKeyRef.current = playlistKey;
      setCurrentIndex(0);
      videoRefs.current = [];
      advancingRef.current = false;
    }
  }, [playlistKey]);

  /** Infinite playlist: after the last clip, wrap to the first. */
  const goNext = useCallback(() => {
    if (isSingleClip) return;
    if (advancingRef.current) return;
    advancingRef.current = true;
    setCurrentIndex((prev) => (prev + 1) % activeVideos.length);
    window.setTimeout(() => {
      advancingRef.current = false;
    }, 400);
  }, [activeVideos.length, isSingleClip]);

  // Keep the active clip playing; advance (or native-loop) forever.
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

    // One clip → HTML loop. Several clips → cycle the playlist forever.
    video.loop = isSingleClip;

    const onEnded = () => {
      if (isSingleClip) {
        video.currentTime = 0;
        void ensurePlaying(video);
        return;
      }
      goNext();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void ensurePlaying(video);
      }
    };

    // Some mobile browsers skip `ended`; advance near the end as fallback.
    const onTimeUpdate = () => {
      if (isSingleClip || advancingRef.current) return;
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      if (video.currentTime >= video.duration - 0.35) {
        goNext();
      }
    };

    void ensurePlaying(video);

    video.addEventListener("ended", onEnded);
    video.addEventListener("timeupdate", onTimeUpdate);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("timeupdate", onTimeUpdate);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [
    currentIndex,
    reducedMotion,
    activeVideos,
    goNext,
    playlistKey,
    isSingleClip,
  ]);

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
                  el.loop = isSingleClip;
                  void ensurePlaying(el);
                }
              }}
              className="absolute inset-0 h-full w-full object-cover"
              src={src}
              muted
              playsInline
              loop={isSingleClip}
              autoPlay={isActive && !reducedMotion}
              preload={
                index === currentIndex ||
                index === (currentIndex + 1) % activeVideos.length
                  ? "auto"
                  : "metadata"
              }
              aria-hidden="true"
            />
          </motion.div>
        );
      })}
      <div
        className={`absolute inset-0 ${overlayClassName}`}
        aria-hidden="true"
      />
    </div>
  );
}
