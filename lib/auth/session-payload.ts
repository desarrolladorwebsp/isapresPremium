import type { AuthRealm } from "@/lib/auth/constants";

/** Payload del JWT staff. Sin Prisma: el middleware Edge no puede importarlo. */
export interface SessionPayload {
  sub: string;
  email: string;
  realm: AuthRealm;
  mustChangePassword: boolean;
  iat: number;
  exp: number;
  /** Unix timestamp de la última actividad (sliding session). */
  lastActive: number;
}
