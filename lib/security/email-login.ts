import "server-only";

import { randomInt, randomUUID } from "node:crypto";

import nodemailer from "nodemailer";

import {
  DEFAULT_EMAIL_LOGIN_MAX_ATTEMPTS,
  DEFAULT_EMAIL_LOGIN_TTL_MINUTES,
} from "@/lib/security/constants";
import { hashOpaqueToken } from "@/lib/security/crypto";
import { logAuditEvent } from "@/lib/security/audit";
import {
  mutateSecurityState,
  pruneExpiredEmailLoginChallenges,
  readSecurityState,
} from "@/lib/security/store";
import { sanitizeEmail } from "@/lib/security/sanitize";
import { env } from "@/lib/utils/env";

function getEmailLoginTtlMs() {
  return (
    Number(process.env.AUTH_EMAIL_OTP_TTL_MINUTES ?? DEFAULT_EMAIL_LOGIN_TTL_MINUTES) *
    60 *
    1000
  );
}

function getEmailLoginMaxAttempts() {
  const value = Number(
    process.env.AUTH_EMAIL_OTP_MAX_ATTEMPTS ?? DEFAULT_EMAIL_LOGIN_MAX_ATTEMPTS,
  );

  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_EMAIL_LOGIN_MAX_ATTEMPTS;
  }

  return value;
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

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD?.trim();
  const from = process.env.SMTP_FROM?.trim();

  if (!host || !port || !from) {
    return null;
  }

  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: user && pass ? { user, pass } : undefined,
    from,
  };
}

async function sendEmailLoginCodeEmail(input: {
  email: string;
  code: string;
  expiresAt: string;
}) {
  const smtp = getSmtpConfig();

  if (!smtp) {
    if (shouldShowEmailLoginPreview()) {
      return {
        delivered: false,
        previewCode: input.code,
      };
    }

    throw new Error(
      "SMTP_HOST, SMTP_PORT and SMTP_FROM must be configured to send the login code by email.",
    );
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.auth,
  });

  const expirationLabel = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: env.timezone,
  }).format(new Date(input.expiresAt));

  await transporter.sendMail({
    from: smtp.from,
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

  const challenge = await mutateSecurityState((state) => {
    state.emailLoginChallenges = pruneExpiredEmailLoginChallenges(
      state.emailLoginChallenges,
    ).filter((item) => item.email !== email);

    const challengeRecord = {
      id: randomUUID(),
      email,
      codeHash,
      createdAt: now.toISOString(),
      expiresAt,
      attempts: 0,
      requestedIpAddress: input.ipAddress,
      userAgent: input.userAgent,
    };

    state.emailLoginChallenges.push(challengeRecord);

    return {
      id: challengeRecord.id,
      email,
      expiresAt,
      code,
    };
  });

  const delivery = await sendEmailLoginCodeEmail({
    email,
    code,
    expiresAt: challenge.expiresAt,
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
    challengeId: challenge.id,
    expiresAt: challenge.expiresAt,
    previewCode: delivery.previewCode,
  };
}

export async function consumeEmailLoginChallenge(input: {
  email: string;
  challengeId: string;
  code: string;
}) {
  const normalizedEmail = sanitizeEmail(input.email);
  const challengeId = input.challengeId.trim();
  const codeHash = hashOpaqueToken(input.code.trim());
  const now = Date.now();
  const maxAttempts = getEmailLoginMaxAttempts();

  return mutateSecurityState((state) => {
    state.emailLoginChallenges = pruneExpiredEmailLoginChallenges(
      state.emailLoginChallenges,
    );

    const challenge = state.emailLoginChallenges.find(
      (item) => item.id === challengeId && item.email === normalizedEmail,
    );

    if (!challenge) {
      return false;
    }

    if (challenge.consumedAt) {
      return false;
    }

    if (new Date(challenge.expiresAt).getTime() <= now) {
      return false;
    }

    challenge.attempts += 1;

    if (challenge.attempts > maxAttempts) {
      challenge.consumedAt = new Date().toISOString();
      return false;
    }

    if (challenge.codeHash !== codeHash) {
      return false;
    }

    challenge.consumedAt = new Date().toISOString();
    return true;
  });
}

export async function getActiveEmailLoginChallenge(input: {
  email: string;
  challengeId: string;
}) {
  const state = await readSecurityState();
  const email = sanitizeEmail(input.email);
  const challengeId = input.challengeId.trim();
  const now = Date.now();

  return state.emailLoginChallenges.find(
    (item) =>
      item.email === email &&
      item.id === challengeId &&
      !item.consumedAt &&
      new Date(item.expiresAt).getTime() > now,
  );
}
