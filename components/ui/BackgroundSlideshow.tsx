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

/** Force play from t=0. Needed because Safari/iOS often ignore native `loop`. */
async function replayFromStart(video: HTMLVideoElement) {
  try {
    if (video.currentTime !== 0) {
      video.currentTime = 0;
    }
    await video.play();
  } catch {
    window.setTimeout(() => {
      try {
        video.currentTime = 0;
      } catch {
        // ignore seek errors
      }
      void video.play().catch(() => {});
    }, 150);
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

  /** Infinite playlist: after the last clip, wrap back to the first. */
  const goNext = useCallback(() => {
    if (isSingleClip) return;
    if (advancingRef.current) return;
    advancingRef.current = true;
    setCurrentIndex((prev) => (prev + 1) % activeVideos.length);
    window.setTimeout(() => {
      advancingRef.current = false;
    }, 500);
  }, [activeVideos.length, isSingleClip]);

  useEffect(() => {
    const video = videoRefs.current[currentIndex];
    if (!video) return;

    videoRefs.current.forEach((other, index) => {
      if (!other || index === currentIndex) return;
      other.pause();
      try {
        other.currentTime = 0;
      } catch {
        // ignore
      }
    });

    if (reducedMotion) {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        // ignore
      }
      return;
    }

    // Single clip: native loop + manual restart (Safari).
    // Multi clip: no native loop — advance on end and wrap forever.
    video.loop = isSingleClip;

    const handleClipFinished = () => {
      if (advancingRef.current) return;

      if (isSingleClip) {
        void replayFromStart(video);
        return;
      }

      goNext();
    };

    const onEnded = () => {
      handleClipFinished();
    };

    // Fallback when `ended` is skipped (some iOS/WebViews).
    let endFallbackId = 0;
    const armEndFallback = () => {
      window.clearTimeout(endFallbackId);
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;

      const remainingMs = Math.max(0, (video.duration - video.currentTime) * 1000);
      endFallbackId = window.setTimeout(() => {
        if (advancingRef.current) return;
        if (video !== videoRefs.current[currentIndex]) return;
        // If still near the end or already ended/paused, finish the clip.
        if (
          video.ended ||
          video.paused ||
          video.currentTime >= video.duration - 0.2
        ) {
          handleClipFinished();
        }
      }, remainingMs + 250);
    };

    const onLoadedMetadata = () => {
      armEndFallback();
    };

    const onPlay = () => {
      armEndFallback();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void replayFromStart(video);
        armEndFallback();
      }
    };

    void replayFromStart(video);
    if (video.readyState >= 1) {
      armEndFallback();
    }

    video.addEventListener("ended", onEnded);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("play", onPlay);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearTimeout(endFallbackId);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("play", onPlay);
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
              }}
              className="absolute inset-0 h-full w-full object-cover"
              src={src}
              muted
              playsInline
              // Single-clip pages rely on this; multi-clip overrides via JS (`video.loop = false`).
              loop={isSingleClip}
              autoPlay={isActive && !reducedMotion}
              preload={
                index === currentIndex ||
                index === (currentIndex + 1) % Math.max(activeVideos.length, 1)
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
