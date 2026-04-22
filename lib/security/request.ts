import "server-only";

import type { headers as nextHeaders } from "next/headers";

type ReadableHeaders =
  | Headers
  | Awaited<ReturnType<typeof nextHeaders>>
  | Record<string, string | string[] | undefined>
  | undefined;

function normalizeHeaderValue(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value ?? undefined;
}

export function readHeader(headersSource: ReadableHeaders, name: string) {
  if (!headersSource) {
    return undefined;
  }

  if (headersSource instanceof Headers) {
    return headersSource.get(name) ?? undefined;
  }

  if (typeof headersSource === "object" && headersSource !== null) {
    const candidate = headersSource as { get?: (headerName: string) => string | null };

    if (typeof candidate.get === "function") {
      return candidate.get(name) ?? undefined;
    }
  }

  return normalizeHeaderValue(
    (headersSource as Record<string, string | string[] | undefined>)[
      name.toLowerCase()
    ],
  );
}

export function getClientIpAddress(headersSource: ReadableHeaders) {
  const forwardedFor = readHeader(headersSource, "x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return readHeader(headersSource, "x-real-ip") ?? "unknown";
}

export function getUserAgent(headersSource: ReadableHeaders) {
  return readHeader(headersSource, "user-agent") ?? "unknown";
}

export function getTrustedOrigin(headersSource: ReadableHeaders) {
  const origin = readHeader(headersSource, "origin");

  if (origin) {
    return origin;
  }

  const referer = readHeader(headersSource, "referer");

  if (!referer) {
    return undefined;
  }

  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}
