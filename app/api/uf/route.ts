import { buildFallbackUfIndicator, fetchUfIndicator } from "@/lib/uf-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get("refresh") === "1";

  try {
    const indicator = await fetchUfIndicator({ force });
    return Response.json(indicator, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
      },
    });
  } catch {
    const fallback = buildFallbackUfIndicator();
    return Response.json(fallback, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}
