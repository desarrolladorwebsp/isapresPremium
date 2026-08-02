import type { ExecutiveKind, SubscriptionStatus } from "@prisma/client";
import type { AuthRealm } from "@/lib/auth/constants";
import type { StaffSection } from "@/lib/staff/staff-sections";

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

export interface AdminSessionUser {
  id: string;
  email: string;
  fullName: string;
  mustChangePassword: boolean;
}

export interface ExecutiveSessionUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  rut: string | null;
  executiveKind: ExecutiveKind;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt: string | null;
  subscriptionActive: boolean;
  mustChangePassword: boolean;
  onboardingCompleted: boolean;
  assignmentsSuspended: boolean;
}

export interface LoginResponseUser {
  mustChangePassword: boolean;
  realm: AuthRealm;
}

export interface StaffMeResponse {
  realm: AuthRealm;
  /** Null para administradores. */
  executiveKind: ExecutiveKind | null;
  user: AdminSessionUser | ExecutiveSessionUser;
  capabilities: {
    adminPanel: boolean;
    executivePanel: boolean;
    sections: StaffSection[];
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}


export interface LoginCredentials {
  email: string;
  password: string;
}
