import "server-only";

import { appendAuditLog, mutateSecurityState } from "@/lib/security/store";
import type { AuditActor, AuditLogEntry } from "@/lib/security/types";

function normalizeMetadata(
  metadata?: Record<string, unknown>,
): AuditLogEntry["metadata"] {
  if (!metadata) {
    return undefined;
  }

  const normalizedEntries = Object.entries(metadata).map(([key, value]) => {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      return [key, value] as const;
    }

    return [key, JSON.stringify(value)] as const;
  });

  return Object.fromEntries(normalizedEntries);
}

export async function logAuditEvent(input: {
  event: string;
  level?: "info" | "warn" | "error";
  actor?: AuditActor;
  target?: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  await mutateSecurityState((state) => {
    appendAuditLog(state, {
      event: input.event,
      level: input.level ?? "info",
      actor: input.actor,
      target: input.target,
      message: input.message,
      metadata: normalizeMetadata(input.metadata),
    });
  });
}

export async function getRecentAuditLogs(limit = 10) {
  const { readSecurityState } = await import("@/lib/security/store");
  const state = await readSecurityState();

  return state.auditLogs.slice(-limit).reverse();
}
