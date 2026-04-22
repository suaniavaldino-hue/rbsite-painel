import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { isTokenSessionValid } from "@/lib/security/session-security";

export async function getAdminSession() {
  const session = await auth();

  if (!session?.user || session.user.role !== "admin") {
    return null;
  }

  const sessionValid = await isTokenSessionValid({
    sub: session.user.id,
    email: session.user.email,
    role: session.user.role,
    sessionVersion: session.user.sessionVersion,
    twoFactorPassed: session.user.twoFactorPassed,
  });

  if (!sessionValid) {
    return null;
  }

  return session;
}

export async function requireAdminPageSession(callbackUrl: string) {
  const session = await getAdminSession();

  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return session;
}

export function unauthorizedApiResponse(message = "Authentication required.") {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status: 401 },
  );
}
