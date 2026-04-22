import "server-only";

import { headers } from "next/headers";

import { env } from "@/lib/utils/env";
import { getTrustedOrigin, readHeader } from "@/lib/security/request";

type HeaderSource = Parameters<typeof readHeader>[0];

export class TrustedOriginError extends Error {
  constructor(message = "Cross-origin request rejected.") {
    super(message);
    this.name = "TrustedOriginError";
  }
}

function normalizeHost(value?: string | null) {
  const normalized = value?.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  return normalized ? normalized : undefined;
}

function addAllowedOrigin(origins: Set<string>, value?: string | null) {
  const normalized = value?.trim();

  if (!normalized) {
    return;
  }

  try {
    const candidate =
      normalized.startsWith("http://") || normalized.startsWith("https://")
        ? normalized
        : `https://${normalizeHost(normalized)}`;

    origins.add(new URL(candidate).origin);
  } catch {}
}

function addOriginsFromList(origins: Set<string>, value?: string) {
  if (!value) {
    return;
  }

  for (const item of value.split(",")) {
    addAllowedOrigin(origins, item);
  }
}

function addCurrentRequestOrigin(origins: Set<string>, requestHeaders?: HeaderSource) {
  const forwardedHost = readHeader(requestHeaders, "x-forwarded-host");
  const host = normalizeHost(forwardedHost ?? readHeader(requestHeaders, "host"));

  if (!host) {
    return;
  }

  const forwardedProto = readHeader(requestHeaders, "x-forwarded-proto");
  const protocol =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : host.includes("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https";

  addAllowedOrigin(origins, `${protocol}://${host}`);
}

function getAllowedOrigins(requestHeaders?: HeaderSource) {
  const origins = new Set<string>();

  addAllowedOrigin(origins, env.appUrl);
  addAllowedOrigin(origins, process.env.NEXTAUTH_URL);
  addAllowedOrigin(origins, env.canonicalHost);
  addAllowedOrigin(origins, process.env.VERCEL_PROJECT_PRODUCTION_URL);
  addAllowedOrigin(origins, process.env.VERCEL_BRANCH_URL);
  addAllowedOrigin(origins, process.env.VERCEL_URL);
  addOriginsFromList(origins, process.env.TRUSTED_ORIGINS);
  addCurrentRequestOrigin(origins, requestHeaders);

  return origins;
}

export async function assertSameOriginRequest() {
  const requestHeaders = await headers();
  const trustedOrigin = getTrustedOrigin(requestHeaders);

  if (!trustedOrigin) {
    throw new TrustedOriginError("Missing trusted origin.");
  }

  const allowedOrigins = getAllowedOrigins(requestHeaders);

  if (!allowedOrigins.has(trustedOrigin)) {
    throw new TrustedOriginError();
  }
}

export function assertTrustedRequestOrigin(requestHeaders: Headers) {
  const trustedOrigin = getTrustedOrigin(requestHeaders);

  if (!trustedOrigin) {
    throw new TrustedOriginError("Missing trusted origin.");
  }

  const allowedOrigins = getAllowedOrigins(requestHeaders);

  if (!allowedOrigins.has(trustedOrigin)) {
    throw new TrustedOriginError();
  }
}
