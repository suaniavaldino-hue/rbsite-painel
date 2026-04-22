import "server-only";

import {
  DEFAULT_LOGIN_LOCK_DURATION_MINUTES,
  DEFAULT_LOGIN_MAX_FAILURES,
  DEFAULT_LOGIN_WINDOW_MINUTES,
} from "@/lib/security/constants";
import { logAuditEvent } from "@/lib/security/audit";
import {
  mutateSecurityState,
  pruneExpiredLoginAttempts,
} from "@/lib/security/store";

function getLoginWindowMs() {
  return (
    Number(process.env.AUTH_LOGIN_WINDOW_MINUTES ?? DEFAULT_LOGIN_WINDOW_MINUTES) *
    60 *
    1000
  );
}

function getLockDurationMs() {
  return (
    Number(
      process.env.AUTH_LOGIN_LOCK_DURATION_MINUTES ??
        DEFAULT_LOGIN_LOCK_DURATION_MINUTES,
    ) *
    60 *
    1000
  );
}

function getMaxFailures() {
  return Number(
    process.env.AUTH_LOGIN_MAX_FAILURES ?? DEFAULT_LOGIN_MAX_FAILURES,
  );
}

function buildAttemptKey(email: string, ipAddress: string) {
  return `${email.toLowerCase()}|${ipAddress}`;
}

export async function assertLoginAllowed(email: string, ipAddress: string) {
  const key = buildAttemptKey(email, ipAddress);
  const now = Date.now();

  const lockUntil = await mutateSecurityState((state) => {
    state.loginAttempts = pruneExpiredLoginAttempts(state.loginAttempts);
    const existingAttempt = state.loginAttempts.find((attempt) => attempt.key === key);

    if (!existingAttempt?.lockUntil) {
      return null;
    }

    return new Date(existingAttempt.lockUntil).getTime();
  });

  if (lockUntil && lockUntil > now) {
    await logAuditEvent({
      event: "auth.login_blocked",
      level: "warn",
      actor: { email, ipAddress },
      message: "Login blocked due to temporary rate limiting.",
      metadata: {
        lockUntil: new Date(lockUntil).toISOString(),
      },
    });

    throw new Error("Conta temporariamente bloqueada. Tente novamente mais tarde.");
  }
}

export async function recordFailedLoginAttempt(email: string, ipAddress: string) {
  const now = new Date();
  const nowIso = now.toISOString();
  const key = buildAttemptKey(email, ipAddress);
  const windowMs = getLoginWindowMs();
  const lockDurationMs = getLockDurationMs();
  const maxFailures = getMaxFailures();

  await mutateSecurityState((state) => {
    state.loginAttempts = pruneExpiredLoginAttempts(state.loginAttempts);
    const existingAttempt = state.loginAttempts.find((attempt) => attempt.key === key);

    if (!existingAttempt) {
      state.loginAttempts.push({
        key,
        email,
        ipAddress,
        failures: 1,
        firstFailedAt: nowIso,
        lastFailedAt: nowIso,
      });
      return;
    }

    const firstFailedAtMs = new Date(existingAttempt.firstFailedAt).getTime();
    const withinWindow = now.getTime() - firstFailedAtMs <= windowMs;

    if (!withinWindow) {
      existingAttempt.failures = 1;
      existingAttempt.firstFailedAt = nowIso;
      existingAttempt.lastFailedAt = nowIso;
      existingAttempt.lockUntil = undefined;
      return;
    }

    existingAttempt.failures += 1;
    existingAttempt.lastFailedAt = nowIso;

    if (existingAttempt.failures >= maxFailures) {
      existingAttempt.lockUntil = new Date(
        now.getTime() + lockDurationMs,
      ).toISOString();
    }
  });
}

export async function clearLoginAttempts(email: string, ipAddress: string) {
  const key = buildAttemptKey(email, ipAddress);

  await mutateSecurityState((state) => {
    state.loginAttempts = state.loginAttempts.filter((attempt) => attempt.key !== key);
  });
}
