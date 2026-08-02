/** Landscape hero videos for tablet/desktop (home slideshow). */
export const HERO_VIDEOS = [
  "/videos/hero/hero-01.mp4",
  "/videos/hero/hero-02.mp4",
  "/videos/hero/hero-04.mp4",
  "/videos/hero/hero-05.mp4",
  "/videos/hero/hero-06.mp4",
] as const;

/** First-frame posters shown while hero videos buffer (avoids black flash). */
export const HERO_POSTER = "/images/hero/posters/hero-01.jpg";
export const HERO_POSTER_MOBILE = "/images/hero/posters/hero-vertical-03.jpg";

const V = {
  v01: "/videos/hero/hero-vertical-01.mp4",
  v02: "/videos/hero/hero-vertical-02.mp4",
  v03: "/videos/hero/hero-vertical-03.mp4",
  v04: "/videos/hero/hero-vertical-04.mp4",
  v05: "/videos/hero/hero-vertical-05.mp4",
  v06: "/videos/hero/hero-vertical-06.mp4",
  v07: "/videos/hero/hero-vertical-07.mp4",
} as const;

/** Portrait playlist for the home hero on mobile. */
export const HERO_MOBILE_PLAYLISTS = {
  home: [V.v03, V.v05, V.v01, V.v07, V.v02, V.v06, V.v04],
} as const;

/** Rotate a playlist so each page can open on a different clip. */
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
