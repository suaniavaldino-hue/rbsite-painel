import "server-only";

import { Buffer } from "node:buffer";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  MAX_AUDIT_LOG_ENTRIES,
  SECURITY_STATE_VERSION,
} from "@/lib/security/constants";
import type {
  AuditLogEntry,
  EmailLoginChallengeRecord,
  LoginAttemptState,
  PasswordResetTokenRecord,
  SecurityState,
} from "@/lib/security/types";

let mutationLock = Promise.resolve();
const LEGACY_ADMIN_EMAIL = "admin@rbsite.com.br";
const DEFAULT_ADMIN_EMAIL = "contato@rbsite.com.br";
const DEFAULT_SECURITY_STORAGE_BUCKET = "rbsite-system";
const DEFAULT_SECURITY_STORAGE_OBJECT = "security/security-state.json";

function getSecurityStorageBucket() {
  return (
    process.env.AUTH_SECURITY_STORAGE_BUCKET?.trim() ||
    DEFAULT_SECURITY_STORAGE_BUCKET
  );
}

function getSecurityStorageObject() {
  return (
    process.env.AUTH_SECURITY_STORAGE_OBJECT?.trim() ||
    DEFAULT_SECURITY_STORAGE_OBJECT
  );
}

function getSupabaseSecurityClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return null;
  }

  return getSupabaseServerClient();
}

async function ensureSupabaseSecurityBucket() {
  const supabase = getSupabaseSecurityClient();

  if (!supabase) {
    return null;
  }

  const bucket = getSecurityStorageBucket();
  const { error: lookupError } = await supabase.storage.getBucket(bucket);

  if (!lookupError) {
    return supabase;
  }

  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: 1024 * 1024,
  });

  if (createError && !createError.message.toLowerCase().includes("already")) {
    throw new Error(
      `Falha ao preparar storage de seguranca no Supabase: ${createError.message}`,
    );
  }

  return supabase;
}

function resolveConfiguredSecurityDir() {
  const configuredDir = process.env.AUTH_SECURITY_DATA_DIR?.trim();

  if (!configuredDir) {
    return undefined;
  }

  if (path.isAbsolute(configuredDir)) {
    return configuredDir;
  }

  return path.resolve(/* turbopackIgnore: true */ process.cwd(), configuredDir);
}

function isServerlessReadonlyRuntime() {
  return (
    process.env.VERCEL === "1" ||
    Boolean(process.env.LAMBDA_TASK_ROOT) ||
    process.cwd().startsWith("/var/task")
  );
}

function getSecurityDataDir() {
  const configuredDir = resolveConfiguredSecurityDir();

  if (configuredDir) {
    return configuredDir;
  }

  if (isServerlessReadonlyRuntime()) {
    return path.join(tmpdir(), ".rbsite-secure");
  }

  return path.join(/* turbopackIgnore: true */ process.cwd(), ".rbsite-secure");
}

function getSecurityStatePath() {
  return path.join(getSecurityDataDir(), "security-state.json");
}

function createInitialState(): SecurityState {
  const now = new Date().toISOString();

  return {
    version: SECURITY_STATE_VERSION,
    admin: {
      id: "rbsite-admin",
      email: (process.env.AUTH_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL)
        .trim()
        .toLowerCase(),
      name: (process.env.AUTH_ADMIN_NAME ?? "Administrador RB Site").trim(),
      passwordHash: process.env.AUTH_ADMIN_PASSWORD_HASH?.trim() ?? "",
      role: "admin",
      sessionVersion: 1,
      passwordUpdatedAt: now,
      twoFactorEnabled:
        process.env.AUTH_ADMIN_2FA_ENABLED === "true" &&
        Boolean(process.env.AUTH_ADMIN_2FA_SECRET?.trim()),
      twoFactorSecret: process.env.AUTH_ADMIN_2FA_SECRET?.trim() || undefined,
      recoveryCodeHashes: [],
    },
    loginAttempts: [],
    passwordResetTokens: [],
    emailLoginChallenges: [],
    auditLogs: [],
  };
}

function syncAdminFromEnvironment(state: SecurityState) {
  const configuredEmail = (
    process.env.AUTH_ADMIN_EMAIL ??
    (state.admin.email === LEGACY_ADMIN_EMAIL
      ? DEFAULT_ADMIN_EMAIL
      : state.admin.email)
  )
    .trim()
    .toLowerCase();
  const configuredName = (
    process.env.AUTH_ADMIN_NAME ?? state.admin.name ?? "Administrador RB Site"
  ).trim();
  const configuredPasswordHash =
    state.admin.passwordHash?.trim() ||
    process.env.AUTH_ADMIN_PASSWORD_HASH?.trim() ||
    "";
  const configuredTwoFactorSecret =
    state.admin.twoFactorSecret?.trim() || process.env.AUTH_ADMIN_2FA_SECRET?.trim();
  const configuredTwoFactorEnabled =
    state.admin.twoFactorEnabled ||
    (process.env.AUTH_ADMIN_2FA_ENABLED === "true" &&
      Boolean(configuredTwoFactorSecret));

  return {
    ...state.admin,
    email: configuredEmail,
    name: configuredName,
    passwordHash: configuredPasswordHash,
    twoFactorEnabled: configuredTwoFactorEnabled,
    twoFactorSecret: configuredTwoFactorSecret || undefined,
  };
}

function normalizeState(state: SecurityState): SecurityState {
  return {
    ...state,
    version: SECURITY_STATE_VERSION,
    admin: {
      ...syncAdminFromEnvironment(state),
      role: "admin",
      recoveryCodeHashes: state.admin.recoveryCodeHashes ?? [],
    },
    loginAttempts: (state.loginAttempts ?? []).slice(-200),
    passwordResetTokens: state.passwordResetTokens ?? [],
    emailLoginChallenges: state.emailLoginChallenges ?? [],
    auditLogs: (state.auditLogs ?? []).slice(-MAX_AUDIT_LOG_ENTRIES),
  };
}

async function readSupabaseState() {
  const supabase = await ensureSupabaseSecurityBucket();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(getSecurityStorageBucket())
    .download(getSecurityStorageObject());

  if (error) {
    const initialState = createInitialState();
    await writeSupabaseState(initialState);
    return initialState;
  }

  const rawState = await data.text();
  return normalizeState(JSON.parse(rawState) as SecurityState);
}

async function writeSupabaseState(state: SecurityState) {
  const supabase = await ensureSupabaseSecurityBucket();

  if (!supabase) {
    return false;
  }

  const serialized = JSON.stringify(normalizeState(state), null, 2);
  const { error } = await supabase.storage
    .from(getSecurityStorageBucket())
    .upload(getSecurityStorageObject(), Buffer.from(serialized, "utf8"), {
      contentType: "application/json",
      upsert: true,
    });

  if (error) {
    throw new Error(
      `Falha ao persistir estado de seguranca no Supabase Storage: ${error.message}`,
    );
  }

  return true;
}

async function ensureSecurityStorage() {
  await mkdir(getSecurityDataDir(), { recursive: true });
}

async function writeLocalState(state: SecurityState) {
  await ensureSecurityStorage();

  const filePath = getSecurityStatePath();
  const tempPath = `${filePath}.${randomUUID()}.tmp`;
  const serialized = JSON.stringify(normalizeState(state), null, 2);

  await writeFile(tempPath, serialized, { encoding: "utf8" });
  await rename(tempPath, filePath);
}

async function writeState(state: SecurityState) {
  try {
    if (await writeSupabaseState(state)) {
      return;
    }
  } catch {
    // Keep authentication available if Supabase Storage is not ready yet.
  }

  await writeLocalState(state);
}

export async function readSecurityState() {
  try {
    const supabaseState = await readSupabaseState();

    if (supabaseState) {
      return supabaseState;
    }
  } catch {
    // If Supabase Storage is not ready yet, keep the app available with local dev fallback.
  }

  try {
    const rawState = await readFile(getSecurityStatePath(), "utf8");
    return normalizeState(JSON.parse(rawState) as SecurityState);
  } catch {
    const initialState = createInitialState();
    await writeState(initialState);
    return initialState;
  }
}

export async function mutateSecurityState<T>(
  mutator: (state: SecurityState) => Promise<T> | T,
) {
  const task = mutationLock.then(async () => {
    const state = await readSecurityState();
    const result = await mutator(state);
    await writeState(state);
    return result;
  });

  mutationLock = task.then(
    () => undefined,
    () => undefined,
  );

  return task;
}

export function pruneExpiredResetTokens(tokens: PasswordResetTokenRecord[]) {
  const now = Date.now();

  return tokens.filter((token) => {
    if (token.consumedAt) {
      return false;
    }

    return new Date(token.expiresAt).getTime() > now;
  });
}

export function pruneExpiredEmailLoginChallenges(
  challenges: EmailLoginChallengeRecord[],
) {
  const now = Date.now();

  return challenges.filter((challenge) => {
    if (challenge.consumedAt) {
      return false;
    }

    return new Date(challenge.expiresAt).getTime() > now;
  });
}

export function pruneExpiredLoginAttempts(attempts: LoginAttemptState[]) {
  const now = Date.now();

  return attempts.filter((attempt) => {
    if (attempt.lockUntil) {
      return new Date(attempt.lockUntil).getTime() > now;
    }

    return new Date(attempt.lastFailedAt).getTime() > now - 24 * 60 * 60 * 1000;
  });
}

export function appendAuditLog(
  state: SecurityState,
  entry: Omit<AuditLogEntry, "id" | "createdAt">,
) {
  state.auditLogs.push({
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry,
  });

  state.auditLogs = state.auditLogs.slice(-MAX_AUDIT_LOG_ENTRIES);
}
