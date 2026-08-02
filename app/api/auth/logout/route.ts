import { NextResponse } from "next/server";
import { clearStaffSessionCookiesOnResponse } from "@/lib/auth/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearStaffSessionCookiesOnResponse(response);
  return response;
}
