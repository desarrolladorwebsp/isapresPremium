import assert from "node:assert/strict";
import { annualityAvailable, defaultAnnualityExpiry, formatAnnualityMonth, isAnnualityMonth, resolveAnnualityExpiry } from "@/lib/client-profile/annuality";
import { buildEmptyClientProfile, normalizeClientProfileInput, resolveClientProfile } from "@/lib/client-profile/constants";
import { parseClientProfilePayload } from "@/lib/api/parse-client-profile";
import { countExecutiveAgendaStats } from "@/lib/client-pipeline/agenda-stats";
import type { UserRecord } from "@/types/user";

assert.equal(defaultAnnualityExpiry("2026-11-02T15:00:00Z"), "2027-11");
assert.equal(defaultAnnualityExpiry("2026-01-01T01:00:00Z"), "2026-12", "Chile is still in December");
assert.equal(defaultAnnualityExpiry("2024-02-29T15:00:00Z"), "2025-02");
assert.equal(defaultAnnualityExpiry("invalid"), "");
assert.equal(isAnnualityMonth("2027-13"), false);
assert.equal(isAnnualityMonth("2027-11-01"), false);
assert.equal(isAnnualityMonth("11/2027"), false);
assert.equal(formatAnnualityMonth("2027-11"), "noviembre de 2027");
assert.equal(annualityAvailable("2027-11", "2027-11-01T02:59:59Z"), false);
assert.equal(annualityAvailable("2027-11", "2027-11-01T03:00:00Z"), true);
assert.equal(annualityAvailable("2027-11", "2027-11-29T15:00:00Z"), true);
assert.equal(annualityAvailable("2027-11", "2027-12-01T15:00:00Z"), true);

const oldProfile = { ...buildEmptyClientProfile(), firstNames: "Cliente", anualidad: true };
const oldCreated = "2025-09-09T16:16:00Z";
assert.equal(resolveAnnualityExpiry(oldProfile, oldCreated), "2026-09");
assert.equal(resolveClientProfile(oldProfile, { createdAt: oldCreated }).anualidadExpiresMonth, "2026-09");
assert.equal(resolveAnnualityExpiry({ ...oldProfile, anualidad: false }, oldCreated), "");
assert.equal(resolveAnnualityExpiry({ ...oldProfile, anualidadExpiresMonth: "2028-03" }, oldCreated), "2028-03");
const valid = { ...oldProfile, anualidadExpiresMonth: "2028-03", anualidadComment: "old" };
const normalized = normalizeClientProfileInput(valid).profile;
assert.equal(normalized.anualidadExpiresMonth, "2028-03");
assert.equal(normalized.anualidadComment, "");
for (const month of ["", "2027-13", "2027-11-01", "hola"]) {
  assert.throws(() => normalizeClientProfileInput({ ...valid, anualidadExpiresMonth: month }), /mes y año/);
}
assert.equal(normalizeClientProfileInput({ ...valid, anualidad: false }).profile.anualidadExpiresMonth, "");
assert.equal(parseClientProfilePayload(valid).anualidadExpiresMonth, "2028-03");

assert.throws(() => parseClientProfilePayload({ ...valid, anualidadExpiresMonth: 202711 }), /mes y año/);

const client = { id: "annual-client", fullName: "Cliente", assignedExecutiveId: "owner", assignedExecutiveName: "Responsable", pipelineStatus: "EN_SEGUIMIENTO", createdAt: oldCreated, clientProfile: { ...oldProfile, anualidadExpiresMonth: "2027-11" } } as UserRecord;
function stats(overrides: Partial<UserRecord> = {}, now = "2027-11-01T03:00:00Z", executiveId = "owner", isAdmin = false) {
  return countExecutiveAgendaStats({ clients: [{ ...client, ...overrides }], executiveId, isAdmin, monthKey: now.slice(0,7), now: new Date(now) });
}
assert.equal(stats({}, "2027-11-01T02:59:59Z").dueToday, 0);
assert.equal(stats().items.dueToday.filter(row => row.kind === "annuality").length, 1);
assert.equal(stats().items.dueToday[0].whenLabel, "Anualidad: noviembre de 2027");
assert.equal(stats({}, "2027-12-01T15:00:00Z").items.overdue.filter(row => row.kind === "annuality").length, 1);
assert.equal(stats({}, "2027-11-01T03:00:00Z", "other").dueToday, 0);
assert.equal(stats({}, "2027-11-01T03:00:00Z", "admin", true).dueToday, 1);
assert.equal(stats({ pipelineStatus: "CERRADO" }).dueToday, 1);
assert.equal(stats({ clientProfile: { ...valid, anualidad: false } }).dueToday, 0);
assert.equal(stats({ clientProfile: oldProfile }, "2026-09-01T15:00:00Z").dueToday, 1);
assert.equal(stats({ clientProfile: { ...valid, anualidadExpiresMonth: "2028-03" } }).dueToday, 0);
console.log("OK: defaults, legacy dates, validation, Chile month boundary, reminders, permissions, manual dates and clearing annuality.");
