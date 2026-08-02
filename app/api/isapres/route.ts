import { NextResponse } from "next/server";
import { readIsapres } from "@/lib/api/isapre-store";

export async function GET() {
  try {
    const isapres = await readIsapres();
    return NextResponse.json(isapres);
  } catch (error) {
    console.error("GET /api/isapres", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las isapres." },
      { status: 500 },
    );
  }
}
