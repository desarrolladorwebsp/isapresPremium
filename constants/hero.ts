export const HERO_VIDEOS = [
  "/images/hero/hero-01.mp4",
  "/images/hero/hero-02.mp4",
  "/images/hero/hero-04.mp4",
  "/images/hero/hero-05.mp4",
  "/images/hero/hero-06.mp4",
] as const;

/** Rotate the shared hero playlist so each page opens on a different video. */
export function heroVideosStartingAt(startIndex: number): string[] {
  const length = HERO_VIDEOS.length;
  const index = ((startIndex % length) + length) % length;
  return [...HERO_VIDEOS.slice(index), ...HERO_VIDEOS.slice(0, index)];
}
