import "server-only";

import { createHmac, randomBytes } from "node:crypto";

import { getAuthSecret } from "@/lib/auth/env";

export function createRandomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function signValue(value: string) {
  return createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

export function hashOpaqueToken(token: string) {
  return signValue(`opaque:${token}`);
}
