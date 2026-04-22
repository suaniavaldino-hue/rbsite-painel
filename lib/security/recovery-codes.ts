import "server-only";

import { createRandomToken, hashOpaqueToken } from "@/lib/security/crypto";
import { RECOVERY_CODE_COUNT } from "@/lib/security/constants";

function formatRecoveryCode(rawValue: string) {
  return rawValue
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12)
    .replace(/(.{4})/g, "$1-")
    .replace(/-$/, "");
}

export function generateRecoveryCodes() {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () =>
    formatRecoveryCode(createRandomToken(9).toUpperCase()),
  );
}

export function hashRecoveryCode(code: string) {
  return hashOpaqueToken(code.replace(/-/g, "").toUpperCase());
}
