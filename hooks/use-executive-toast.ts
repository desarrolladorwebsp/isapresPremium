"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ExecutiveToastTone = "success" | "error" | "info" | "warning";

export interface ExecutiveToastItem {
  id: string;
  message: string;
  tone: ExecutiveToastTone;
  createdAt: number;
}

const AUTO_DISMISS_MS: Record<ExecutiveToastTone, number> = {
  success: 4200,
  error: 6500,
  info: 4800,
  warning: 5200,
};

export function useExecutiveToast() {
  const [toasts, setToasts] = useState<ExecutiveToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, tone: ExecutiveToastTone = "success") => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      setToasts((current) => [...current, { id, message, tone, createdAt: Date.now() }]);

      const timer = setTimeout(() => {
        dismiss(id);
      }, AUTO_DISMISS_MS[tone]);

      timersRef.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  return { toasts, notify, dismiss };
}
