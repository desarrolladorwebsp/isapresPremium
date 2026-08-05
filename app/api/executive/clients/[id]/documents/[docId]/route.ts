import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/api-error";
import {
  deleteClientDocument,
  getClientDocumentFile,
} from "@/lib/api/client-document-store";
import {
  assertSessionStaffSection,
  requireExecutiveOrAdminSession,
} from "@/lib/auth/require-auth";
import { AUTH_REALM } from "@/lib/auth/constants";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string; docId: string }>;
}

function wantsInline(request: Request): boolean {
  const value = new URL(request.url).searchParams.get("inline");
  return value === "1" || value === "true";
}

function wantsDownload(request: Request): boolean {
  const value = new URL(request.url).searchParams.get("download");
  return value === "1" || value === "true";
}

function sanitizeContentDispositionFileName(fileName: string): string {
  return fileName.replace(/["\r\n]/g, "_").slice(0, 180) || "documento";
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { realm, user } = await requireExecutiveOrAdminSession(request);
    assertSessionStaffSection(realm, user, "clientes");
    const { id, docId } = await context.params;

    const inline = wantsInline(request);
    const download = wantsDownload(request) || !inline;

    const file = await getClientDocumentFile(id, docId, {
      executiveAccountId: user.id,
      isAdmin: realm === AUTH_REALM.admin,
    });

    const safeName = sanitizeContentDispositionFileName(file.fileName);
    const disposition = download
      ? `attachment; filename="${safeName}"`
      : `inline; filename="${safeName}"`;

    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(file.buffer.byteLength),
        "Content-Disposition": disposition,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("GET /api/executive/clients/[id]/documents/[docId]", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { realm, user } = await requireExecutiveOrAdminSession(request);
    assertSessionStaffSection(realm, user, "clientes");
    const { id, docId } = await context.params;

    await deleteClientDocument(id, docId, {
      executiveAccountId: user.id,
      isAdmin: realm === AUTH_REALM.admin,
      executiveKind:
        realm === AUTH_REALM.executive
          ? (user as import("@/lib/auth/types").ExecutiveSessionUser).executiveKind
          : null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/executive/clients/[id]/documents/[docId]", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
