"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { touchTarget, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

export interface PublicCotizadorNoticeProps {
  message: string | null;
  onDismiss?: () => void;
  autoHideMs?: number;
  /** Fuerza re-mostrar el aviso aunque el texto sea el mismo. */
  noticeKey?: number;
  /** Centrado con fondo y color de alerta (widget embebido). */
  prominent?: boolean;
  /** Variante compacta para iframe auto-redimensionable (sin overlay a pantalla completa). */
  embedded?: boolean;
  title?: string;
}

function AlertIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="size-6"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NoticeCard({
  title,
  message,
  onDismiss,
  compact = false,
}: {
  title: string;
  message: string;
  onDismiss: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={joinClasses(
        "motion-safe-fade-in pointer-events-auto w-full max-w-md rounded-2xl border-2 border-warning bg-white text-center shadow-2xl",
        "ring-4 ring-warning/25",
        compact ? "p-4 sm:p-5" : "p-6",
      )}
    >
      <div
        className={joinClasses(
          "mx-auto mb-3 flex items-center justify-center rounded-full bg-warning text-warning-foreground shadow-md",
          compact ? "size-11" : "mb-4 size-14",
        )}
      >
        <AlertIcon />
      </div>
      <p
        id="cotizador-notice-title"
        className={joinClasses(
          "font-bold text-foreground",
          compact ? "text-sm" : "text-base",
        )}
      >
        {title}
      </p>
      <p
        id="cotizador-notice-body"
        className={joinClasses(
          "mt-2 leading-relaxed text-foreground/90",
          compact ? "text-xs sm:text-sm" : "text-sm",
        )}
      >
        {message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className={joinClasses(
          touchTarget,
          "mt-4 w-full rounded-full px-6 text-sm font-bold text-white shadow-md",
          ui.cta,
        )}
      >
        Entendido
      </button>
    </div>
  );
}

export function PublicCotizadorNotice({
  message,
  onDismiss,
  autoHideMs = 6000,
  noticeKey = 0,
  prominent = false,
  embedded = false,
  title = "Completa los datos del cotizador",
}: PublicCotizadorNoticeProps) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }

    setVisible(true);

    if (prominent) return;

    const timer = window.setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, autoHideMs);

    return () => window.clearTimeout(timer);
  }, [message, noticeKey, autoHideMs, onDismiss, prominent]);

  function dismiss() {
    setVisible(false);
    onDismiss?.();
  }

  if (!message || !visible) return null;

  if (prominent && embedded) {
    if (!mounted) return null;

    return createPortal(
      <div
        data-embed-overlay="notice"
        className="pointer-events-none fixed inset-x-0 top-0 z-[120] flex justify-center px-3 pt-3"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cotizador-notice-title"
        aria-describedby="cotizador-notice-body"
      >
        <NoticeCard
          title={title}
          message={message}
          onDismiss={dismiss}
          compact
        />
      </div>,
      document.body,
    );
  }

  if (prominent) {
    return (
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-[2px]"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cotizador-notice-title"
        aria-describedby="cotizador-notice-body"
      >
        <NoticeCard title={title} message={message} onDismiss={dismiss} />
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex justify-center px-4 sm:bottom-8"
      role="status"
      aria-live="polite"
    >
      <div
        className={joinClasses(
          "motion-safe-fade-in max-w-md rounded-2xl border border-warning/50 bg-warning-muted px-4 py-3 text-center text-sm font-semibold text-foreground shadow-lg",
        )}
      >
        {message}
      </div>
    </div>
  );
}
