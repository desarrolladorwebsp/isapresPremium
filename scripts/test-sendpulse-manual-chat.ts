import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { fetchFullSendpulseChat } from "../lib/sendpulse/remote";
import { mergeSendpulseChat } from "../lib/sendpulse/chat-merge";
import type * as Route from "../app/api/executive/clients/[id]/sendpulse-chat/route";

function load<T>(file: string, mocks: Record<string, unknown>, extra = "") {
  const filename = path.resolve(file);
  const req = createRequire(filename);
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(filename, "utf8") + extra, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports, require: (name: string) => mocks[name] ?? req(name),
    fetch: globalThis.fetch, encodeURIComponent, console,
  }, { filename });
  return module.exports as T;
}

async function main() {
  const realFetch = globalThis.fetch;
  const longMessage = "a".repeat(550);
  const message = (id: string, text: string) => ({
    id, direction: 1, created_at: "2026-10-01T15:00:00Z", data: { text },
  });
  const pages = [
    [message("4", longMessage), message("3", "Hola")],
    [message("3", "Hola"), message("2", "Hola")],
    [message("1", "Mensaje anterior")],
    [message("0", "Primera página histórica")],
  ];
  let fetched = 0;
  let failPage = false;
  const fixtureFetch: typeof fetch = async (input) => {
    const url = new URL(String(input));
    const page = Number(url.searchParams.get("page") ?? 0);
    fetched++;
    if (failPage && page === 2) return new Response(null, { status: 503 });
    return Response.json({
      data: pages[page],
      links: { next: page < 3 ? `https://api.sendpulse.com/whatsapp/chats/messages?page=${page + 1}` : null },
    });
  };

  globalThis.fetch = fixtureFetch;
  try {
    const remote = await fetchFullSendpulseChat("contact", "fake");
    assert.equal(fetched, 4);
    const lines = remote.chat!.split("\n");
    assert.match(lines[1], /Primera página histórica/);
    assert.equal(lines.filter(line => line.endsWith(": Hola")).length, 2);
    const previous = "Chat de SendPulse\n" + lines[3] + "\n" + remote.legacyLines.get(lines.at(-1)!);
    const merged = mergeSendpulseChat(previous, remote.chat, remote.legacyLines);
    assert.equal(merged.added, 3);
    assert.equal(merged.chat, remote.chat);
    assert.equal(mergeSendpulseChat(merged.chat, remote.chat, remote.legacyLines).added, 0);
    console.log("OK cuatro páginas, solapamiento por ID, historial de texto y mensajes legítimos repetidos");

    const client = {
      id: "fixture", role: "CLIENT", sendpulseContactId: "contact", sendpulseBotPhone: "+56912345678",
      sendpulseChat: previous, updatedAt: new Date(), assignedExecutiveId: "assigned",
      trackingExecutiveId: "tracker", fullName: "QA", phone: "123", pipelineStatus: "CONTACTADO",
      pipelineNotes: "Nota humana", clientProfile: { anualidad: true },
    };
    const original = structuredClone(client);
    let writes = 0;
    let executiveId = "tracker";
    const route = load<typeof Route>("app/api/executive/clients/[id]/sendpulse-chat/route.ts", {
      "@/lib/auth/require-auth": {
        requireExecutiveOrAdminSession: async () => ({ realm: "executive", user: { id: executiveId, executiveKind: "ISAPRES_PREMIUM" } }),
        assertSessionStaffSection: () => {},
      },
      "@/lib/api/user-store": { readClientOrThrow: async () => ({ ...client }) },
      "@/lib/sendpulse/api-key": { openSendpulseApiKey: () => "fake" },
      "@/lib/prisma": { prisma: {
        sendpulseBotLine: { findUnique: async () => ({ active: true, apiKeyEnc: "fake" }) },
        $executeRaw: async (sql: TemplateStringsArray, chat: string, id: string, updatedAt: Date, expectedChat: string) => {
          assert.match(sql.join("?"), /SET sendpulse_chat = \?\s+WHERE id/);
          assert.equal(id, client.id);
          assert.equal(updatedAt, client.updatedAt);
          if (expectedChat !== client.sendpulseChat) return 0;
          client.sendpulseChat = chat;
          writes++;
          return 1;
        },
      }},
    });
    const request = () => route.POST(new Request("http://localhost/api", { method: "POST" }), { params: Promise.resolve({ id: client.id }) });

    let pathCalled = "";
    let buttonResult: unknown;
    let hookIndex = 0;
    globalThis.fetch = async (input, init) => {
      if (!String(input).startsWith("/api/")) return fixtureFetch(input, init);
      pathCalled = String(input);
      assert.equal(init?.method, "POST");
      return request();
    };
    const view = load<{ SendpulseChatSection: (props: {client: typeof client}) => {props: {children: Array<{props?: {onClick?: () => Promise<void>; children?: string}}>}} }>(
      "components/executive/client-seguimiento-flow-view.tsx",
      { react: { useState: (value: unknown) => {
        const index = hookIndex++;
        return [value, (next: unknown) => { if (index === 0) buttonResult = next; }];
      } } },
      "\nexport { SendpulseChatSection };",
    );
    const button = view.SendpulseChatSection({ client }).props.children[0];
    assert.equal(button.props?.children, "Actualizar conversación");
    await button.props!.onClick!();
    assert.equal(pathCalled, "/api/executive/clients/fixture/sendpulse-chat");
    assert.deepEqual(buttonResult, merged);
    assert.deepEqual({ ...client, sendpulseChat: original.sendpulseChat }, original);
    assert.equal(writes, 1);

    globalThis.fetch = fixtureFetch;
    assert.equal((await (await request()).json()).added, 0);
    assert.equal(writes, 1);
    failPage = true;
    assert.equal((await request()).status, 502);
    assert.equal(writes, 1);
    executiveId = "unrelated";
    assert.equal((await request()).status, 403);
    assert.equal(writes, 1);
    console.log("OK botón manual, ejecutivo en seguimiento, reintento sin duplicados, fallo parcial y permisos");
  } finally {
    globalThis.fetch = realFetch;
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
