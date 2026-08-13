import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_ACTIVATE_ACCOUNT_PATH,
  EXECUTIVE_ACTIVATE_ACCOUNT_PATH,
  EXECUTIVE_CHANGE_PASSWORD_PATH,
  EXECUTIVE_HOME_PATH,
  EXECUTIVE_ONBOARDING_PATH,
  SESSION_COOKIE,
  STAFF_LOGIN_PATH,
  STAFF_SESSION_COOKIE,
  getChangePasswordPath,
  staffCanAccessExecutiveRoutes,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/constants";
import {
  mapLegacyAdminPath,
  staffSectionHref,
} from "@/lib/staff/staff-sections";
import { refreshSessionToken, verifySessionToken } from "@/lib/auth/jwt";
import type { SessionPayload } from "@/lib/auth/session-payload";
import {
  AGENT_QUERY_PARAM,
  DEFAULT_PARTNER_ENTITY_SLUG,
  PARTNER_ENTITY_COOKIE,
  PARTNER_ENTITY_COOKIE_MAX_AGE,
  PARTNER_ENTITY_QUERY_PARAM,
  RESERVED_ROOT_SEGMENTS,
} from "@/lib/partner-entity/constants";
import { isValidAgentKeySegment } from "@/lib/platform/routing";
import { forwardRequest } from "@/lib/embed/middleware-embed";
import { isLegacySeoHostname, normalizeHostname } from "@/lib/seo/request-host";

const ADMIN_PREFIX = "/cotizador/admin";
const EXECUTIVE_PREFIX = "/cotizador/ejecutivos";
const ADMIN_LOGIN = `${ADMIN_PREFIX}/login`;
const EXECUTIVE_LOGIN = `${EXECUTIVE_PREFIX}/login`;
const LEGACY_DEFAULT_PARTNER_SLUG = "cotizaloantes";

const PARTNER_SLUG_PATTERN = /^\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/;
const EMBED_PARTNER_PATTERN = /^\/embed\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/;

async function readStaffSessionFromRequest(
  request: NextRequest,
): Promise<SessionPayload | null> {
  const tokens = [
    request.cookies.get(STAFF_SESSION_COOKIE)?.value,
    request.cookies.get(SESSION_COOKIE.admin)?.value,
    request.cookies.get(SESSION_COOKIE.executive)?.value,
  ].filter(Boolean) as string[];

  const sessions = (
    await Promise.all(tokens.map((token) => verifySessionToken(token)))
  ).filter((session): session is SessionPayload => session !== null);

  if (sessions.length === 0) return null;

  const adminSession = sessions.find((session) => session.realm === "admin");
  return adminSession ?? sessions[0];
}

async function withSessionRefresh(
  request: NextRequest,
  session: SessionPayload,
): Promise<NextResponse> {
  const response = forwardRequest(request);
  const refreshedToken = await refreshSessionToken(session);

  response.cookies.set(STAFF_SESSION_COOKIE, refreshedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  response.cookies.set(SESSION_COOKIE.admin, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(SESSION_COOKIE.executive, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}

function setPartnerEntityCookie(
  response: NextResponse,
  slug: string,
): NextResponse {
  response.cookies.set(PARTNER_ENTITY_COOKIE, slug.trim().toLowerCase(), {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: PARTNER_ENTITY_COOKIE_MAX_AGE,
  });

  return response;
}

function applyPartnerCookieFromPath(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const match = request.nextUrl.pathname.match(PARTNER_SLUG_PATTERN);
  if (!match) return response;

  const slug = match[1];
  if (RESERVED_ROOT_SEGMENTS.has(slug)) return response;

  return setPartnerEntityCookie(response, slug);
}

function applyPartnerCookieFromEmbedPath(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const match = request.nextUrl.pathname.match(EMBED_PARTNER_PATTERN);
  if (!match) return response;

  const slug = match[1];
  if (RESERVED_ROOT_SEGMENTS.has(slug)) return response;

  return setPartnerEntityCookie(response, slug);
}

function readAgentKeyFromSearchParams(request: NextRequest): string | null {
  const agent =
    request.nextUrl.searchParams.get(AGENT_QUERY_PARAM)?.trim().toLowerCase() ??
    request.nextUrl.searchParams
      .get(PARTNER_ENTITY_QUERY_PARAM)
      ?.trim()
      .toLowerCase();

  if (!agent || !isValidAgentKeySegment(agent)) {
    return null;
  }

  return agent;
}

function defaultPartnerSlugForRequest(request: NextRequest): string {
  const host = normalizeHostname(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
  );
  return isLegacySeoHostname(host)
    ? LEGACY_DEFAULT_PARTNER_SLUG
    : DEFAULT_PARTNER_ENTITY_SLUG;
}

function redirectToCotizadorWithAgent(
  request: NextRequest,
  agent: string,
): NextResponse {
  const redirectUrl = new URL("/cotizador", request.url);
  redirectUrl.search = request.nextUrl.search;
  redirectUrl.searchParams.set(AGENT_QUERY_PARAM, agent);
  redirectUrl.searchParams.delete(PARTNER_ENTITY_QUERY_PARAM);
  return setPartnerEntityCookie(
    NextResponse.redirect(redirectUrl, 308),
    agent,
  );
}

function redirectRootWithAgentToCotizador(
  request: NextRequest,
  agent: string,
): NextResponse {
  return redirectToCotizadorWithAgent(request, agent);
}

function redirectToLogin(request: NextRequest, nextPath: string): NextResponse {
  const loginUrl = new URL(STAFF_LOGIN_PATH, request.url);
  loginUrl.searchParams.set("next", nextPath);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    const agent = readAgentKeyFromSearchParams(request);
    if (agent) {
      return redirectRootWithAgentToCotizador(request, agent);
    }
    return forwardRequest(request);
  }

  if (pathname === "/cotizador") {
    const agent = readAgentKeyFromSearchParams(request);
    const response = forwardRequest(request);

    if (agent) {
      return setPartnerEntityCookie(response, agent);
    }

    return setPartnerEntityCookie(
      response,
      defaultPartnerSlugForRequest(request),
    );
  }

  if (pathname === STAFF_LOGIN_PATH) {
    const session = await readStaffSessionFromRequest(request);

    if (session) {
      const target = session.mustChangePassword
        ? getChangePasswordPath(session.realm)
        : request.nextUrl.searchParams.get("next") ?? EXECUTIVE_PREFIX;

      return NextResponse.redirect(new URL(target, request.url));
    }

    return forwardRequest(request);
  }

  if (pathname.startsWith(ADMIN_PREFIX)) {
    const isLoginPage = pathname === ADMIN_LOGIN;
    const isActivatePage = pathname === ADMIN_ACTIVATE_ACCOUNT_PATH;

    if (isActivatePage) {
      return forwardRequest(request);
    }

    if (isLoginPage) {
      return NextResponse.redirect(
        new URL(STAFF_LOGIN_PATH + request.nextUrl.search, request.url),
      );
    }

    const legacySection = mapLegacyAdminPath(pathname);
    const redirectUrl = new URL(
      legacySection ? staffSectionHref(legacySection) : EXECUTIVE_HOME_PATH,
      request.url,
    );
    redirectUrl.search = request.nextUrl.search;
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname.startsWith(EXECUTIVE_PREFIX)) {
    const session = await readStaffSessionFromRequest(request);
    const isLoginPage = pathname === EXECUTIVE_LOGIN;
    const isActivatePage = pathname === EXECUTIVE_ACTIVATE_ACCOUNT_PATH;
    const isChangePasswordPage = pathname === EXECUTIVE_CHANGE_PASSWORD_PATH;
    const isOnboardingPage = pathname === EXECUTIVE_ONBOARDING_PATH;

    if (isActivatePage) {
      return forwardRequest(request);
    }

    if (isLoginPage) {
      return NextResponse.redirect(
        new URL(STAFF_LOGIN_PATH + request.nextUrl.search, request.url),
      );
    }

    if (isOnboardingPage) {
      if (!session || !staffCanAccessExecutiveRoutes(session.realm)) {
        return redirectToLogin(request, EXECUTIVE_ONBOARDING_PATH);
      }
      return withSessionRefresh(request, session);
    }

    if (isChangePasswordPage) {
      if (!session || !staffCanAccessExecutiveRoutes(session.realm)) {
        return redirectToLogin(request, EXECUTIVE_CHANGE_PASSWORD_PATH);
      }

      return withSessionRefresh(request, session);
    }

    if (!session || !staffCanAccessExecutiveRoutes(session.realm)) {
      return redirectToLogin(request, pathname);
    }

    if (session.mustChangePassword) {
      return NextResponse.redirect(
        new URL(getChangePasswordPath(session.realm), request.url),
      );
    }

    return withSessionRefresh(request, session);
  }

  const response = forwardRequest(request);
  const withEmbedCookie = applyPartnerCookieFromEmbedPath(request, response);
  return applyPartnerCookieFromPath(request, withEmbedCookie);
}

export const config = {
  matcher: [
    "/",
    "/cotizador",
    "/embed/:path*",
    "/:partnerSlug",
    "/cotizador/acceso",
    "/cotizador/admin",
    "/cotizador/admin/:path*",
    "/cotizador/ejecutivos",
    "/cotizador/ejecutivos/:path*",
  ],
};
