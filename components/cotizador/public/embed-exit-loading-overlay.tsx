"use client";

import { EMBED_EXIT_LOADING_TITLE } from "@/lib/embed/constants";
import { joinClasses } from "@/lib/utils";
import { PublicPlanResultsLoading } from "./public-plan-results-loading";

export function EmbedExitLoadingOverlay({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  return (
    <div
      className={joinClasses(
        embedded
          ? "relative z-[100] flex w-full items-center justify-center bg-white/95 py-16 backdrop-blur-sm motion-safe:animate-fade-in"
          : "fixed inset-0 z-[100] flex items-center justify-center bg-white/95 backdrop-blur-sm motion-safe:animate-fade-in",
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={EMBED_EXIT_LOADING_TITLE}
      data-embed-measure
    >
      <div className="w-full max-w-lg px-4">
        <PublicPlanResultsLoading
          count={2}
          message={EMBED_EXIT_LOADING_TITLE}
        />
      </div>
    </div>
  );
}
