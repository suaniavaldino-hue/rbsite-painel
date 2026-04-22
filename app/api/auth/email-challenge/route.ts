import { NextResponse } from "next/server";

import { assertLoginAllowed, recordFailedLoginAttempt } from "@/lib/security/login-protection";
import { logAuditEvent } from "@/lib/security/audit";
import { assertTrustedRequestOrigin, TrustedOriginError } from "@/lib/security/origin";
import { getClientIpAddress, getUserAgent } from "@/lib/security/request";
import { sanitizeEmail, sanitizePlainText } from "@/lib/security/sanitize";
import {
  createEmailLoginChallenge,
  isEmailLoginOtpEnabled,
} from "@/lib/security/email-login";
import {
  resolveAdminByEmail,
  verifyAdminPasswordForEmail,
} from "@/lib/security/admin-account";

export const runtime = "nodejs";

function maskEmail(value: string) {
  const [localPart = "", domain = ""] = value.split("@");

  if (!domain) {
    return value;
  }

  const visibleStart = localPart.slice(0, 2);
  const maskedLocal = `${visibleStart}${"*".repeat(Math.max(2, localPart.length - 2))}`;

  return `${maskedLocal}@${domain}`;
}

export async function POST(request: Request) {
  if (!isEmailLoginOtpEnabled()) {
    return NextResponse.json(
      {
        success: false,
        error: "A confirmacao por email esta desativada neste ambiente.",
      },
      { status: 400 },
    );
  }

  const ipAddress = getClientIpAddress(request.headers);
  const userAgent = getUserAgent(request.headers);

  try {
    assertTrustedRequestOrigin(request.headers);
    const body = await request.json();
    const email = sanitizeEmail(String(body?.email ?? ""));
    const password = sanitizePlainText(String(body?.password ?? ""), 160);

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Informe email e senha para receber o codigo.",
        },
        { status: 400 },
      );
    }

    await assertLoginAllowed(email, ipAddress);

    const admin = await resolveAdminByEmail(email);
    const passwordValid = admin
      ? await verifyAdminPasswordForEmail(email, password)
      : false;

    if (!admin || !passwordValid) {
      await recordFailedLoginAttempt(email, ipAddress);
      await logAuditEvent({
        event: "auth.email_code_request_failed",
        level: "warn",
        actor: {
          email,
          ipAddress,
          userAgent,
        },
        message: "Falha ao solicitar codigo de confirmacao por email.",
      });

      return NextResponse.json(
        {
          success: false,
          error: "Credenciais invalidas.",
        },
        { status: 401 },
      );
    }

    const challenge = await createEmailLoginChallenge({
      email,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      data: {
        challengeId: challenge.challengeId,
        expiresAt: challenge.expiresAt,
        destination: maskEmail(email),
        previewCode: challenge.previewCode,
      },
    });
  } catch (error) {
    if (error instanceof TrustedOriginError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 403 },
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel enviar o codigo de confirmacao por email.";

    await logAuditEvent({
      event: "auth.email_code_request_failed",
      level: "error",
      actor: {
        ipAddress,
        userAgent,
      },
      message,
    });

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
