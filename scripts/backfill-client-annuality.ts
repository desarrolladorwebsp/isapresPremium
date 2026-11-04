/** One-time, idempotent legacy annuality dates. Dry run unless --apply. */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@/lib/prisma";
import { defaultAnnualityExpiry } from "@/lib/client-profile/annuality";
import { assertSafeForDestructiveCommand } from "../lib/db/resolve-database-env.mjs";
import { Prisma } from "@prisma/client";

async function main() {
  const apply = process.argv.includes("--apply");
  if (apply) assertSafeForDestructiveCommand();
  const rows = await prisma.user.findMany({
    where: { clientProfile: { path: ["anualidad"], equals: true } },
    select: { id: true, createdAt: true, clientProfile: true },
  });
  const candidates = rows.filter(row => {
    const profile = row.clientProfile as Prisma.JsonObject;
    return profile.anualidadExpiresMonth == null || profile.anualidadExpiresMonth === "";
  }).map(row => ({ ...row, month: defaultAnnualityExpiry(row.createdAt) }));
  if (candidates.some(row => !row.month)) throw new Error("A legacy record has an invalid creation date");
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", annualityClients: rows.length, missingDates: candidates.length }));
  if (!apply || !candidates.length) return;
  const folder = resolve("Store", new Date().toISOString().slice(0,10), "anualidades");
  mkdirSync(folder, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/[:.]/g,"-");
  // Keep just the changed property; no names, emails or complete profiles.
  writeFileSync(resolve(folder, `${stamp}-before.json`), JSON.stringify(candidates.map(row => ({ id: row.id, previousValue: (row.clientProfile as Prisma.JsonObject).anualidadExpiresMonth ?? null, hadKey: Object.hasOwn(row.clientProfile as object, "anualidadExpiresMonth"), nextValue: row.month })),null,2), { mode:0o600 });
  const counts = await prisma.$transaction(async tx => {
    const before = { clients: await tx.user.count(), quotations: await tx.clientQuotation.count() };
    const values = Prisma.join(candidates.map(row => Prisma.sql`(${row.id}, ${JSON.stringify(row.clientProfile)}::jsonb, ${row.month})`));
    // One atomic update, with equality checks to preserve concurrent edits.
    const updated = await tx.$executeRaw(Prisma.sql`
      UPDATE "users" AS u
      SET "client_profile" = jsonb_set(u."client_profile", '{anualidadExpiresMonth}', to_jsonb(source.month::text), true)
      FROM (VALUES ${values}) AS source(id, profile, month)
      WHERE u.id = source.id AND u."client_profile" = source.profile
    `);
    const after = { clients: await tx.user.count(), quotations: await tx.clientQuotation.count() };
    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("Record counts changed");
    return { before, after, updated, skippedConcurrentEdits: candidates.length - updated };
  }, { timeout: 30000 });
  writeFileSync(resolve(folder, `${stamp}-result.json`), JSON.stringify(counts,null,2), { mode:0o600 });
  console.log(JSON.stringify(counts));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
