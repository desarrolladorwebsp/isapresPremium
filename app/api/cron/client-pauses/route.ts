import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { resumeDuePausedClients } from "@/lib/api/client-pause-store";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Cron no configurado." }, { status: 503 });
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  let resumed = 0;
  for (let batch = 0; batch < 20; batch++) {
    const count = await resumeDuePausedClients();
    resumed += count;
    if (count < 1000) return NextResponse.json({ resumed, complete: true });
  }
  return NextResponse.json({ resumed, complete: false });
}
