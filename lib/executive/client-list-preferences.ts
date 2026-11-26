import {
  CLIENT_GESTION_FILTER_OPTIONS,
  DEFAULT_CLIENT_GESTION_FILTERS,
  type ClientGestionFilter,
} from "@/lib/client-pipeline/client-gestion-filter";
import { CLIENT_PIPELINE_STATUS_OPTIONS } from "@/lib/client-pipeline/constants";
import { CLIENT_BOARD_QUICK_FILTERS, type ClientBoardFilter } from "@/lib/executive/client-board";
import type { ClientPipelineStatus } from "@/types/client-pipeline";
import { CLIENT_ORIGIN_OPTIONS, type ClientOrigin } from "@/types/user";

export type ClientsSortKey =
  | "cliente"
  | "estado"
  | "zoom"
  | "origen"
  | "plan"
  | "contacto"
  | "rut"
  | "registroPor"
  | "ejecutivo"
  | "registro";

export const CLIENTS_SORT_OPTIONS: { key: ClientsSortKey; label: string; adminOnly?: boolean }[] = [
  { key: "registro", label: "Fecha registro" },
  { key: "cliente", label: "Cliente" },
  { key: "estado", label: "Estado" },
  { key: "zoom", label: "Zoom" },
  { key: "origen", label: "Origen" },
  { key: "plan", label: "Plan" },
  { key: "contacto", label: "Contacto" },
  { key: "rut", label: "RUT" },
  { key: "registroPor", label: "Registró" },
  { key: "ejecutivo", label: "Asignado" },
];

// SendPulse is assigned by the webhook and can still be used as a list filter.
export const CLIENT_ORIGIN_FILTER_OPTIONS = [
  ...CLIENT_ORIGIN_OPTIONS,
  { value: "SENDPULSE" as const, label: "SendPulse" },
];

const CLIENT_SEGMENTS = ["cartera", "derivados", "devueltos"] as const;
const CLIENT_VIEWS = ["table", "cards", "board"] as const;
const SORT_DIRECTIONS = ["asc", "desc"] as const;

export interface ClientListPreferences {
  segment: (typeof CLIENT_SEGMENTS)[number];
  viewMode: (typeof CLIENT_VIEWS)[number];
  boardFilter: ClientBoardFilter;
  sortKey: ClientsSortKey;
  sortDirection: (typeof SORT_DIRECTIONS)[number];
  gestionFilters: ClientGestionFilter[];
  originFilters: ClientOrigin[];
  statusFilters: ClientPipelineStatus[];
  executiveFilterIds: string[];
}

function preferenceKey(staffId: string) {
  return `executive-clients-preferences:v1:${staffId}`;
}

function readChoice<T extends string>(value: unknown, choices: readonly T[], fallback: T): T {
  return choices.find((choice) => choice === value) ?? fallback;
}

function readSelection<T extends string>(value: unknown, choices: readonly T[], fallback: T[] = []): T[] {
  if (!Array.isArray(value)) return fallback;
  if (value.length === 0) return [];
  const selected = choices.filter((choice) => value.includes(choice));
  return selected.length > 0 ? selected : fallback;
}

export function readClientListPreferences(staffId: string, storage?: Pick<Storage, "getItem">): ClientListPreferences {
  let value: unknown;
  try {
    if (staffId) value = JSON.parse((storage ?? window.localStorage).getItem(preferenceKey(staffId)) ?? "null");
  } catch {
    // Storage can be disabled or contain an obsolete value.
  }
  const saved = value && typeof value === "object"
    ? value as Partial<Record<keyof ClientListPreferences, unknown>>
    : {};

  return {
    segment: readChoice(saved.segment, CLIENT_SEGMENTS, "cartera"),
    viewMode: readChoice(saved.viewMode, CLIENT_VIEWS, "cards"),
    boardFilter: readChoice(saved.boardFilter, CLIENT_BOARD_QUICK_FILTERS.map(({ value }) => value), "EN_CURSO"),
    sortKey: readChoice(saved.sortKey, CLIENTS_SORT_OPTIONS.map(({ key }) => key), "registro"),
    sortDirection: readChoice(saved.sortDirection, SORT_DIRECTIONS, "desc"),
    gestionFilters: readSelection(
      saved.gestionFilters,
      CLIENT_GESTION_FILTER_OPTIONS.map(({ value }) => value),
      [...DEFAULT_CLIENT_GESTION_FILTERS],
    ),
    originFilters: readSelection(saved.originFilters, CLIENT_ORIGIN_FILTER_OPTIONS.map(({ value }) => value)),
    statusFilters: readSelection(saved.statusFilters, CLIENT_PIPELINE_STATUS_OPTIONS),
    executiveFilterIds: readExecutiveFilterIds(saved.executiveFilterIds),
  };
}

function readExecutiveFilterIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids = value.filter((id): id is string => typeof id === "string").map((id) => id.trim()).filter(Boolean);
  return [...new Set(ids)];
}

export function saveClientListPreferences(staffId: string, preferences: ClientListPreferences, storage?: Pick<Storage, "setItem">) {
  if (!staffId) return;
  try {
    (storage ?? window.localStorage).setItem(preferenceKey(staffId), JSON.stringify(preferences));
  } catch {
    // Keep the filters usable for the current view if storage is disabled.
  }
}
