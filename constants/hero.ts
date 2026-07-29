/** Landscape hero videos for tablet/desktop. */
export const HERO_VIDEOS = [
  "/images/hero/hero-01.mp4",
  "/images/hero/hero-02.mp4",
  "/images/hero/hero-04.mp4",
  "/images/hero/hero-05.mp4",
  "/images/hero/hero-06.mp4",
] as const;

const V = {
  v01: "/videos/hero/hero-vertical-01.mp4",
  v02: "/videos/hero/hero-vertical-02.mp4",
  v03: "/videos/hero/hero-vertical-03.mp4",
  v04: "/videos/hero/hero-vertical-04.mp4",
  v05: "/videos/hero/hero-vertical-05.mp4",
  v06: "/videos/hero/hero-vertical-06.mp4",
  v07: "/videos/hero/hero-vertical-07.mp4",
} as const;

/**
 * Curated portrait playlists — each page opens on a different clip
 * and follows a distinct rotation through the same vertical library.
 */
export const HERO_MOBILE_PLAYLISTS = {
  home: [V.v03, V.v05, V.v01, V.v07, V.v02, V.v06, V.v04],
  empresas: [V.v06, V.v01, V.v04, V.v02, V.v07, V.v03, V.v05],
  nosotros: [V.v07, V.v04, V.v02, V.v05, V.v01, V.v06, V.v03],
} as const;

/** Rotate a playlist so each page opens on a different video. */
export function rotateVideosStartingAt(
  videos: readonly string[],
  startIndex: number,
): string[] {
  const length = videos.length;
  if (length === 0) return [];
  const index = ((startIndex % length) + length) % length;
  return [...videos.slice(index), ...videos.slice(0, index)];
}

export function heroVideosStartingAt(startIndex: number): string[] {
  return rotateVideosStartingAt(HERO_VIDEOS, startIndex);
}
