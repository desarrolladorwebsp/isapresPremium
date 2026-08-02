import { SignJWT, jwtVerify } from "jose";
import {
  AUTH_REALM,
  SESSION_IDLE_SECONDS,
  SESSION_MAX_AGE_SECONDS,
  type AuthRealm,
} from "@/lib/auth/constants";
import type { SessionPayload } from "@/lib/auth/types";

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET debe estar definido y tener al menos 32 caracteres.",
      );
    }

    return new TextEncoder().encode(
      "dev-only-auth-secret-change-before-production!!",
    );
  }

  return new TextEncoder().encode(secret);
}

function buildExpiration(now: number, issuedAt: number): number {
  const sliding = now + SESSION_IDLE_SECONDS;
  const absolute = issuedAt + SESSION_MAX_AGE_SECONDS;
  return Math.min(sliding, absolute);
}

export function isSessionExpired(session: SessionPayload): boolean {
  const now = Math.floor(Date.now() / 1000);
  const lastActive = session.lastActive ?? session.iat;

  if (now > session.exp) return true;
  if (now - session.iat > SESSION_MAX_AGE_SECONDS) return true;
  if (now - lastActive > SESSION_IDLE_SECONDS) return true;

  return false;
}

export async function createSessionToken(input: {
  accountId: string;
  email: string;
  realm: AuthRealm;
  mustChangePassword?: boolean;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    email: input.email,
    realm: input.realm,
    mustChangePassword: Boolean(input.mustChangePassword),
    lastActive: now,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.accountId)
    .setIssuedAt(now)
    .setExpirationTime(buildExpiration(now, now))
    .sign(getAuthSecret());
}

export async function refreshSessionToken(
  session: SessionPayload,
  overrides?: { realm?: AuthRealm; sub?: string; mustChangePassword?: boolean },
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const realm = overrides?.realm ?? session.realm;
  const sub = overrides?.sub ?? session.sub;
  const mustChangePassword =
    overrides?.mustChangePassword ?? session.mustChangePassword;

  return new SignJWT({
    email: session.email,
    realm,
    mustChangePassword,
    lastActive: now,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt(session.iat)
    .setExpirationTime(buildExpiration(now, session.iat))
    .sign(getAuthSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret(), {
      algorithms: ["HS256"],
    });

    const realm = payload.realm;
    if (realm !== AUTH_REALM.admin && realm !== AUTH_REALM.executive) {
      return null;
    }

    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      return null;
    }

    const iat = payload.iat ?? 0;
    const lastActive =
      typeof payload.lastActive === "number" ? payload.lastActive : iat;

    const session: SessionPayload = {
      sub: payload.sub,
      email: payload.email,
      realm,
      mustChangePassword: payload.mustChangePassword === true,
      iat,
      exp: payload.exp ?? 0,
      lastActive,
    };

    if (isSessionExpired(session)) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}
