import "server-only";

import { getAdminAccount } from "@/lib/security/admin-account";

export async function isTokenSessionValid(token: {
  sub?: string | null;
  email?: string | null;
  role?: string | null;
  sessionVersion?: number;
  twoFactorPassed?: boolean;
}) {
  if (!token.sub || token.role !== "admin" || !token.email) {
    return false;
  }

  const admin = await getAdminAccount();

  if (admin.id !== token.sub || admin.email !== token.email) {
    return false;
  }

  if (token.sessionVersion !== admin.sessionVersion) {
    return false;
  }

  if (admin.twoFactorEnabled && token.twoFactorPassed !== true) {
    return false;
  }

  return true;
}
