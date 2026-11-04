import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { GET } from "@/app/api/cron/client-pauses/route";
import { prisma } from "@/lib/prisma";
import { resolveDatabaseTargets } from "../lib/db/resolve-database-env.mjs";

async function main() {
  assert.equal(resolveDatabaseTargets().useProd, false);
  assert.ok(new URL(resolveDatabaseTargets().pooled).hostname.startsWith("ep-frosty-salad-"));
  assert.equal(await prisma.user.count({ where: { pipelineStatus: "PAUSADO" } }), 0, "All test pauses must already be resumed");
  const previous = process.env.CRON_SECRET;
  try {
    delete process.env.CRON_SECRET;
    assert.equal((await GET(new Request("http://localhost/api/cron/client-pauses"))).status, 503);
    const secret = randomUUID(); process.env.CRON_SECRET = secret;
    assert.equal((await GET(new Request("http://localhost/api/cron/client-pauses"))).status, 401);
    assert.equal((await GET(new Request("http://localhost/api/cron/client-pauses", { headers: { authorization: "Bearer incorrect" } }))).status, 401);
    const response = await GET(new Request("http://localhost/api/cron/client-pauses", { headers: { authorization: `Bearer ${secret}` } }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { resumed: 0, complete: true });
    console.log("OK cron: missing configuration denied, anonymous denied, wrong token denied, authorized job is idempotent.");
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET=previous;
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode=1; });
