import { getToken } from "next-auth/jwt";
import { type NextRequest, NextResponse } from "next/server";

import { getAuthSecret, shouldUseSecureAuthCookies } from "@/lib/auth/env";
import { DASHBOARD_NAVIGATION } from "@/lib/constants/navigation";
import { readHeader } from "@/lib/security/request";

const PROTECTED_PAGE_PREFIXES = DASHBOARD_NAVIGATION.map((item) => item.href);
const PROTECTED_API_PREFIXES = [
  "/api/contents",
  "/api/integrations",
  "/api/planner",
  "/api/publishing",
];

function attachPlatformHeaders(response: NextResponse) {
  response.headers.set("x-rbsite-app", "social-automation");
  response.headers.set("x-deployment-scope", "subdomain-ready");

  return response;
}

function matchesPath(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/recuperar-senha" ||
    pathname.startsWith("/recuperar-senha/") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.svg" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/planner/assets/") ||
    pathname.startsWith("/api/health")
  );
}

function shouldEnforceHttps(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  const forwardedProto = readHeader(request.headers, "x-forwarded-proto");

  return forwardedProto !== "https";
}

function redirectToHttps(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.protocol = "https:";
  return NextResponse.redirect(url, { status: 308 });
}

export async function proxy(request: NextRequest) {
  if (shouldEnforceHttps(request)) {
    return attachPlatformHeaders(redirectToHttps(request));
  }

  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return attachPlatformHeaders(NextResponse.next());
  }

  const isProtectedPage = matchesPath(pathname, PROTECTED_PAGE_PREFIXES);
  const isProtectedApi = matchesPath(pathname, PROTECTED_API_PREFIXES);

  if (!isProtectedPage && !isProtectedApi) {
    return attachPlatformHeaders(NextResponse.next());
  }

  const token = await getToken({
    req: request,
    secret: getAuthSecret(),
    secureCookie: shouldUseSecureAuthCookies(),
    cookieName: getAuthCookieName(),
  });

  if (token?.role === "admin" && token.sessionVersion) {
    return attachPlatformHeaders(NextResponse.next());
  }

  if (isProtectedApi) {
    return attachPlatformHeaders(
      NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
        },
        { status: 401 },
      ),
    );
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);

  return attachPlatformHeaders(NextResponse.redirect(loginUrl));
}

function getAuthCookieName() {
  const secure = shouldUseSecureAuthCookies();
  const prefix = secure ? "__Secure-" : "";

  return `${prefix}rbsite.session-token`;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)",
  ],
};
