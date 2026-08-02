"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import {
  EMBED_EXIT_NAVIGATE_MESSAGE,
  EMBED_MESSAGE_SOURCE,
  EMBED_READY_MESSAGE,
  EMBED_RESIZE_MESSAGE,
  EMBED_WHEEL_MESSAGE,
  EMBED_REQUEST_RESIZE_MESSAGE,
} from "@/lib/embed/constants";
import { shouldForwardEmbedWheelToParent } from "@/lib/embed/embed-wheel-forward";
import {
  lockEmbedDocumentScroll,
  measureEmbedContentHeight,
} from "@/lib/embed/measure-embed-height";

export {
  EMBED_EXIT_NAVIGATE_MESSAGE,
  EMBED_MESSAGE_SOURCE,
  EMBED_READY_MESSAGE,
  EMBED_RESIZE_MESSAGE,
} from "@/lib/embed/constants";

export interface EmbedResizeMessage {
  type: typeof EMBED_RESIZE_MESSAGE;
  source: typeof EMBED_MESSAGE_SOURCE;
  height: number;
}

export interface EmbedReadyMessage {
  type: typeof EMBED_READY_MESSAGE;
  source: typeof EMBED_MESSAGE_SOURCE;
}

export interface EmbedExitNavigateMessage {
  type: typeof EMBED_EXIT_NAVIGATE_MESSAGE;
  source: typeof EMBED_MESSAGE_SOURCE;
}

export interface EmbedWheelMessage {
  type: typeof EMBED_WHEEL_MESSAGE;
  source: typeof EMBED_MESSAGE_SOURCE;
  deltaY: number;
  deltaX: number;
}

function postEmbedMessage(
  message:
    | EmbedResizeMessage
    | EmbedReadyMessage
    | EmbedExitNavigateMessage
    | EmbedWheelMessage,
) {
  if (window.parent === window) return;
  window.parent.postMessage(message, "*");
}

/** Avisa al sitio anfitrión que el widget redirige al cotizador completo. */
export function postEmbedExitNavigate(): void {
  postEmbedMessage({
    type: EMBED_EXIT_NAVIGATE_MESSAGE,
    source: EMBED_MESSAGE_SOURCE,
  });
}

const REMEASURE_DELAYS_MS = [0, 50, 150, 400, 800, 1500];

/**
 * Notifica al sitio anfitrión la altura del cotizador embebido (iframe auto-resize).
 */
export function useEmbedResize(
  enabled: boolean,
  rootRef: RefObject<HTMLElement | null>,
  /** Cambia cuando el contenido crece (resultados, modal, alertas). */
  measureKey = "",
) {
  const rafRef = useRef<number | null>(null);
  const lastHeightRef = useRef(0);
  const timeoutIdsRef = useRef<number[]>([]);

  useLayoutEffect(() => {
    if (!enabled) return;

    const root = rootRef.current;
    if (!root) return;

    const unlockScroll = lockEmbedDocumentScroll();

    const postHeight = (force = false) => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const measuredRoot = rootRef.current;
          if (!measuredRoot) return;

          const nextHeight = measureEmbedContentHeight(measuredRoot);
          if (!Number.isFinite(nextHeight) || nextHeight <= 0) return;
          if (
            !force &&
            Number.isFinite(lastHeightRef.current) &&
            nextHeight === lastHeightRef.current
          ) {
            return;
          }
          lastHeightRef.current = nextHeight;

          postEmbedMessage({
            type: EMBED_RESIZE_MESSAGE,
            source: EMBED_MESSAGE_SOURCE,
            height: nextHeight,
          });
        });
      });
    };

    const scheduleBurst = () => {
      timeoutIdsRef.current.forEach((id) => window.clearTimeout(id));
      timeoutIdsRef.current = REMEASURE_DELAYS_MS.map((delay) =>
        window.setTimeout(() => postHeight(true), delay),
      );
    };

    postEmbedMessage({
      type: EMBED_READY_MESSAGE,
      source: EMBED_MESSAGE_SOURCE,
    });
    postHeight(true);
    scheduleBurst();

    const resizeObserver = new ResizeObserver(() => postHeight());
    resizeObserver.observe(root);
    resizeObserver.observe(document.body);
    resizeObserver.observe(document.documentElement);

    const mutationObserver = new MutationObserver(() => postHeight());
    mutationObserver.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    const onImageLoad = (event: Event) => {
      if (event.target instanceof HTMLImageElement) {
        postHeight(true);
      }
    };
    root.addEventListener("load", onImageLoad, true);

    const onWindowLoad = () => postHeight(true);
    const onWindowResize = () => postHeight(true);

    window.addEventListener("load", onWindowLoad);
    window.addEventListener("resize", onWindowResize);

    const onWheel = (event: WheelEvent) => {
      if (!shouldForwardEmbedWheelToParent(event)) return;

      postEmbedMessage({
        type: EMBED_WHEEL_MESSAGE,
        source: EMBED_MESSAGE_SOURCE,
        deltaY: event.deltaY,
        deltaX: event.deltaX,
      });
      event.preventDefault();
    };
    window.addEventListener("wheel", onWheel, { passive: false });

    const onParentMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      const data = event.data as { type?: string; source?: string };
      if (data?.type !== EMBED_REQUEST_RESIZE_MESSAGE) return;
      if (data.source && data.source !== EMBED_MESSAGE_SOURCE) return;
      postHeight(true);
    };
    window.addEventListener("message", onParentMessage);

    if (document.fonts?.ready) {
      void document.fonts.ready.then(() => postHeight(true));
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      timeoutIdsRef.current.forEach((id) => window.clearTimeout(id));
      timeoutIdsRef.current = [];
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      root.removeEventListener("load", onImageLoad, true);
      window.removeEventListener("load", onWindowLoad);
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("message", onParentMessage);
      unlockScroll();
      lastHeightRef.current = 0;
    };
  }, [enabled, rootRef, measureKey]);
}
