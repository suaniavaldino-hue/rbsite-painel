"use server";

import nodemailer from "nodemailer";

import { logAuditEvent } from "@/lib/security/audit";
import { updateAdminPassword } from "@/lib/security/admin-account";
import { env } from "@/lib/utils/env";
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  validatePasswordResetToken,
} from "@/lib/security/password-reset";
import { sanitizeEmail, sanitizePlainText } from "@/lib/security/sanitize";
import { requirePublicServerAction } from "@/lib/security/server-actions";

export type PasswordResetActionState = {
  status: "idle" | "success" | "error";
  message: string;
  previewUrl?: string;
};

const defaultState: PasswordResetActionState = {
  status: "idle",
  message: "",
};

function validateStrongPassword(password: string) {
  if (password.length < 12) {
    return "Use pelo menos 12 caracteres.";
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return "Use letras maiusculas, minusculas e numeros.";
  }

  return null;
}

function shouldShowResetPreview() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.AUTH_SHOW_RESET_TOKEN_PREVIEW === "true"
  );
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

async function sendPasswordResetEmail(input: {
  email: string;
  resetUrl: string;
  expiresAt: string;
}) {
  const smtp = getSmtpConfig();

  if (!smtp) {
    return {
      delivered: false,
      reason: "smtp_not_configured" as const,
    };
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
    subject: "Redefinicao de senha do painel RB Site",
    text: [
      "Recebemos uma solicitacao para redefinir a senha do painel RB Site.",
      "",
      `Abra este link: ${input.resetUrl}`,
      "",
      `Validade: ${expirationLabel}`,
      "",
      "Se voce nao solicitou esta redefinicao, ignore este email.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;background:#f5f7fb;padding:24px;color:#162a41">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:24px;padding:32px;border:1px solid rgba(22,42,65,0.08)">
          <p style="font-size:12px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:#f08129;margin:0 0 12px">RB Site Social Automation</p>
          <h1 style="font-size:28px;line-height:1.1;margin:0 0 16px;color:#162a41">Redefinicao de senha</h1>
          <p style="font-size:16px;line-height:1.7;margin:0 0 20px;color:#5b6b7b">
            Recebemos uma solicitacao para redefinir a senha do painel administrativo da RB Site.
          </p>
          <a href="${input.resetUrl}" style="display:inline-block;padding:14px 22px;border-radius:18px;background:#f59e0b;color:#0f172a;font-size:16px;font-weight:700;text-decoration:none">
            Redefinir senha
          </a>
          <p style="font-size:14px;line-height:1.7;margin:20px 0 0;color:#5b6b7b">
            Este link expira em <strong>${expirationLabel}</strong>.
          </p>
        </div>
      </div>
    `,
  });

  return {
    delivered: true,
    reason: "smtp_sent" as const,
  };
}

export async function requestPasswordResetAction(
  previousState: PasswordResetActionState = defaultState,
  formData: FormData,
): Promise<PasswordResetActionState> {
  void previousState;
  try {
    const context = await requirePublicServerAction(
      formData,
      "password-reset-request",
    );
    const email = sanitizeEmail(String(formData.get("email") ?? ""));

    if (!email) {
      return {
        status: "error",
        message: "Informe um email valido.",
      };
    }

    const token = await createPasswordResetToken(email, context.ipAddress);
    const showPreview = shouldShowResetPreview();
    const previewUrl = token ? `${env.appUrl}/recuperar-senha/${token.token}` : undefined;

    let delivery:
      | {
          delivered: boolean;
          reason: "smtp_not_configured" | "smtp_sent";
        }
      | undefined;

    if (token && previewUrl) {
      delivery = await sendPasswordResetEmail({
        email: token.email,
        resetUrl: previewUrl,
        expiresAt: token.expiresAt,
      });
    }

    await logAuditEvent({
      event: "auth.password_reset_requested",
      actor: {
        email,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      message: "Solicitacao de recuperacao de senha recebida.",
      metadata: {
        matchedAdmin: Boolean(token),
        delivery: delivery?.reason ?? "not_requested",
      },
    });

    return {
      status: "success",
      message:
        token && delivery?.delivered
          ? "Se o email existir como administrador, um link de recuperacao foi enviado com validade limitada."
          : "Se o email existir como administrador, um link de recuperacao foi preparado com validade limitada.",
      previewUrl: showPreview && token ? previewUrl : undefined,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel iniciar a recuperacao de senha.",
    };
  }
}

export async function resetPasswordAction(
  token: string,
  previousState: PasswordResetActionState = defaultState,
  formData: FormData,
): Promise<PasswordResetActionState> {
  void previousState;
  try {
    const context = await requirePublicServerAction(formData, "password-reset-confirm");
    const password = sanitizePlainText(String(formData.get("password") ?? ""), 160);
    const confirmPassword = sanitizePlainText(
      String(formData.get("confirmPassword") ?? ""),
      160,
    );

    if (password !== confirmPassword) {
      return {
        status: "error",
        message: "As senhas informadas nao coincidem.",
      };
    }

    const passwordError = validateStrongPassword(password);

    if (passwordError) {
      return {
        status: "error",
        message: passwordError,
      };
    }

    const tokenValid = await validatePasswordResetToken(token);

    if (!tokenValid) {
      return {
        status: "error",
        message: "Este link de recuperacao expirou ou ja foi utilizado.",
      };
    }

    const consumed = await consumePasswordResetToken(token);

    if (!consumed) {
      return {
        status: "error",
        message: "Nao foi possivel validar este link de recuperacao.",
      };
    }

    await updateAdminPassword(password);

    await logAuditEvent({
      event: "auth.password_reset_completed",
      actor: {
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      message: "Senha administrativa redefinida com sucesso.",
    });

    return {
      status: "success",
      message:
        "Senha redefinida com sucesso. As sessoes anteriores foram invalidadas e voce ja pode entrar novamente.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel redefinir a senha.",
    };
  }
}
