"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { DEFAULT_UF_VALUE_CLP } from "@/domain";
import { isUfIndicatorStale, type UfIndicator } from "@/lib/uf-service";

const CLIENT_CACHE_MS = 5 * 60 * 1000;
const REFRESH_MS = 15 * 60 * 1000;
const FALLBACK_RETRY_MS = 2 * 60 * 1000;

interface UfStoreState {
  ufToClp: number;
  loading: boolean;
  lastUpdated: Date | null;
  indicatorDate: string | null;
  isFallback: boolean;
}

let store: UfStoreState = {
  ufToClp: DEFAULT_UF_VALUE_CLP,
  loading: true,
  lastUpdated: null,
  indicatorDate: null,
  isFallback: false,
};

const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;
let lastFetchAt = 0;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let listenersBound = false;

function emit() {
  for (const listener of listeners) listener();
}

function setStore(patch: Partial<UfStoreState>) {
  store = { ...store, ...patch };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return store;
}

function shouldBypassClientCache(force: boolean): boolean {
  if (force) return true;
  if (store.isFallback) return true;

  if (
    store.indicatorDate &&
    isUfIndicatorStale({
      value: store.ufToClp,
      date: store.indicatorDate,
      fetchedAt: store.lastUpdated?.toISOString() ?? new Date().toISOString(),
      fallback: store.isFallback,
    })
  ) {
    return true;
  }

  return Date.now() - lastFetchAt >= CLIENT_CACHE_MS;
}

async function loadUf(force = false) {
  const now = Date.now();

  if (!shouldBypassClientCache(force)) {
    return;
  }

  if (inflight) {
    await inflight;
    return;
  }

  inflight = (async () => {
    setStore({ loading: store.lastUpdated === null });

    try {
      const refreshQuery = force ? "?refresh=1" : "";
      const response = await fetch(`/api/uf${refreshQuery}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("UF API error");

      const data = (await response.json()) as UfIndicator;
      lastFetchAt = Date.now();

      setStore({
        ufToClp: Math.round(data.value),
        loading: false,
        lastUpdated: new Date(data.fetchedAt),
        indicatorDate: data.date,
        isFallback: Boolean(data.fallback),
      });
    } catch {
      setStore({
        loading: false,
        isFallback: true,
        lastUpdated: store.lastUpdated ?? new Date(),
      });
    }
  })().finally(() => {
    inflight = null;
  });

  await inflight;
}

function scheduleRefreshLoop() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  const interval = store.isFallback ? FALLBACK_RETRY_MS : REFRESH_MS;

  refreshTimer = setInterval(() => {
    void loadUf(true);
  }, interval);
}

function ensureGlobalListeners() {
  if (listenersBound || typeof document === "undefined") return;
  listenersBound = true;

  scheduleRefreshLoop();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void loadUf(true);
    }
  });
}

export function useUfValue() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const refresh = useCallback(() => loadUf(true), []);

  useEffect(() => {
    ensureGlobalListeners();
    void loadUf();
  }, []);

  useEffect(() => {
    scheduleRefreshLoop();
  }, [state.isFallback]);

  return {
    ufToClp: state.ufToClp,
    loading: state.loading,
    lastUpdated: state.lastUpdated,
    indicatorDate: state.indicatorDate,
    isFallback: state.isFallback,
    refresh,
  };
}
