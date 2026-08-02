const PUBLIC_API_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, X-API-Key, Content-Type",
  "Access-Control-Max-Age": "86400",
} as const;

export function withPublicApiCors(
  response: Response,
  request: Request,
): Response {
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(PUBLIC_API_CORS_HEADERS)) {
    headers.set(key, value);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function publicApiOptionsResponse(request: Request): Response {
  return withPublicApiCors(new Response(null, { status: 204 }), request);
}
