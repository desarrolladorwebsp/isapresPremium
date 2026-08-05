import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/api-error";
import {
  createClientDocument,
  listClientDocuments,
} from "@/lib/api/client-document-store";
import {
  assertSessionStaffSection,
  requireExecutiveOrAdminSession,
} from "@/lib/auth/require-auth";
import { AUTH_REALM } from "@/lib/auth/constants";
import { isClientDocumentKind } from "@/types/client-document";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { realm, user } = await requireExecutiveOrAdminSession(request);
    assertSessionStaffSection(realm, user, "clientes");
    const { id } = await context.params;

    const documents = await listClientDocuments(id, {
      executiveAccountId: user.id,
      isAdmin: realm === AUTH_REALM.admin,
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("GET /api/executive/clients/[id]/documents", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { realm, user } = await requireExecutiveOrAdminSession(request);
    assertSessionStaffSection(realm, user, "clientes");
    const { id } = await context.params;

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Debes enviar el archivo como multipart/form-data." },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Debes adjuntar un archivo." },
        { status: 400 },
      );
    }

    const kindRaw =
      typeof formData.get("kind") === "string"
        ? formData.get("kind")!.toString().trim()
        : "";
    if (!isClientDocumentKind(kindRaw)) {
      return NextResponse.json(
        { error: "El tipo de documento no es válido." },
        { status: 400 },
      );
    }

    const customLabel =
      typeof formData.get("customLabel") === "string"
        ? formData.get("customLabel")!.toString()
        : null;

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const created = await createClientDocument(
      id,
      {
        kind: kindRaw,
        customLabel,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileBuffer,
      },
      {
        executiveAccountId: user.id,
        isAdmin: realm === AUTH_REALM.admin,
        executiveKind:
          realm === AUTH_REALM.executive
            ? (user as import("@/lib/auth/types").ExecutiveSessionUser)
                .executiveKind
            : null,
        actorName: user.fullName,
      },
    );

    return NextResponse.json({ document: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/executive/clients/[id]/documents", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
