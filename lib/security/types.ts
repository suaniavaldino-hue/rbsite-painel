export type AuditActor = {
  id?: string;
  email?: string;
  role?: string;
  ipAddress?: string;
  userAgent?: string;
};

export type AuditLogEntry = {
  id: string;
  event: string;
  level: "info" | "warn" | "error";
  createdAt: string;
  actor?: AuditActor;
  target?: string;
  message: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type LoginAttemptState = {
  key: string;
  email: string;
  ipAddress: string;
  failures: number;
  firstFailedAt: string;
  lastFailedAt: string;
  lockUntil?: string;
};

export type PasswordResetTokenRecord = {
  id: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  consumedAt?: string;
  requestedIpAddress?: string;
};

export type EmailLoginChallengeRecord = {
  id: string;
  email: string;
  codeHash: string;
  createdAt: string;
  expiresAt: string;
  consumedAt?: string;
  attempts: number;
  requestedIpAddress?: string;
  userAgent?: string;
};

export type PendingTwoFactorSetup = {
  secret: string;
  createdAt: string;
  expiresAt: string;
};

export type SecurityAdminState = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: "admin";
  sessionVersion: number;
  passwordUpdatedAt?: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  recoveryCodeHashes: string[];
  pendingTwoFactorSetup?: PendingTwoFactorSetup;
};

export type SecurityState = {
  version: number;
  admin: SecurityAdminState;
  loginAttempts: LoginAttemptState[];
  passwordResetTokens: PasswordResetTokenRecord[];
  emailLoginChallenges: EmailLoginChallengeRecord[];
  auditLogs: AuditLogEntry[];
};
