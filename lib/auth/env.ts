import "server-only";

import { DEFAULT_SESSION_MAX_AGE } from "@/lib/security/constants";

function normalizeSecret(secret?: string) {
  const normalizedSecret = secret?.trim();
  return normalizedSecret ? normalizedSecret : undefined;
}

export function getAuthSecret() {
  const secret = normalizeSecret(
    process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  );

  if (!secret) {
    const authUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
    const localRuntime =
      !authUrl ||
      authUrl.startsWith("http://localhost") ||
      authUrl.startsWith("http://127.0.0.1");

    if (localRuntime) {
      return "rbsite-local-build-secret-change-me";
    }

    throw new Error("AUTH_SECRET or NEXTAUTH_SECRET must be configured.");
  }

  if (!process.env.NEXTAUTH_SECRET) {
    process.env.NEXTAUTH_SECRET = secret;
  }

  return secret;
}

export function getSessionMaxAge() {
  const rawValue = Number(process.env.AUTH_SESSION_MAX_AGE ?? DEFAULT_SESSION_MAX_AGE);

  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return DEFAULT_SESSION_MAX_AGE;
  }

  return rawValue;
}

export function getAuthCookieDomain() {
  const domain = process.env.AUTH_COOKIE_DOMAIN?.trim();
  return domain ? domain : undefined;
}

export function shouldUseSecureAuthCookies() {
  const appUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

  return process.env.NODE_ENV === "production" || appUrl.startsWith("https://");
}

export function assertHttpsInProduction() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const authUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (
    authUrl &&
    !authUrl.startsWith("https://") &&
    !authUrl.startsWith("http://localhost") &&
    !authUrl.startsWith("http://127.0.0.1")
  ) {
    throw new Error("HTTPS is mandatory in production. Configure NEXTAUTH_URL with https://.");
  }
}

export function getAuthCookies() {
  const domain = getAuthCookieDomain();
  const secure = shouldUseSecureAuthCookies();
  const prefix = secure ? "__Secure-" : "";
  const sharedOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure,
    ...(domain ? { domain } : {}),
  };

  return {
    sessionToken: {
      name: `${prefix}rbsite.session-token`,
      options: sharedOptions,
    },
    callbackUrl: {
      name: `${prefix}rbsite.callback-url`,
      options: {
        sameSite: "lax" as const,
        path: "/",
        secure,
        ...(domain ? { domain } : {}),
      },
    },
    csrfToken: {
      name: `${prefix}rbsite.csrf-token`,
      options: sharedOptions,
    },
  };
}
