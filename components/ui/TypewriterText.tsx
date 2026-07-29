"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

type TypewriterTextProps = {
  phrases: readonly string[];
  typingSpeedMs?: number;
  deletingSpeedMs?: number;
  pauseMs?: number;
};

export function TypewriterText({
  phrases,
  typingSpeedMs = 80,
  deletingSpeedMs = 45,
  pauseMs = 2000,
}: TypewriterTextProps) {
  const reducedMotion = useReducedMotion();
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (reducedMotion) return;

    const cursorTimer = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);

    return () => clearInterval(cursorTimer);
  }, [reducedMotion]);

  // Users who prefer reduced motion see the first phrase statically —
  // no blinking cursor, typing, or auto-rotation.
  useEffect(() => {
    if (reducedMotion) return;

    const currentPhrase = phrases[phraseIndex];
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting && displayText === currentPhrase) {
      timer = setTimeout(() => setIsDeleting(true), pauseMs);
    } else if (isDeleting && displayText === "") {
      timer = setTimeout(() => {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
      }, 0);
    } else {
      const speed = isDeleting ? deletingSpeedMs : typingSpeedMs;
      timer = setTimeout(() => {
        setDisplayText((prev) =>
          isDeleting
            ? currentPhrase.slice(0, prev.length - 1)
            : currentPhrase.slice(0, prev.length + 1),
        );
      }, speed);
    }

    return () => clearTimeout(timer);
  }, [
    reducedMotion,
    displayText,
    isDeleting,
    phraseIndex,
    phrases,
    typingSpeedMs,
    deletingSpeedMs,
    pauseMs,
  ]);

  const currentText = reducedMotion ? (phrases[0] ?? "") : displayText;

  return (
    <span className="text-brand-green">
      {currentText}
      {!reducedMotion && (
        <span
          className={`ml-0.5 inline-block w-[3px] bg-brand-green ${showCursor ? "opacity-100" : "opacity-0"}`}
          aria-hidden="true"
        >
          |
        </span>
      )}
    </span>
  );
}
