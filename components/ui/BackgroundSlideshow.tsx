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
  /** Still frame shown while the first desktop clip loads. */
  poster?: string;
  /** Still frame for mobile. Falls back to `poster` if omitted. */
  mobilePoster?: string;
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
  poster,
  mobilePoster,
  overlayClassName = "bg-black/55",
}: BackgroundSlideshowProps) {
  const reducedMotion = useReducedMotion();
  const isDesktop = useIsDesktop();
  const [currentIndex, setCurrentIndex] = useState(0);
  /** First clip has a paint-ready frame (gates the initial poster → video fade). */
  const [activeReady, setActiveReady] = useState(false);
  /** After the first successful frame, clip crossfades skip the poster again. */
  const [bootstrapped, setBootstrapped] = useState(false);
  const bootstrappedRef = useRef(false);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const playlistKeyRef = useRef(isDesktop ? "desktop" : "mobile");
  const advancingRef = useRef(false);

  const activeVideos = isDesktop ? videos : (mobileVideos ?? videos);
  const activePoster = isDesktop ? poster : (mobilePoster ?? poster);
  const playlistKey = isDesktop ? "desktop" : "mobile";
  const isSingleClip = activeVideos.length <= 1;

  // Reset index only when switching mobile ↔ desktop playlist.
  useEffect(() => {
    if (playlistKeyRef.current !== playlistKey) {
      playlistKeyRef.current = playlistKey;
      setCurrentIndex(0);
      setActiveReady(false);
      setBootstrapped(false);
      bootstrappedRef.current = false;
      videoRefs.current = [];
      advancingRef.current = false;
    }
  }, [playlistKey]);

  // Mark the active clip ready as soon as it has a paintable frame.
  useEffect(() => {
    if (!bootstrappedRef.current) {
      setActiveReady(false);
    }
    const video = videoRefs.current[currentIndex];
    if (!video) return;

    const markReady = () => {
      if (video.readyState < 2) return;
      setActiveReady(true);
      if (!bootstrappedRef.current) {
        bootstrappedRef.current = true;
        setBootstrapped(true);
      }
    };

    markReady();
    video.addEventListener("loadeddata", markReady);
    video.addEventListener("canplay", markReady);
    video.addEventListener("playing", markReady);

    return () => {
      video.removeEventListener("loadeddata", markReady);
      video.removeEventListener("canplay", markReady);
      video.removeEventListener("playing", markReady);
    };
  }, [currentIndex, playlistKey, activeVideos]);

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
    <div className="absolute inset-0 overflow-hidden bg-[#064e45]">
      {/* Instant visual so the hero never flashes empty/black while MP4s buffer. */}
      {activePoster ? (
        // eslint-disable-next-line @next/next/no-img-element -- static public poster, not remotely optimized
        <img
          src={activePoster}
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-br from-brand-teal-dark via-[#0a3d36] to-[#062e29]"
          aria-hidden="true"
        />
      )}

      {activeVideos.map((src, index) => {
        const isActive = index === currentIndex;
        // First visit: wait for a real frame. After that: normal clip crossfade.
        const showClip =
          !reducedMotion && isActive && (bootstrapped || activeReady);

        return (
          <motion.div
            key={`${playlistKey}-${src}`}
            className="absolute inset-0"
            initial={false}
            animate={{ opacity: showClip ? 1 : 0 }}
            transition={{
              duration: reducedMotion ? 0.25 : bootstrapped ? 0.9 : 0.55,
              ease: "easeInOut",
            }}
          >
            <video
              ref={(el) => {
                videoRefs.current[index] = el;
              }}
              className="absolute inset-0 h-full w-full object-cover"
              src={src}
              poster={isActive ? activePoster : undefined}
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
