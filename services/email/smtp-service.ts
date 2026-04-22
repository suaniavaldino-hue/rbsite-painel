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

export function getSmtpConfiguration(): SmtpConfiguration | null {
  const host = process.env.SMTP_HOST?.trim();
  const port = normalizePort(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD?.trim();
  const from = process.env.SMTP_FROM?.trim();

  if (!host || !from) {
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

export function isSmtpConfigured() {
  return Boolean(getSmtpConfiguration());
}

function createTransporter(config: SmtpConfiguration) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
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
    secure: config.secure,
    port: config.port,
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

  await transporter.sendMail({
    from: config.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    replyTo: input.replyTo,
  });

  return {
    delivered: true,
    host: config.host,
    from: config.from,
    secure: config.secure,
    port: config.port,
  };
}
