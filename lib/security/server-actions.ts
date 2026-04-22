"use server";

import { headers } from "next/headers";

import { getAdminSession } from "@/lib/auth/session";
import { verifyCsrfToken } from "@/lib/security/csrf";
import { assertSameOriginRequest } from "@/lib/security/origin";
import { getClientIpAddress, getUserAgent } from "@/lib/security/request";

export type ServerActionContext = {
  ipAddress: string;
  userAgent: string;
};

export async function requireAuthorizedServerAction(
  formData: FormData,
  purpose: string,
) {
  await assertSameOriginRequest();
  const csrfToken = String(formData.get("csrfToken") ?? "");

  if (!verifyCsrfToken(csrfToken, purpose)) {
    throw new Error("CSRF token invalido ou expirado.");
  }

  const session = await getAdminSession();

  if (!session) {
    throw new Error("Sessao administrativa obrigatoria.");
  }

  const requestHeaders = await headers();

  return {
    session,
    context: {
      ipAddress: getClientIpAddress(requestHeaders),
      userAgent: getUserAgent(requestHeaders),
    } satisfies ServerActionContext,
  };
}

export async function requirePublicServerAction(formData: FormData, purpose: string) {
  await assertSameOriginRequest();
  const csrfToken = String(formData.get("csrfToken") ?? "");

  if (!verifyCsrfToken(csrfToken, purpose)) {
    throw new Error("CSRF token invalido ou expirado.");
  }

  const requestHeaders = await headers();

  return {
    ipAddress: getClientIpAddress(requestHeaders),
    userAgent: getUserAgent(requestHeaders),
  } satisfies ServerActionContext;
}
