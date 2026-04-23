import { redirect } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import type { Session } from "next-auth";
import { getToken, type JWT } from "next-auth/jwt";

import { auth } from "@/auth";
import {
  getAuthCookies,
  getAuthSecret,
  getSessionMaxAge,
  shouldUseSecureAuthCookies,
} from "@/lib/auth/env";
import { isTokenSessionValid } from "@/lib/security/session-security";

type AdminSessionRequest = Request | NextRequest;
type NextAuthTokenRequest = Parameters<typeof getToken>[0]["req"];

function readTokenString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readTokenNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

async function validateAdminSessionPayload(payload: {
  sub?: string | null;
  email?: string | null;
  role?: string | null;
  sessionVersion?: number;
  twoFactorPassed?: boolean;
}) {
  return isTokenSessionValid({
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
    sessionVersion: payload.sessionVersion,
    twoFactorPassed: payload.twoFactorPassed,
  });
}

async function isValidNextAuthAdminSession(session: Session | null) {
  if (!session?.user || session.user.role !== "admin") {
    return false;
  }

  return validateAdminSessionPayload({
    sub: session.user.id,
    email: session.user.email,
    role: session.user.role,
    sessionVersion: session.user.sessionVersion,
    twoFactorPassed: session.user.twoFactorPassed,
  });
}

function buildSessionFromToken(token: JWT): Session | null {
  const id = readTokenString(token.sub);
  const email = readTokenString(token.email);
  const role = token.role === "admin" ? "admin" : undefined;

  if (!id || !email || role !== "admin") {
    return null;
  }

  return {
    user: {
      id,
      name: readTokenString(token.name),
      email,
      role,
      sessionVersion: readTokenNumber(token.sessionVersion),
      twoFactorPassed: token.twoFactorPassed === true,
      authenticationMethod: readTokenString(token.authenticationMethod) ?? undefined,
    },
    expires: new Date(Date.now() + getSessionMaxAge() * 1000).toISOString(),
  };
}

async function getAdminSessionFromRequest(request: AdminSessionRequest) {
  const token = await getToken({
    req: request as NextAuthTokenRequest,
    secret: getAuthSecret(),
    secureCookie: shouldUseSecureAuthCookies(),
    cookieName: getAuthCookies().sessionToken.name,
  });

  if (!token) {
    return null;
  }

  const session = buildSessionFromToken(token);

  if (!(await isValidNextAuthAdminSession(session))) {
    return null;
  }

  return session;
}

export async function getAdminSession(request?: AdminSessionRequest) {
  const session = await auth();

  if (await isValidNextAuthAdminSession(session)) {
    return session;
  }

  if (request) {
    return getAdminSessionFromRequest(request);
  }

  return null;
}

export async function requireAdminPageSession(callbackUrl: string) {
  const session = await getAdminSession();

  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return session;
}

export function unauthorizedApiResponse(message = "Authentication required.") {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status: 401 },
  );
}
