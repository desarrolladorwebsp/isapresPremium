import { NextResponse } from "next/server";
import {
  buildHealthReport,
  resolveHealthStatus,
} from "@/lib/security/health-checks";

export const runtime = "nodejs";

export async function GET() {
  const report = await buildHealthReport();
  const status = resolveHealthStatus(report);

  return NextResponse.json(report, { status });
}
