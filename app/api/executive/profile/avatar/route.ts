import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/api-error";
import {
  clearStaffAvatar,
  setStaffAvatar,
} from "@/lib/auth/account-store";
import { requireExecutiveOrAdminSession } from "@/lib/auth/require-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { user } = await requireExecutiveOrAdminSession(request, {
      allowIncompleteOnboarding: true,
    });

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Debes enviar la foto como multipart/form-data." },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Debes adjuntar una imagen." },
        { status: 400 },
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const result = await setStaffAvatar(user.id, {
      fileBuffer,
      mimeType: file.type || "image/jpeg",
    });

    return NextResponse.json({ ok: true, avatarUrl: result.avatarUrl });
  } catch (error) {
    console.error("POST /api/executive/profile/avatar", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const { user } = await requireExecutiveOrAdminSession(request, {
      allowIncompleteOnboarding: true,
    });

    await clearStaffAvatar(user.id);
    return NextResponse.json({ ok: true, avatarUrl: null });
  } catch (error) {
    console.error("DELETE /api/executive/profile/avatar", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
