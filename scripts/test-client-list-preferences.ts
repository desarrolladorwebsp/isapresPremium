import assert from "node:assert/strict";
import {
  readClientListPreferences,
  saveClientListPreferences,
  type ClientListPreferences,
} from "@/lib/executive/client-list-preferences";

const data = new Map<string, string>();
const browser = {
  getItem: (key: string) => data.get(key) ?? null,
  setItem: (key: string, value: string) => { data.set(key, value); },
};
const first = "staff-a";
const second = "staff-b";
const defaults = readClientListPreferences(first, browser);

browser.setItem("executive-clients-view-mode", "table");
assert.deepEqual(readClientListPreferences(first, browser), defaults);

const firstChoices: ClientListPreferences = {
  segment: "devueltos",
  viewMode: "board",
  boardFilter: "RECEPCIONADO",
  sortKey: "cliente",
  sortDirection: "asc",
  gestionFilters: [],
  originFilters: ["MANUAL", "SENDPULSE"],
  statusFilters: ["PAUSADO", "PERDIDO"],
  executiveFilterIds: ["__unassigned__", "executive-1"],
};
saveClientListPreferences(first, firstChoices, browser);
assert.deepEqual(readClientListPreferences(first, browser), firstChoices);
assert.deepEqual(readClientListPreferences(second, browser), defaults);

const secondChoices: ClientListPreferences = {
  ...defaults,
  segment: "derivados",
  sortKey: "estado",
  statusFilters: ["CONTACTADO"],
};
saveClientListPreferences(second, secondChoices, browser);
assert.deepEqual(readClientListPreferences(second, browser), secondChoices);
assert.deepEqual(readClientListPreferences(first, browser), firstChoices);
assert.deepEqual(readClientListPreferences("", browser), defaults);

const malformed = { getItem: () => "{invalid" };
assert.deepEqual(readClientListPreferences(first, malformed), defaults);
const partial = {
  getItem: () => JSON.stringify({
    segment: "invalid",
    viewMode: "table",
    gestionFilters: ["invalid"],
    statusFilters: ["CERRADO", "NO_CONTESTA", "NO_CONTESTA"],
    executiveFilterIds: [null, " ", "staff-a", "staff-a"],
  }),
};
assert.deepEqual(readClientListPreferences(first, partial), {
  ...defaults,
  viewMode: "table",
  statusFilters: ["NO_CONTESTA"],
  executiveFilterIds: ["staff-a"],
});
const blocked = {
  getItem() { throw new Error("Storage disabled"); },
  setItem() { throw new Error("Storage disabled"); },
};
assert.deepEqual(readClientListPreferences(first, blocked), defaults);
assert.doesNotThrow(() => saveClientListPreferences(first, firstChoices, blocked));
assert.deepEqual(readClientListPreferences(first, browser), firstChoices);

console.log("OK preferencias de Clientes: restauración, aislamiento, selecciones vacías, valores obsoletos y almacenamiento no disponible.");
