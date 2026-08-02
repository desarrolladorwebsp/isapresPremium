export const AUTH_REALM = {
  admin: "admin",
  executive: "executive",
} as const;

export type AuthRealm = (typeof AUTH_REALM)[keyof typeof AUTH_REALM];

/** Cookie unificada de sesión staff (admin o ejecutivo). */
export const STAFF_SESSION_COOKIE = "ci_staff_session";

/** Cookies legacy — se leen durante la transición y se eliminan al emitir sesión nueva. */
export const SESSION_COOKIE = {
  staff: STAFF_SESSION_COOKIE,
  admin: "ci_admin_session",
  executive: "ci_executive_session",
} as const;

/** Duración máxima absoluta de la sesión desde el primer login (24 h). */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

/** Tiempo máximo de inactividad antes de exigir login nuevamente (8 h). */
export const SESSION_IDLE_SECONDS = 60 * 60 * 8;

export const LOGIN_LOCKOUT = {
  maxAttempts: 5,
  lockMinutes: 15,
} as const;

export const PASSWORD_MIN_LENGTH = 8;

/**
 * TTL del enlace de recuperación de contraseña (staff).
 * Corto a propósito: reduce la ventana de abuso si el correo se filtra.
 */
export const PASSWORD_RESET_TTL_MINUTES = 45;

/** Rate limit de solicitudes de reset (espíritu LOGIN_LOCKOUT). */
export const PASSWORD_RESET_RATE_LIMIT = {
  maxAttempts: 5,
  windowMinutes: 15,
} as const;

/** Login único para todo el staff. */
export const STAFF_LOGIN_PATH = "/cotizador/acceso";

export const PASSWORD_RESET_REQUEST_PATH =
  "/cotizador/acceso/recuperar-contrasena";
export const PASSWORD_RESET_PATH =
  "/cotizador/acceso/restablecer-contrasena";

export const ADMIN_LOGIN_PATH = STAFF_LOGIN_PATH;
export const EXECUTIVE_LOGIN_PATH = STAFF_LOGIN_PATH;

export const ADMIN_ACTIVATE_ACCOUNT_PATH = "/cotizador/admin/activar-cuenta";
export const EXECUTIVE_ACTIVATE_ACCOUNT_PATH =
  "/cotizador/ejecutivos/activar-cuenta";
/** Ruta única del panel staff (ejecutivos y administradores). */
export const EXECUTIVE_HOME_PATH = "/cotizador/ejecutivos";
export const ADMIN_HOME_PATH = EXECUTIVE_HOME_PATH;
export const ADMIN_USERS_PATH = "/cotizador/ejecutivos?section=usuarios";
export const EXECUTIVE_ONBOARDING_PATH = "/cotizador/ejecutivos/completar-perfil";
export const EXECUTIVE_CHANGE_PASSWORD_PATH =
  "/cotizador/ejecutivos/cambiar-contrasena";
export const ADMIN_CHANGE_PASSWORD_PATH = EXECUTIVE_CHANGE_PASSWORD_PATH;

export const STAFF_DEFAULT_HOME = EXECUTIVE_HOME_PATH;

export function getChangePasswordPath(_realm?: AuthRealm): string {
  return EXECUTIVE_CHANGE_PASSWORD_PATH;
}

export function staffCanAccessAdminRoutes(realm: AuthRealm): boolean {
  return realm === AUTH_REALM.admin;
}

export function staffCanAccessExecutiveRoutes(realm: AuthRealm): boolean {
  return realm === AUTH_REALM.admin || realm === AUTH_REALM.executive;
}
