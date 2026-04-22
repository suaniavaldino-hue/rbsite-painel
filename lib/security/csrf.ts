import "server-only";

import { randomUUID } from "node:crypto";

import { DEFAULT_CSRF_TOKEN_TTL_SECONDS } from "@/lib/security/constants";
import { signValue } from "@/lib/security/crypto";

type CsrfPayload = {
  purpose: string;
  nonce: string;
  exp: number;
};

function encodePayload(payload: CsrfPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(value: string) {
  const rawValue = Buffer.from(value, "base64url").toString("utf8");
  return JSON.parse(rawValue) as CsrfPayload;
}

export function createCsrfToken(
  purpose: string,
  ttlSeconds = DEFAULT_CSRF_TOKEN_TTL_SECONDS,
) {
  const payload: CsrfPayload = {
    purpose,
    nonce: randomUUID(),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encodedPayload = encodePayload(payload);
  const signature = signValue(`${purpose}.${encodedPayload}`);

  return `${encodedPayload}.${signature}`;
}

export function verifyCsrfToken(token: string, purpose: string) {
  const [encodedPayload, providedSignature] = token.split(".");

  if (!encodedPayload || !providedSignature) {
    return false;
  }

  const expectedSignature = signValue(`${purpose}.${encodedPayload}`);

  if (providedSignature !== expectedSignature) {
    return false;
  }

  try {
    const payload = decodePayload(encodedPayload);

    if (payload.purpose !== purpose) {
      return false;
    }

    return payload.exp >= Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
