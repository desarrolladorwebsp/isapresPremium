/** Isolated regressions: executes production modules with an in-memory Prisma adapter.
 * No database connections or emails. Run: node --import tsx scripts/test-auto-assignment-preference.ts
 */
import assert from "node:assert/strict";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { ApiError } from "../lib/api/api-error";
import type { StaffAccount, Prisma } from "@prisma/client";
import type * as Assignment from "../lib/api/lead-assignment";
import type * as Accounts from "../lib/auth/account-store";
import type * as Users from "../lib/api/user-store";
import type * as Route from "../app/api/admin/accounts/[id]/route";

// Compile the actual modules; replace only I/O boundaries, never the behavior under test.
function load<T>(file: string, mocks: Record<string, unknown>, expose = ""): T {
  const filename = path.resolve(file);
  const localRequire = createRequire(filename);
  const loaded = { exports: {} };
  const compiled = ts.transpileModule(readFileSync(filename, "utf8") + expose, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(compiled, {
    module: loaded, exports: loaded.exports, console, process, URL, Request, Response,
    require: (id: string) => id in mocks ? mocks[id] : localRequire(id),
  }, { filename });
  return loaded.exports as T;
}

type Client = { id: string; fullName: string; role: string; assignedExecutiveId: string | null; createdAt: Date; updatedAt: Date };
let accounts: StaffAccount[] = [];
let clients: Client[] = [];
let emails: unknown[] = [];
let beforeTargetRead: (() => void) | undefined;
let beforeClientWrite: (() => void) | undefined;
let quoteUpdates = 0;

function matches(row: Record<string, unknown>, where: Record<string, unknown> = {}): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") return (value as Record<string, unknown>[]).some((part) => matches(row, part));
    if (value && typeof value === "object") {
      const filter = value as { in?: unknown[]; not?: unknown };
      if (filter.in) return filter.in.includes(row[key]);
      if ("not" in filter) return row[key] !== null && row[key] !== filter.not;
      throw new Error(`Unsupported test filter ${key}`);
    }
    return row[key] === value;
  });
}
const db = {
  staffAccount: {
    findMany: async ({ where }: { where?: Prisma.StaffAccountWhereInput }) => accounts.filter((a) => matches(a as unknown as Record<string, unknown>, where as Record<string, unknown>)),
    findFirst: async ({ where }: { where: Prisma.StaffAccountWhereInput }) => accounts.find((a) => matches(a as unknown as Record<string, unknown>, where as Record<string, unknown>)) ?? null,
    findUnique: async ({ where }: { where: { id: string } }) => {
      beforeTargetRead?.(); beforeTargetRead = undefined;
      return accounts.find((a) => a.id === where.id) ?? null;
    },
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const account = accounts.find((a) => a.id === where.id)!;
      for (const [key, value] of Object.entries(data)) if (value !== undefined) Object.assign(account, { [key]: value });
      return account;
    },
  },
  user: {
    findUnique: async ({ where }: { where: { id: string } }) => {
      const row = clients.find((c) => c.id === where.id);
      return row ? { ...row } : null;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<Client> }) => {
      const row = clients.find((c) => c.id === where.id)!;
      Object.assign(row, data);
      return { ...row };
    },
    findMany: async ({ where }: { where: Record<string, unknown> }) => clients.filter((c) => matches(c, where)),
    groupBy: async (args: { _count?: unknown }) => {
      const ids = [...new Set(clients.map((c) => c.assignedExecutiveId).filter(Boolean))];
      return ids.map((id) => args._count
        ? { assignedExecutiveId: id, _count: { id: clients.filter((c) => c.assignedExecutiveId === id).length } }
        : { assignedExecutiveId: id, _max: { updatedAt: new Date(Math.max(...clients.filter((c) => c.assignedExecutiveId === id).map((c) => c.updatedAt.getTime()))) } });
    },
    updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Partial<Client> }) => {
      beforeClientWrite?.(); beforeClientWrite = undefined;
      const selected = clients.filter((c) => matches(c, where));
      selected.forEach((c) => Object.assign(c, data));
      return { count: selected.length };
    },
    count: async ({ where }: { where: Record<string, unknown> }) => clients.filter((c) => matches(c, where)).length,
  },
  quote: { updateMany: async () => { quoteUpdates++; return { count: 1 }; } },
};
const mocks = {
  "@/lib/prisma": { prisma: db },
  "@/lib/email/notify-executive-client-assignment": { queueExecutiveClientAssignmentEmail: (input: unknown) => emails.push(input) },
};
const assignment = load<typeof Assignment>("lib/api/lead-assignment.ts", mocks);
const store = load<typeof Accounts>("lib/auth/account-store.ts", mocks);
const users = load<typeof Users>("lib/api/user-store.ts", mocks);
let authorized = true;
const route = load<typeof Route>("app/api/admin/accounts/[id]/route.ts", {
  ...mocks,
  "@/lib/auth/account-store": store,
  "@/lib/auth/require-auth": { requireAdminSession: async () => { if (!authorized) throw new ApiError("Forbidden", 403, "FORBIDDEN"); } },
});
function account(id: string, overrides: Partial<StaffAccount> = {}): StaffAccount {
  return { id, fullName: id, email: `${id}@test.invalid`, role: "EXECUTIVE", executiveKind: "ISAPRES_PREMIUM",
    active: true, onboardingCompleted: true, assignmentsSuspended: false, autoAssignmentEnabled: true,
    subscriptionStatus: "ACTIVE", subscriptionExpiresAt: null, createdAt: new Date(), updatedAt: new Date(),
    lastLoginAt: null, mustChangePassword: false, ...overrides } as StaffAccount;
}
function reset(...rows: StaffAccount[]) {
  accounts = rows; clients = []; emails = []; quoteUpdates = 0; beforeTargetRead = undefined; beforeClientWrite = undefined;
}
function client(id: string, assignedExecutiveId: string | null = null) {
  clients.push({ id, fullName: id, role: "CLIENT", assignedExecutiveId, createdAt: new Date(0), updatedAt: new Date(0) });
}
let passed = 0;
async function test(name: string, run: () => Promise<void>) {
  await run(); passed++; console.log(`✓ ${name}`);
}
async function main() {
  await test("Automatic pool excludes disabled admins and executives, inactive, incomplete, suspended and membership", async () => {
    reset(account("admin-off", { role: "ADMIN", executiveKind: null, autoAssignmentEnabled: false }),
      account("exec-off", { autoAssignmentEnabled: false }), account("inactive", { active: false }),
      account("pending", { onboardingCompleted: false }), account("paused", { assignmentsSuspended: true }),
      account("member", { executiveKind: "MEMBRESIA_ISAPRES_PREMIUM" }), account("enabled"));
    assert.equal(await assignment.pickExecutiveRoundRobin(), "enabled");
    assert.equal(await assignment.pickExecutiveRoundRobin({ inboundPool: true }), "enabled");
  });
  await test("Enabled admin can receive general, inbound, Premium and Zoom assignments; Isapres restrictions remain", async () => {
    reset(account("admin", { role: "ADMIN", executiveKind: null, onboardingCompleted: false }));
    for (const options of [undefined, { inboundPool: true }, { executiveKind: "ISAPRES_PREMIUM" as const }, { executiveKind: "ZOOM" as const }]) {
      assert.equal(await assignment.pickExecutiveRoundRobin(options), "admin");
    }
    assert.equal(await assignment.pickExecutiveRoundRobin({ executiveKind: "ISAPRES" }), null);
    assert.equal(await assignment.pickExecutiveRoundRobin({ executiveKind: "MEMBRESIA_ISAPRES_PREMIUM" }), null);
  });
  await test("Kind filtering and round-robin balance survive", async () => {
    reset(account("a"), account("b"), account("zoom", { executiveKind: "ZOOM" }));
    for (const id of ["c1", "c2", "c3", "c4"]) { client(id); await assignment.autoAssignClientExecutive(id, { executiveKind: "ISAPRES_PREMIUM" }); }
    assert.equal(clients.filter((c) => c.assignedExecutiveId === "a").length, 2);
    assert.equal(clients.filter((c) => c.assignedExecutiveId === "b").length, 2);
    assert.equal(emails.length, 4);
    assert.equal(await assignment.pickExecutiveRoundRobin({ executiveKind: "ZOOM" }), "zoom");
  });
  await test("No enabled recipient leaves client pending and sends no email", async () => {
    reset(account("off", { autoAssignmentEnabled: false })); client("c");
    assert.equal(await assignment.autoAssignClientExecutive("c"), null);
    assert.equal(clients[0].assignedExecutiveId, null); assert.equal(emails.length, 0);
    assert.equal((await assignment.distributeUnassignedClients()).remaining, 1);
  });
  await test("Existing portfolio is retained after disabling automatic assignment", async () => {
    reset(account("a")); client("existing", "a");
    const result = await store.updateStaffAccount("executive", "a", { autoAssignmentEnabled: false });
    assert.equal(result.autoAssignmentEnabled, false); assert.equal(result.active, true);
    assert.equal(await assignment.autoAssignClientExecutive("existing"), "a");
    assert.equal(clients[0].assignedExecutiveId, "a"); assert.equal(emails.length, 0);
  });
  await test("Manual selectors and validation still accept an administrator or executive with automation off", async () => {
    reset(account("admin", { role: "ADMIN", executiveKind: null, autoAssignmentEnabled: false }), account("exec", { autoAssignmentEnabled: false }));
    assert.equal((await assignment.listEligibleExecutivesForAssignment()).length, 2);
    await users.assertAssignableExecutive("admin"); await users.assertAssignableExecutive("exec");
    client("manual-client");
    const assigned = await users.assignUserToExecutive("manual-client", "admin");
    assert.equal(assigned.assignedExecutiveId, "admin");
    assert.equal(clients[0].assignedExecutiveId, "admin");
    assert.equal(quoteUpdates, 1); assert.equal(emails.length, 1);
  });
  await test("Server refuses membership activation and preserves manual membership exclusion", async () => {
    reset(account("m", { executiveKind: "MEMBRESIA_ISAPRES_PREMIUM", autoAssignmentEnabled: false }));
    await assert.rejects(store.updateStaffAccount("executive", "m", { autoAssignmentEnabled: true }));
    await assert.rejects(users.assertAssignableExecutive("m"));
  });
  await test("Admin preference persists both ways without changing access or role", async () => {
    reset(account("admin", { role: "ADMIN", executiveKind: null, autoAssignmentEnabled: false }));
    for (const value of [true, false]) {
      const updated = await store.updateStaffAccount("admin", "admin", { autoAssignmentEnabled: value });
      assert.equal(updated.autoAssignmentEnabled, value); assert.equal(updated.realm, "admin"); assert.equal(updated.active, true);
      assert.equal(await assignment.pickExecutiveRoundRobin(), value ? "admin" : null);
    }
  });
  await test("Recheck rejects a recipient disabled after selection", async () => {
    reset(account("a")); client("c"); beforeTargetRead = () => { accounts[0].autoAssignmentEnabled = false; };
    assert.equal(await assignment.autoAssignClientExecutive("c"), null); assert.equal(emails.length, 0);
  });
  await test("Automatic write cannot overwrite a concurrent manual assignment", async () => {
    reset(account("a")); client("c"); beforeClientWrite = () => { clients[0].assignedExecutiveId = "manual"; };
    assert.equal(await assignment.autoAssignClientExecutive("c"), "manual"); assert.equal(emails.length, 0);
  });
  await test("Batch distribution honors preference and synchronizes quotes", async () => {
    reset(account("off", { autoAssignmentEnabled: false }), account("on")); client("c1"); client("c2");
    const result = await assignment.distributeUnassignedClients();
    assert.equal(result.assigned, 2); assert.equal(result.remaining, 0);
    assert.ok(clients.every((c) => c.assignedExecutiveId === "on")); assert.equal(quoteUpdates, 2);
  });
  await test("PATCH validates boolean, realm and persistence", async () => {
    reset(account("admin", { role: "ADMIN", executiveKind: null, autoAssignmentEnabled: false }));
    const patch = (body: unknown, realm = "admin") => route.PATCH(new Request(`https://test.invalid/api/admin/accounts/admin?realm=${realm}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }), { params: Promise.resolve({ id: "admin" }) });
    assert.equal((await patch({ autoAssignmentEnabled: "true" })).status, 400);
    assert.equal((await patch({ autoAssignmentEnabled: true }, "invalid")).status, 400);
    const response = await patch({ autoAssignmentEnabled: true });
    assert.equal(response.status, 200); assert.equal((await response.json()).account.autoAssignmentEnabled, true);
    assert.equal((await patch({ autoAssignmentEnabled: false })).status, 200);
    assert.equal(accounts[0].autoAssignmentEnabled, false);
  });
  await test("PATCH still requires administrator authorization", async () => {
    authorized = false;
    const response = await route.PATCH(new Request("https://test.invalid/api/admin/accounts/admin?realm=admin", { method: "PATCH", body: JSON.stringify({ autoAssignmentEnabled: true }) }), { params: Promise.resolve({ id: "admin" }) });
    assert.equal(response.status, 403); authorized = true;
  });
  await test("Users table exposes accessible saved checkboxes for admin and executive, excludes membership and disables read-only controls", async () => {
    reset(account("admin", { role: "ADMIN", executiveKind: null, autoAssignmentEnabled: false }), account("exec"),
      account("member", { executiveKind: "MEMBRESIA_ISAPRES_PREMIUM", autoAssignmentEnabled: false }));
    const { UsersDirectoryTable } = load<{ UsersDirectoryTable: ComponentType<Record<string, unknown>> }>(
      "components/admin/users-panel.tsx", {}, "\nexport { UsersDirectoryTable };\n");
    const records = await store.listStaffAccounts();
    const props = {
      rows: records.map((record) => ({ kind: "account", account: record, sortAt: record.createdAt })),
      executivesOnly: false, canManage: true, assignmentCounts: {}, assignmentSaving: false,
      sortProps: () => ({}), onResendInvite: () => {}, onCancelInvite: () => {}, onChangeRole: () => {},
      onToggleAssignments: () => {}, onToggleAutoAssignments: () => {}, onToggleActive: () => {},
    };
    const html = renderToStaticMarkup(createElement(UsersDirectoryTable, props));
    assert.equal((html.match(/type="checkbox"/g) ?? []).length, 2);
    assert.match(html, /aria-label="Asignación automática de clientes para admin"/);
    assert.match(html, /aria-label="Asignación automática de clientes para exec"/);
    assert.equal((html.match(/checked=""/g) ?? []).length, 1);
    assert.match(html, /No aplica/);
    for (const overrides of [{ canManage: false }, { assignmentSaving: true }]) {
      const locked = renderToStaticMarkup(createElement(UsersDirectoryTable, { ...props, ...overrides }));
      assert.equal((locked.match(/type="checkbox" disabled=""/g) ?? []).length, 2);
    }
  });
  console.log(`\n${passed} regression scenarios passed; no real database writes or emails.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
