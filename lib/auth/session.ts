import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  STAFF_SESSION_COOKIE,
  type AuthRealm,
} from "@/lib/auth/constants";
import {
  createSessionToken,
  refreshSessionToken,
  verifySessionToken,
} from "@/lib/auth/jwt";
import type { SessionPayload } from "@/lib/auth/types";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

async function verifyToken(token: string): Promise<SessionPayload | null> {
  return verifySessionToken(token);
}

async function readBestStaffSession(
  tokens: Array<string | undefined>,
): Promise<SessionPayload | null> {
  const sessions = (
    await Promise.all(
      tokens.filter(Boolean).map((token) => verifyToken(token as string)),
    )
  ).filter((session): session is SessionPayload => session !== null);

  if (sessions.length === 0) return null;

  const adminSession = sessions.find((session) => session.realm === "admin");
  return adminSession ?? sessions[0];
}

export async function setStaffSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(
    STAFF_SESSION_COOKIE,
    token,
    cookieOptions(SESSION_MAX_AGE_SECONDS),
  );
  cookieStore.set(SESSION_COOKIE.admin, "", cookieOptions(0));
  cookieStore.set(SESSION_COOKIE.executive, "", cookieOptions(0));
}

export async function clearAllStaffSessionCookies(): Promise<void> {
  const cookieStore = await cookies();
  const clearOptions = {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  };

  cookieStore.set(STAFF_SESSION_COOKIE, "", clearOptions);
  cookieStore.set(SESSION_COOKIE.admin, "", clearOptions);
  cookieStore.set(SESSION_COOKIE.executive, "", clearOptions);
}

/** @deprecated Usar setStaffSessionCookie. Mantenido por compatibilidad interna. */
export function getSessionCookieName(_realm: AuthRealm): string {
  return STAFF_SESSION_COOKIE;
}

/** @deprecated Usar setStaffSessionCookie. */
export async function setSessionCookie(
  _realm: AuthRealm,
  token: string,
): Promise<void> {
  await setStaffSessionCookie(token);
}

/** @deprecated Usar clearAllStaffSessionCookies. */
export async function clearSessionCookie(_realm: AuthRealm): Promise<void> {
  await clearAllStaffSessionCookies();
}

export async function readStaffSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();

  return readBestStaffSession([
    cookieStore.get(STAFF_SESSION_COOKIE)?.value,
    cookieStore.get(SESSION_COOKIE.admin)?.value,
    cookieStore.get(SESSION_COOKIE.executive)?.value,
  ]);
}

export async function readStaffSessionFromRequest(
  request: Request,
): Promise<SessionPayload | null> {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const read = (name: string) => {
    const match = cookieHeader.match(
      new RegExp(`(?:^|;\\s*)${name}=([^;]+)`),
    );
    return match?.[1] ? decodeURIComponent(match[1]) : undefined;
  };

  return readBestStaffSession([
    read(STAFF_SESSION_COOKIE),
    read(SESSION_COOKIE.admin),
    read(SESSION_COOKIE.executive),
  ]);
}

/** @deprecated Usar readStaffSessionFromCookies y validar realm en el caller. */
export async function readSessionFromCookies(
  realm: AuthRealm,
): Promise<SessionPayload | null> {
  const session = await readStaffSessionFromCookies();
  if (!session || session.realm !== realm) return null;
  return session;
}

/** @deprecated Usar readStaffSessionFromRequest y validar realm en el caller. */
export async function readSessionFromRequest(
  request: Request,
  realm: AuthRealm,
): Promise<SessionPayload | null> {
  const session = await readStaffSessionFromRequest(request);
  if (!session || session.realm !== realm) return null;
  return session;
}

export function readSessionTokenFromRequest(
  request: Request,
  _realm?: AuthRealm,
): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  for (const name of [
    STAFF_SESSION_COOKIE,
    SESSION_COOKIE.admin,
    SESSION_COOKIE.executive,
  ]) {
    const match = cookieHeader.match(
      new RegExp(`(?:^|;\\s*)${name}=([^;]+)`),
    );
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
}

export async function issueSession(input: {
  accountId: string;
  email: string;
  realm: AuthRealm;
  mustChangePassword?: boolean;
}): Promise<string> {
  const token = await createSessionToken(input);
  await setStaffSessionCookie(token);
  return token;
}

export async function refreshStaffSession(
  session: SessionPayload,
  overrides?: { realm?: AuthRealm; sub?: string; mustChangePassword?: boolean },
): Promise<string> {
  const token = await refreshSessionToken(session, overrides);
  await setStaffSessionCookie(token);
  return token;
}

export function applyStaffSessionCookieToResponse(
  response: Response,
  token: string,
): void {
  const parts = [
    `${STAFF_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ];

  if (isProduction()) {
    parts.push("Secure");
  }

  response.headers.append("Set-Cookie", parts.join("; "));

  for (const legacy of [SESSION_COOKIE.admin, SESSION_COOKIE.executive]) {
    const clearParts = [
      `${legacy}=`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      "Max-Age=0",
    ];
    if (isProduction()) {
      clearParts.push("Secure");
    }
    response.headers.append("Set-Cookie", clearParts.join("; "));
  }
}

function buildClearCookieHeader(name: string): string {
  const parts = [
    `${name}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ];

  if (isProduction()) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function clearStaffSessionCookiesOnResponse(response: Response): void {
  for (const name of [
    STAFF_SESSION_COOKIE,
    SESSION_COOKIE.admin,
    SESSION_COOKIE.executive,
  ]) {
    response.headers.append("Set-Cookie", buildClearCookieHeader(name));
  }
}
