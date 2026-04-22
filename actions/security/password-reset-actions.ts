"use server";

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
      },
    });

    const showPreview =
      process.env.NODE_ENV !== "production" ||
      process.env.AUTH_SHOW_RESET_TOKEN_PREVIEW === "true";

    return {
      status: "success",
      message:
        "Se o email existir como administrador, um link de recuperacao foi preparado com validade limitada.",
      previewUrl:
        showPreview && token
          ? `${env.appUrl}/recuperar-senha/${token.token}`
          : undefined,
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
