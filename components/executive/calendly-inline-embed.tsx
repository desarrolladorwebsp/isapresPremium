"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { joinClasses } from "@/lib/utils";

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (options: {
        url: string;
        parentElement: HTMLElement;
        prefill?: { name?: string; email?: string };
      }) => void;
    };
  }
}

export interface CalendlyInlineEmbedProps {
  /** Scheduling URL (puede incluir ?email=&name=). */
  url: string;
  prefill?: { name?: string | null; email?: string | null };
  height?: number;
  className?: string;
  /** Cuando Calendly confirma el evento (postMessage). */
  onEventScheduled?: () => void;
}

/**
 * Widget inline oficial de Calendly (`widget.js` + initInlineWidget).
 * Equivalente al embed:
 * `<div class="calendly-inline-widget" data-url="..."></div>`
 */
export function CalendlyInlineEmbed({
  url,
  prefill,
  height = 680,
  className,
  onEventScheduled,
}: CalendlyInlineEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.Calendly) {
      setScriptReady(true);
    }
  }, []);

  useEffect(() => {
    if (!scriptReady || !containerRef.current || !url.trim()) return;

    const parent = containerRef.current;
    parent.innerHTML = "";

    window.Calendly?.initInlineWidget({
      url: url.trim(),
      parentElement: parent,
      prefill: {
        ...(prefill?.name?.trim() ? { name: prefill.name.trim() } : {}),
        ...(prefill?.email?.trim()
          ? { email: prefill.email.trim().toLowerCase() }
          : {}),
      },
    });
  }, [scriptReady, url, prefill?.name, prefill?.email]);

  useEffect(() => {
    if (!onEventScheduled) return;

    function onMessage(event: MessageEvent) {
      if (event.origin !== "https://calendly.com") return;
      const data = event.data as { event?: string } | null;
      if (data?.event === "calendly.event_scheduled") {
        onEventScheduled?.();
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onEventScheduled]);

  return (
    <>
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="lazyOnload"
        onLoad={() => setScriptReady(true)}
      />
      <div
        ref={containerRef}
        className={joinClasses(
          "calendly-inline-widget w-full overflow-hidden rounded-xl border border-sky-200 bg-white",
          className,
        )}
        style={{ minWidth: 320, height }}
        data-url={url}
      />
    </>
  );
}
