import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/api-error";
import { readStaffAvatarFile } from "@/lib/auth/account-store";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const avatar = await readStaffAvatarFile(id);
    if (!avatar) {
      return NextResponse.json({ error: "Foto no encontrada." }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(avatar.buffer), {
      status: 200,
      headers: {
        "Content-Type": avatar.mimeType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("GET /api/staff/avatars/[id]", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
