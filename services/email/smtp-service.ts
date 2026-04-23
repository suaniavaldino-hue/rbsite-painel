import "server-only";

import nodemailer from "nodemailer";

import { env } from "@/lib/utils/env";

type SmtpConfiguration = {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  from: string;
  envelopeFrom?: string;
};

type SendTransactionalEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
};

function normalizePort(value?: string) {
  const parsedValue = Number(value ?? "587");
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 587;
}

function extractAddress(value?: string) {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return undefined;
  }

  const match = normalizedValue.match(/<([^>]+)>/);
  return (match?.[1] ?? normalizedValue).trim();
}

export function getSmtpConfiguration(): SmtpConfiguration | null {
  const host = process.env.SMTP_HOST?.trim();
  const port = normalizePort(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD?.trim();
  const from = process.env.SMTP_FROM?.trim();
  const envelopeFrom =
    process.env.SMTP_ENVELOPE_FROM?.trim() || user || extractAddress(from);

  if (!host || !from) {
    return null;
  }

  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: user && pass ? { user, pass } : undefined,
    from,
    envelopeFrom,
  };
}

export function isSmtpConfigured() {
  return Boolean(getSmtpConfiguration());
}

function createTransporter(config: SmtpConfiguration) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    requireTLS: process.env.SMTP_REQUIRE_TLS === "true" || undefined,
    tls:
      process.env.SMTP_REJECT_UNAUTHORIZED === "false"
        ? { rejectUnauthorized: false }
        : undefined,
  });
}

export async function verifySmtpConnection() {
  const config = getSmtpConfiguration();

  if (!config) {
    return {
      ok: false,
      configured: false,
      message: "SMTP_HOST, SMTP_PORT e SMTP_FROM ainda nao estao configurados.",
      appUrl: env.appUrl,
    };
  }

  const transporter = createTransporter(config);
  await transporter.verify();

  return {
    ok: true,
    configured: true,
    host: config.host,
    from: config.from,
    envelopeFrom: config.envelopeFrom,
    secure: config.secure,
    port: config.port,
    authConfigured: Boolean(config.auth),
    message: `Conexao SMTP validada para ${config.from}.`,
    appUrl: env.appUrl,
  };
}

export async function sendTransactionalEmail(
  input: SendTransactionalEmailInput,
) {
  const config = getSmtpConfiguration();

  if (!config) {
    throw new Error(
      "SMTP_HOST, SMTP_PORT e SMTP_FROM precisam estar configurados para envio real.",
    );
  }

  const transporter = createTransporter(config);
  const result = await transporter.sendMail({
    from: config.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    replyTo: input.replyTo,
    envelope: config.envelopeFrom
      ? {
          from: config.envelopeFrom,
          to: input.to,
        }
      : undefined,
  });

  const accepted = (result.accepted ?? []).map(String);
  const rejected = (result.rejected ?? []).map(String);

  if (accepted.length === 0 || rejected.length > 0) {
    throw new Error(
      `SMTP nao confirmou entrega. accepted=${accepted.join(",") || "none"}; rejected=${rejected.join(",") || "none"}; response=${result.response ?? "sem resposta"}`,
    );
  }

  return {
    delivered: true,
    host: config.host,
    from: config.from,
    envelopeFrom: config.envelopeFrom,
    secure: config.secure,
    port: config.port,
    accepted,
    rejected,
    messageId: result.messageId,
    response: result.response,
  };
}
