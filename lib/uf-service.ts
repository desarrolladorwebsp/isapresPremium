import { DEFAULT_UF_VALUE_CLP } from "@/lib/economic-indicators";

export interface UfIndicator {
  value: number;
  date: string | null;
  fetchedAt: string;
  fallback?: boolean;
  source?: string;
}

interface SerieResponse {
  serie?: { fecha: string; valor: number }[];
}

interface BoostrIndicatorsResponse {
  status?: string;
  data?: {
    uf?: { date?: string; value?: number };
  };
}

const UF_FETCH_HEADERS = {
  Accept: "application/json",
  "User-Agent":
    "CotizadorVirtual/1.0 (+https://cotizador.cotizaloantes.cl)",
} as const;

const UF_FETCH_TIMEOUT_MS = 12_000;
const SERVER_CACHE_MS = 10 * 60 * 1000;

let serverCache: { indicator: UfIndicator; loadedAt: number } | null = null;

function getChileTodayIsoDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
  }).format(new Date());
}

export function isUfIndicatorStale(indicator: UfIndicator): boolean {
  if (indicator.fallback || !indicator.date) return true;

  const indicatorDay = indicator.date.slice(0, 10);
  const today = getChileTodayIsoDate();

  return indicatorDay < today;
}

function parseSerieResponse(
  data: SerieResponse,
  source: string,
): UfIndicator {
  const latest = data.serie?.[0];

  if (!latest?.valor || !Number.isFinite(latest.valor) || latest.valor <= 0) {
    throw new Error(`${source} returned an invalid UF value`);
  }

  return {
    value: Math.round(latest.valor),
    date: latest.fecha ?? null,
    fetchedAt: new Date().toISOString(),
    source,
  };
}

function parseBoostrResponse(data: BoostrIndicatorsResponse): UfIndicator {
  const uf = data.data?.uf;

  if (!uf?.value || !Number.isFinite(uf.value) || uf.value <= 0) {
    throw new Error("boostr returned an invalid UF value");
  }

  return {
    value: Math.round(uf.value),
    date: uf.date ?? null,
    fetchedAt: new Date().toISOString(),
    source: "boostr",
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: UF_FETCH_HEADERS,
    signal: AbortSignal.timeout(UF_FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`UF source responded with ${response.status} (${url})`);
  }

  return (await response.json()) as T;
}

async function fetchUfFromMindicador(): Promise<UfIndicator> {
  const data = await fetchJson<SerieResponse>("https://mindicador.cl/api/uf");
  return parseSerieResponse(data, "mindicador");
}

async function fetchUfFromFindic(): Promise<UfIndicator> {
  const data = await fetchJson<SerieResponse>("https://findic.cl/api/uf");
  return parseSerieResponse(data, "findic");
}

async function fetchUfFromBoostr(): Promise<UfIndicator> {
  const data = await fetchJson<BoostrIndicatorsResponse>(
    "https://api.boostr.cl/economy/indicators.json",
  );
  return parseBoostrResponse(data);
}

const UF_SOURCE_LOADERS = [
  fetchUfFromMindicador,
  fetchUfFromFindic,
  fetchUfFromBoostr,
] as const;

async function fetchUfFromProviders(): Promise<UfIndicator> {
  const errors: string[] = [];

  for (const load of UF_SOURCE_LOADERS) {
    try {
      return await load();
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : "Unknown UF provider error",
      );
    }
  }

  throw new Error(errors.join(" | "));
}

export async function fetchUfIndicator(options?: {
  force?: boolean;
}): Promise<UfIndicator> {
  const now = Date.now();

  if (
    !options?.force &&
    serverCache &&
    now - serverCache.loadedAt < SERVER_CACHE_MS &&
    !isUfIndicatorStale(serverCache.indicator)
  ) {
    return serverCache.indicator;
  }

  try {
    const indicator = await fetchUfFromProviders();
    serverCache = { indicator, loadedAt: now };
    return indicator;
  } catch (error) {
    console.error("[uf-service] No se pudo obtener la UF en línea:", error);

    if (serverCache && !isUfIndicatorStale(serverCache.indicator)) {
      return serverCache.indicator;
    }

    throw error;
  }
}

export function buildFallbackUfIndicator(): UfIndicator {
  return {
    value: DEFAULT_UF_VALUE_CLP,
    date: null,
    fetchedAt: new Date().toISOString(),
    fallback: true,
    source: "fallback",
  };
}
