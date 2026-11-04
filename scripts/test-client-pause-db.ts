/** Development-only fixtures. Does not send emails or touch original clients. */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { updateClientPipeline } from "@/lib/api/client-pipeline-store";
import { resumeDuePausedClients } from "@/lib/api/client-pause-store";
import { readCalendarCallEvents } from "@/lib/api/calendar-store";
import { buildEmptyClientProfile } from "@/lib/client-profile/constants";
import { santiagoMonthKey } from "@/lib/client-pipeline/agenda-urgency";
import { defaultAnnualityExpiry } from "@/lib/client-profile/annuality";
import { resolveDatabaseTargets } from "../lib/db/resolve-database-env.mjs";
import type { Prisma } from "@prisma/client";

async function main() {
  const target = resolveDatabaseTargets();
  assert.equal(target.useProd, false, "Development-only test");
  assert.ok(new URL(target.pooled).hostname.startsWith("ep-frosty-salad-"), "Expected development database");
  assert.equal(await prisma.user.count({ where: { pipelineStatus: "PAUSADO" } }), 0, "Don't simulate future time with real paused clients present");
  const baseline = await prisma.$queryRaw<Array<{ clients: bigint; hash: string }>>`SELECT COUNT(*) AS clients, md5(string_agg(row_to_json(u)::text, '' ORDER BY u.id)) AS hash FROM "users" u`;
  const quotationBaseline = await prisma.$queryRaw<Array<{ quotations: bigint; hash: string }>>`SELECT COUNT(*) AS quotations, md5(string_agg(row_to_json(q)::text, '' ORDER BY q.id)) AS hash FROM "client_quotations" q`;
  const owner = await prisma.staffAccount.findFirstOrThrow({ where: { role: "ADMIN", fullName: { contains: "Alfredo" } } });
  const tracker = await prisma.staffAccount.findFirstOrThrow({ where: { role: "EXECUTIVE", executiveKind: "ISAPRES", active: true } });
  const outsider = await prisma.staffAccount.findFirstOrThrow({ where: { id: { notIn: [owner.id, tracker.id] } } });
  const stamp = Date.now();
  const id = `qa-pause-${stamp}`;
  const annualityMonth = defaultAnnualityExpiry();
  const fixture = await prisma.user.create({ data: {
    id, email: `${id}@example.invalid`, fullName: "QA Cliente Pausa", assignedExecutiveId: owner.id,
    trackingExecutiveId: tracker.id, preferredContactMethod: "ZOOM",
    nextCallAt: new Date(Date.now() - 86400000), confirmationCallAt: new Date(Date.now() - 3600000),
    reminderAt: new Date(Date.now() + 86400000), reminderNote: "Agenda de prueba que debe conservarse",
    clientProfile: { ...buildEmptyClientProfile(), firstNames: "QA Cliente", lastNames: "Pausa", anualidad: true, anualidadExpiresMonth: annualityMonth } as unknown as Prisma.InputJsonValue,
  } });
  const actor = { executiveAccountId: tracker.id, executiveKind: tracker.executiveKind, isAdmin: false };
  const manualPause = { pipelineStatus: "PAUSADO" as const, manualStatusChange: true, statusChangeNote: "Prueba de pausa", pauseReason: "Anualidad", pauseUntilMonth: annualityMonth };
  try {
    await assert.rejects(updateClientPipeline(id, { pipelineStatus: "PAUSADO" }, { executiveAccountId: owner.id, isAdmin: true }), /manual/);
    await assert.rejects(updateClientPipeline(id, { ...manualPause, pauseUntilMonth: santiagoMonthKey(new Date())! }, actor), /posteriores/);
    await assert.rejects(updateClientPipeline(id, manualPause, { executiveAccountId: outsider.id, executiveKind: outsider.executiveKind, isAdmin: false }), /permiso/);
    await assert.rejects(updateClientPipeline(id, { ...manualPause, clientProfile: { firstNames: "No permitido" } }, actor), /permiso/);
    const delegate = prisma.staffAccount;
    const originalFindUnique = delegate.findUnique;
    let concurrentEdit = false;
    delegate.findUnique = (async (...args: Parameters<typeof originalFindUnique>) => {
      if (!concurrentEdit) {
        concurrentEdit = true;
        await prisma.user.update({ where: { id }, data: { reminderNote: "Edición simultánea que debe conservarse" } });
      }
      return originalFindUnique.apply(delegate, args);
    }) as typeof originalFindUnique;
    try {
      await assert.rejects(updateClientPipeline(id, manualPause, { executiveAccountId: owner.id, isAdmin: true }), /cambió mientras/);
      assert.equal(concurrentEdit, true);
      const afterRace = await prisma.user.findUniqueOrThrow({ where: { id } });
      assert.equal(afterRace.pipelineStatus, "NUEVO");
      assert.equal(afterRace.reminderNote, "Edición simultánea que debe conservarse");
    } finally { delegate.findUnique = originalFindUnique; }
    await prisma.user.update({ where: { id }, data: { reminderNote: fixture.reminderNote } });
    const paused = await updateClientPipeline(id, manualPause, actor);
    assert.equal(paused.pipelineStatus, "PAUSADO");
    const unchangedPause = await updateClientPipeline(id, { pipelineStatus: "PAUSADO" }, { executiveAccountId: owner.id, isAdmin: true });
    assert.equal(unchangedPause.pauseUntilMonth, annualityMonth);
    assert.equal(unchangedPause.pausedById, tracker.id);
    assert.equal(paused.assignedExecutiveId, owner.id);
    assert.equal(paused.trackingExecutiveId, tracker.id);
    assert.equal(paused.nextCallAt, fixture.nextCallAt!.toISOString());
    assert.equal(paused.confirmationCallAt, fixture.confirmationCallAt!.toISOString());
    assert.equal(paused.reminderAt, fixture.reminderAt!.toISOString());
    assert.equal(paused.pausedById, tracker.id);
    assert.match(paused.pipelineNotes ?? "", /Retomar:/);
    const events = await readCalendarCallEvents({ from: new Date(Date.now()-2*86400000), to: new Date(Date.now()+2*86400000), executiveAccountId: owner.id });
    assert.equal(events.filter(row => row.clientId === id).length, 0);
    await assert.rejects(updateClientPipeline(id, { pipelineStatus: "CONTACTADO" }, { executiveAccountId: owner.id, isAdmin: true }), /Reactiva/);
    const pending = await updateClientPipeline(id, { pipelineStatus: "PENDIENTE", manualStatusChange: true, statusChangeNote: "Reactivación manual" }, actor);
    assert.equal(pending.pipelineStatus, "PENDIENTE");
    assert.ok(pending.pendingSince);
    await updateClientPipeline(id, manualPause, actor);
    assert.equal(await resumeDuePausedClients(), 0);
    // Simulate the date boundary on this fixture only, without advancing the global clock.
    await prisma.user.update({ where: { id }, data: { pauseUntilMonth: santiagoMonthKey(new Date())! } });
    const counts = await Promise.all([resumeDuePausedClients(), resumeDuePausedClients()]);
    assert.equal(counts.reduce((a,b) => a+b,0), 1, "Concurrent jobs resume exactly once");
    assert.equal(await resumeDuePausedClients(), 0);
    const resumed = await prisma.user.findUniqueOrThrow({ where: { id } });
    assert.equal(resumed.pipelineStatus, "PENDIENTE");
    assert.equal(resumed.assignedExecutiveId, owner.id);
    assert.equal(resumed.trackingExecutiveId, tracker.id);
    assert.deepEqual(resumed.clientProfile, fixture.clientProfile);
    assert.deepEqual(resumed.nextCallAt, fixture.nextCallAt);
    assert.deepEqual(resumed.confirmationCallAt, fixture.confirmationCallAt);
    assert.deepEqual(resumed.reminderAt, fixture.reminderAt);
    assert.equal((resumed.pipelineNotes ?? "").split("Pausa finalizada. Cliente pasa").length - 1, 1);
    // Keep only when explicitly requested for browser validation.
    await prisma.user.update({ where: { id }, data: { pipelineStatus: "NUEVO", pauseUntilMonth: null, pauseReason: null, pausedAt: null, pausedById: null, pendingSince: null, clientProfile: { ...buildEmptyClientProfile(), firstNames: "QA Cliente", lastNames: "Pausa" } as unknown as Prisma.InputJsonValue } });
    const folder = "Store/2026-11-02/clientes-pausados";
    mkdirSync(folder, { recursive: true });
    const keep = process.argv.includes("--keep-fixture");
    if (keep) writeFileSync(`${folder}/fixtures.json`, JSON.stringify({ id, baseline: { clients: String(baseline[0].clients), hash: baseline[0].hash }, quotations: { count: String(quotationBaseline[0].quotations), hash: quotationBaseline[0].hash }, databaseTestsPassed: true },null,2), { mode: 0o600 });
    if (!keep) {
      await prisma.user.delete({ where: { id } });
      const finalClients = await prisma.$queryRaw<Array<{ clients: bigint; hash: string }>>`SELECT COUNT(*) AS clients, md5(string_agg(row_to_json(u)::text, '' ORDER BY u.id)) AS hash FROM "users" u`;
      const finalQuotes = await prisma.$queryRaw<Array<{ quotations: bigint; hash: string }>>`SELECT COUNT(*) AS quotations, md5(string_agg(row_to_json(q)::text, '' ORDER BY q.id)) AS hash FROM "client_quotations" q`;
      assert.deepEqual(finalClients, baseline);
      assert.deepEqual(finalQuotes, quotationBaseline);
      writeFileSync(`${folder}/database-tests.json`, JSON.stringify({ passed:true, concurrentEditPreserved:true, simultaneousJobsExactlyOnce:true, fixturesRemoved:true, originalClientsUnchanged:Number(baseline[0].clients), originalQuotationsUnchanged:Number(quotationBaseline[0].quotations) },null,2), {mode:0o600});
    }
    console.log(JSON.stringify({ passed: true, fixtureId: id, scenarios: ["permisos", "pausa manual", "validación", "calendario", "reactivación manual", "reactivación automática", "concurrencia", "idempotencia", "cartera y agendas conservadas"] }));
  } catch (error) {
    await prisma.user.deleteMany({ where: { id, email: `${id}@example.invalid` } });
    throw error;
  }
}
main().catch(error => { console.error(error); process.exitCode=1; }).finally(() => prisma.$disconnect());
