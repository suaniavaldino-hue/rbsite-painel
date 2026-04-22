import "server-only";

import { randomUUID } from "node:crypto";

import { DEFAULT_RESET_TOKEN_TTL_MINUTES } from "@/lib/security/constants";
import { hashOpaqueToken } from "@/lib/security/crypto";
import {
  mutateSecurityState,
  pruneExpiredResetTokens,
  readSecurityState,
} from "@/lib/security/store";
import { sanitizeEmail } from "@/lib/security/sanitize";

function getResetTtlMs() {
  return (
    Number(process.env.AUTH_RESET_TOKEN_TTL_MINUTES ?? DEFAULT_RESET_TOKEN_TTL_MINUTES) *
    60 *
    1000
  );
}

export async function createPasswordResetToken(email: string, ipAddress?: string) {
  const normalizedEmail = sanitizeEmail(email);
  const rawToken = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  const tokenHash = hashOpaqueToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + getResetTtlMs()).toISOString();

  const created = await mutateSecurityState((state) => {
    state.passwordResetTokens = pruneExpiredResetTokens(state.passwordResetTokens);

    if (state.admin.email !== normalizedEmail) {
      return null;
    }

    state.passwordResetTokens.push({
      id: randomUUID(),
      tokenHash,
      createdAt: now.toISOString(),
      expiresAt,
      requestedIpAddress: ipAddress,
    });

    return {
      token: rawToken,
      expiresAt,
      email: state.admin.email,
    };
  });

  return created;
}

export async function validatePasswordResetToken(token: string) {
  const state = await readSecurityState();
  const tokenHash = hashOpaqueToken(token);
  const now = Date.now();

  return state.passwordResetTokens.some(
    (record) =>
      record.tokenHash === tokenHash &&
      !record.consumedAt &&
      new Date(record.expiresAt).getTime() > now,
  );
}

export async function consumePasswordResetToken(token: string) {
  const tokenHash = hashOpaqueToken(token);
  const now = new Date();

  return mutateSecurityState((state) => {
    state.passwordResetTokens = pruneExpiredResetTokens(state.passwordResetTokens);
    const record = state.passwordResetTokens.find(
      (item) => item.tokenHash === tokenHash && !item.consumedAt,
    );

    if (!record) {
      return false;
    }

    if (new Date(record.expiresAt).getTime() <= now.getTime()) {
      return false;
    }

    record.consumedAt = now.toISOString();
    return true;
  });
}
