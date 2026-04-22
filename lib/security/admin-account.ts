import "server-only";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { hashRecoveryCode } from "@/lib/security/recovery-codes";
import { sanitizeEmail } from "@/lib/security/sanitize";
import { verifyTotpToken } from "@/lib/security/two-factor";
import { mutateSecurityState, readSecurityState } from "@/lib/security/store";

export async function getAdminAccount() {
  const state = await readSecurityState();
  return state.admin;
}

export async function verifyAdminPassword(password: string) {
  const admin = await getAdminAccount();

  return verifyPassword(password, admin.passwordHash);
}

export async function verifyAdminPasswordForEmail(email: string, password: string) {
  const admin = await resolveAdminByEmail(email);

  if (!admin) {
    return false;
  }

  return verifyPassword(password, admin.passwordHash);
}

export async function resolveAdminByEmail(email: string) {
  const admin = await getAdminAccount();
  const normalizedEmail = sanitizeEmail(email);

  if (admin.email !== normalizedEmail) {
    return null;
  }

  return admin;
}

export async function authenticateAdminCredentials(input: {
  email: string;
  password: string;
  otp?: string;
  recoveryCode?: string;
}) {
  const admin = await resolveAdminByEmail(input.email);

  if (!admin) {
    return null;
  }

  const passwordValid = await verifyPassword(input.password, admin.passwordHash);

  if (!passwordValid) {
    return null;
  }

  if (admin.twoFactorEnabled) {
    const otp = input.otp?.trim();
    const recoveryCode = input.recoveryCode?.trim();

    if (otp && admin.twoFactorSecret) {
      if (!verifyTotpToken(admin.twoFactorSecret, otp)) {
        return null;
      }

      return {
        ...admin,
        twoFactorPassed: true as const,
        authenticationMethod: "totp" as const,
      };
    }

    if (recoveryCode) {
      const recoveryCodeHash = hashRecoveryCode(recoveryCode);

      const consumed = await mutateSecurityState((state) => {
        const recoveryIndex = state.admin.recoveryCodeHashes.findIndex(
          (hash) => hash === recoveryCodeHash,
        );

        if (recoveryIndex === -1) {
          return false;
        }

        state.admin.recoveryCodeHashes.splice(recoveryIndex, 1);
        return true;
      });

      if (!consumed) {
        return null;
      }

      return {
        ...(await getAdminAccount()),
        twoFactorPassed: true as const,
        authenticationMethod: "recovery_code" as const,
      };
    }

    return null;
  }

  return {
    ...admin,
    twoFactorPassed: false as const,
    authenticationMethod: "password" as const,
  };
}

export async function updateAdminPassword(newPassword: string) {
  const passwordHash = await hashPassword(newPassword);
  const updatedAt = new Date().toISOString();

  await mutateSecurityState((state) => {
    state.admin.passwordHash = passwordHash;
    state.admin.passwordUpdatedAt = updatedAt;
    state.admin.sessionVersion += 1;
    state.passwordResetTokens = [];
    state.loginAttempts = [];
  });
}
