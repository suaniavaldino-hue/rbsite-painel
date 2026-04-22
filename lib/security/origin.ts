import "server-only";

import { headers } from "next/headers";

import { env } from "@/lib/utils/env";
import { getTrustedOrigin } from "@/lib/security/request";

export class TrustedOriginError extends Error {
  constructor(message = "Cross-origin request rejected.") {
    super(message);
    this.name = "TrustedOriginError";
  }
}

function getAllowedOrigins() {
  const origins = new Set<string>();

  try {
    origins.add(new URL(env.appUrl).origin);
  } catch {}

  try {
    const authUrl = process.env.NEXTAUTH_URL ?? env.appUrl;
    origins.add(new URL(authUrl).origin);
  } catch {}

  try {
    origins.add(new URL(`https://${env.canonicalHost}`).origin);
  } catch {}

  return origins;
}

export async function assertSameOriginRequest() {
  const requestHeaders = await headers();
  const trustedOrigin = getTrustedOrigin(requestHeaders);

  if (!trustedOrigin) {
    throw new TrustedOriginError("Missing trusted origin.");
  }

  const allowedOrigins = getAllowedOrigins();

  if (!allowedOrigins.has(trustedOrigin)) {
    throw new TrustedOriginError();
  }
}

export function assertTrustedRequestOrigin(requestHeaders: Headers) {
  const trustedOrigin = getTrustedOrigin(requestHeaders);

  if (!trustedOrigin) {
    throw new TrustedOriginError("Missing trusted origin.");
  }

  const allowedOrigins = getAllowedOrigins();

  if (!allowedOrigins.has(trustedOrigin)) {
    throw new TrustedOriginError();
  }
}
