import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { resolveDatabaseTargets } from "../lib/db/resolve-database-env.mjs";
async function main() {
  assert.equal(resolveDatabaseTargets().useProd,false);
  assert.ok(new URL(resolveDatabaseTargets().pooled).hostname.startsWith("ep-frosty-salad-"));
  const folder="Store/2026-11-02/clientes-pausados";
  const record=JSON.parse(readFileSync(`${folder}/fixtures.json`,"utf8"));
  assert.match(record.id,/^qa-pause-\d+$/);
  const fixture=await prisma.user.findUnique({where:{id:record.id}});
  if (fixture) {
    assert.equal(fixture.email,`${record.id}@example.invalid`);
    await prisma.user.delete({where:{id:fixture.id}});
  }
  const actual=await prisma.$queryRaw<Array<{clients:bigint;hash:string}>>`SELECT COUNT(*) AS clients, md5(string_agg(row_to_json(u)::text, '' ORDER BY u.id)) AS hash FROM "users" u`;
  const quotes=await prisma.$queryRaw<Array<{quotations:bigint;hash:string}>>`SELECT COUNT(*) AS quotations, md5(string_agg(row_to_json(q)::text, '' ORDER BY q.id)) AS hash FROM "client_quotations" q`;
  assert.equal(String(actual[0].clients),record.baseline.clients);
  assert.equal(actual[0].hash,record.baseline.hash,"Original clients must be byte-for-byte unchanged");
  assert.equal(String(quotes[0].quotations),record.quotations.count);
  assert.equal(quotes[0].hash,record.quotations.hash,"Original quotations must be unchanged");
  const report={fixtureRemoved:true,originalClients:Number(actual[0].clients),originalClientsUnchanged:true,quotations:Number(quotes[0].quotations),quotationsUnchanged:true};
  writeFileSync(`${folder}/cleanup.json`,JSON.stringify(report,null,2),{mode:0o600});console.log(JSON.stringify(report));
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>prisma.$disconnect());
