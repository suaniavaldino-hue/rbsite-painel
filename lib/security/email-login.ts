import "server-only";

import { randomInt, randomUUID, timingSafeEqual } from "node:crypto";

import { DEFAULT_EMAIL_LOGIN_TTL_MINUTES } from "@/lib/security/constants";
import { hashOpaqueToken, signValue } from "@/lib/security/crypto";
import { logAuditEvent } from "@/lib/security/audit";
import { sanitizeEmail } from "@/lib/security/sanitize";
import { env } from "@/lib/utils/env";
import {
  isSmtpConfigured,
  sendTransactionalEmail,
} from "@/services/email/smtp-service";

type EmailChallengePayload = {
  id: string;
  email: string;
  codeHash: string;
  expiresAt: string;
  createdAt: string;
};

function getEmailLoginTtlMs() {
  return (
    Number(process.env.AUTH_EMAIL_OTP_TTL_MINUTES ?? DEFAULT_EMAIL_LOGIN_TTL_MINUTES) *
    60 *
    1000
  );
}

export function isEmailLoginOtpEnabled() {
  return process.env.AUTH_EMAIL_OTP_ENABLED !== "false";
}

function shouldShowEmailLoginPreview() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.AUTH_EMAIL_OTP_PREVIEW === "true"
  );
}

function generateEmailLoginCode() {
  return String(randomInt(100000, 999999));
}

function encodePayload(payload: EmailChallengePayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(value: string) {
  const raw = Buffer.from(value, "base64url").toString("utf8");
  return JSON.parse(raw) as Partial<EmailChallengePayload>;
}

function signChallengePayload(encodedPayload: string) {
  return signValue(`email-login:${encodedPayload}`);
}

function createChallengeToken(payload: EmailChallengePayload) {
  const encodedPayload = encodePayload(payload);
  const signature = signChallengePayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function verifyChallengeToken(token: string) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signChallengePayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = decodePayload(encodedPayload);

    if (
      typeof payload.id !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.codeHash !== "string" ||
      typeof payload.expiresAt !== "string" ||
      typeof payload.createdAt !== "string"
    ) {
      return null;
    }

    return payload as EmailChallengePayload;
  } catch {
    return null;
  }
}

async function sendEmailLoginCodeEmail(input: {
  email: string;
  code: string;
  expiresAt: string;
}) {
  if (!isSmtpConfigured()) {
    if (shouldShowEmailLoginPreview()) {
      return {
        delivered: false,
        previewCode: input.code,
      };
    }

    throw new Error(
      "SMTP_HOST, SMTP_PORT e SMTP_FROM precisam estar configurados para enviar o codigo de login por email.",
    );
  }

  const expirationLabel = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: env.timezone,
  }).format(new Date(input.expiresAt));

  await sendTransactionalEmail({
    to: input.email,
    subject: "Codigo de confirmacao do painel RB Site",
    text: [
      "Seu codigo de confirmacao para acessar o painel da RB Site e:",
      input.code,
      "",
      `Validade: ${expirationLabel}`,
      "",
      "Se voce nao solicitou este acesso, ignore este email.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;background:#f5f7fb;padding:24px;color:#162a41">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:24px;padding:32px;border:1px solid rgba(22,42,65,0.08)">
          <p style="font-size:12px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:#f08129;margin:0 0 12px">RB Site Social Automation</p>
          <h1 style="font-size:28px;line-height:1.1;margin:0 0 16px;color:#162a41">Codigo de confirmacao</h1>
          <p style="font-size:16px;line-height:1.7;margin:0 0 20px;color:#5b6b7b">
            Use o codigo abaixo para concluir o acesso ao painel administrativo da RB Site.
          </p>
          <div style="display:inline-block;padding:18px 24px;border-radius:18px;background:#162a41;color:#ffffff;font-size:32px;font-weight:700;letter-spacing:0.22em">
            ${input.code}
          </div>
          <p style="font-size:14px;line-height:1.7;margin:20px 0 0;color:#5b6b7b">
            Este codigo expira em <strong>${expirationLabel}</strong>.
          </p>
        </div>
      </div>
    `,
  });

  return {
    delivered: true,
    previewCode: undefined,
  };
}

export async function createEmailLoginChallenge(input: {
  email: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const email = sanitizeEmail(input.email);
  const code = generateEmailLoginCode();
  const codeHash = hashOpaqueToken(code);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + getEmailLoginTtlMs()).toISOString();
  const challengeId = createChallengeToken({
    id: randomUUID(),
    email,
    codeHash,
    expiresAt,
    createdAt: now.toISOString(),
  });

  const delivery = await sendEmailLoginCodeEmail({
    email,
    code,
    expiresAt,
  });

  await logAuditEvent({
    event: "auth.email_code_requested",
    actor: {
      email,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
    message: "Codigo de confirmacao por email gerado para login administrativo.",
    metadata: {
      preview: Boolean(delivery.previewCode),
    },
  });

  return {
    challengeId,
    expiresAt,
    previewCode: delivery.previewCode,
  };
}

export async function consumeEmailLoginChallenge(input: {
  email: string;
  challengeId: string;
  code: string;
}) {
  const normalizedEmail = sanitizeEmail(input.email);
  const challenge = verifyChallengeToken(input.challengeId.trim());
  const codeHash = hashOpaqueToken(input.code.trim());

  if (!challenge) {
    return false;
  }

  if (challenge.email !== normalizedEmail) {
    return false;
  }

  if (new Date(challenge.expiresAt).getTime() <= Date.now()) {
    return false;
  }

  const expectedBuffer = Buffer.from(challenge.codeHash);
  const receivedBuffer = Buffer.from(codeHash);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function getActiveEmailLoginChallenge(input: {
  email: string;
  challengeId: string;
}) {
  const normalizedEmail = sanitizeEmail(input.email);
  const challenge = verifyChallengeToken(input.challengeId.trim());

  if (!challenge) {
    return undefined;
  }

  if (challenge.email !== normalizedEmail) {
    return undefined;
  }

  if (new Date(challenge.expiresAt).getTime() <= Date.now()) {
    return undefined;
  }

  return {
    id: challenge.id,
    email: challenge.email,
    codeHash: challenge.codeHash,
    createdAt: challenge.createdAt,
    expiresAt: challenge.expiresAt,
    attempts: 0,
    requestedIpAddress: undefined,
    userAgent: undefined,
  };
}
