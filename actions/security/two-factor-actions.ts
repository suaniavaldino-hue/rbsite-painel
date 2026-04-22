"use server";

import { randomUUID } from "node:crypto";

import { verifyAdminPassword } from "@/lib/security/admin-account";
import { logAuditEvent } from "@/lib/security/audit";
import {
  generateRecoveryCodes,
  hashRecoveryCode,
} from "@/lib/security/recovery-codes";
import { sanitizePlainText } from "@/lib/security/sanitize";
import { requireAuthorizedServerAction } from "@/lib/security/server-actions";
import {
  buildOtpAuthUri,
  createTwoFactorSecret,
  verifyTotpToken,
} from "@/lib/security/two-factor";
import { mutateSecurityState, readSecurityState } from "@/lib/security/store";
import { BRAND } from "@/lib/constants/brand";

export type TwoFactorActionState = {
  status: "idle" | "success" | "error";
  message: string;
  setupSecret?: string;
  otpAuthUrl?: string;
  recoveryCodes?: string[];
};

const defaultState: TwoFactorActionState = {
  status: "idle",
  message: "",
};

export async function startTwoFactorEnrollmentAction(
  previousState: TwoFactorActionState = defaultState,
  formData: FormData,
): Promise<TwoFactorActionState> {
  void previousState;
  try {
    const { session, context } = await requireAuthorizedServerAction(
      formData,
      "2fa-start",
    );
    const currentPassword = sanitizePlainText(
      String(formData.get("currentPassword") ?? ""),
      160,
    );

    if (!(await verifyAdminPassword(currentPassword))) {
      return {
        status: "error",
        message: "Senha atual invalida.",
      };
    }

    const secret = createTwoFactorSecret();
    const otpAuthUrl = buildOtpAuthUri({
      issuer: "RB Site Social Automation",
      accountName: session.user.email ?? "admin@rbsite.com.br",
      secret,
    });

    await mutateSecurityState((state) => {
      state.admin.pendingTwoFactorSetup = {
        secret,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };
    });

    await logAuditEvent({
      event: "security.2fa_setup_started",
      actor: {
        id: session.user.id,
        email: session.user.email ?? undefined,
        role: "admin",
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      target: "2fa",
      message: "Preparacao de 2FA iniciada pelo administrador.",
    });

    return {
      status: "success",
      message:
        "Escaneie o segredo no autenticador e confirme com um codigo de 6 digitos.",
      setupSecret: secret,
      otpAuthUrl,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel iniciar a configuracao de 2FA.",
    };
  }
}

export async function confirmTwoFactorEnrollmentAction(
  previousState: TwoFactorActionState = defaultState,
  formData: FormData,
): Promise<TwoFactorActionState> {
  void previousState;
  try {
    const { session, context } = await requireAuthorizedServerAction(
      formData,
      "2fa-confirm",
    );
    const currentPassword = sanitizePlainText(
      String(formData.get("currentPassword") ?? ""),
      160,
    );
    const otp = sanitizePlainText(String(formData.get("otp") ?? ""), 12);

    if (!(await verifyAdminPassword(currentPassword))) {
      return {
        status: "error",
        message: "Senha atual invalida.",
      };
    }

    const state = await readSecurityState();
    const pendingSetup = state.admin.pendingTwoFactorSetup;

    if (!pendingSetup) {
      return {
        status: "error",
        message: "Nenhuma configuracao pendente de 2FA foi encontrada.",
      };
    }

    if (new Date(pendingSetup.expiresAt).getTime() <= Date.now()) {
      return {
        status: "error",
        message: "A configuracao pendente expirou. Inicie novamente.",
      };
    }

    if (!verifyTotpToken(pendingSetup.secret, otp)) {
      return {
        status: "error",
        message: "Codigo 2FA invalido.",
      };
    }

    const recoveryCodes = generateRecoveryCodes();

    await mutateSecurityState((currentState) => {
      currentState.admin.twoFactorEnabled = true;
      currentState.admin.twoFactorSecret = pendingSetup.secret;
      currentState.admin.pendingTwoFactorSetup = undefined;
      currentState.admin.recoveryCodeHashes = recoveryCodes.map(hashRecoveryCode);
    });

    await logAuditEvent({
      event: "security.configuration_changed",
      actor: {
        id: session.user.id,
        email: session.user.email ?? undefined,
        role: "admin",
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      target: "2fa",
      message: "2FA habilitado para o administrador.",
      metadata: {
        recoveryCodeCount: recoveryCodes.length,
      },
    });

    return {
      status: "success",
      message:
        "2FA habilitado com sucesso. Guarde os codigos de recuperacao em local seguro.",
      recoveryCodes,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel confirmar o 2FA.",
    };
  }
}

export async function regenerateRecoveryCodesAction(
  previousState: TwoFactorActionState = defaultState,
  formData: FormData,
): Promise<TwoFactorActionState> {
  void previousState;
  try {
    const { session, context } = await requireAuthorizedServerAction(
      formData,
      "2fa-recovery-regenerate",
    );
    const currentPassword = sanitizePlainText(
      String(formData.get("currentPassword") ?? ""),
      160,
    );
    const otp = sanitizePlainText(String(formData.get("otp") ?? ""), 12);

    if (!(await verifyAdminPassword(currentPassword))) {
      return {
        status: "error",
        message: "Senha atual invalida.",
      };
    }

    const currentState = await readSecurityState();

    if (!currentState.admin.twoFactorEnabled || !currentState.admin.twoFactorSecret) {
      return {
        status: "error",
        message: "O 2FA ainda nao esta habilitado.",
      };
    }

    if (!verifyTotpToken(currentState.admin.twoFactorSecret, otp)) {
      return {
        status: "error",
        message: "Codigo 2FA invalido para regenerar os codigos.",
      };
    }

    const recoveryCodes = generateRecoveryCodes();

    await mutateSecurityState((state) => {
      state.admin.recoveryCodeHashes = recoveryCodes.map(hashRecoveryCode);
    });

    await logAuditEvent({
      event: "security.configuration_changed",
      actor: {
        id: session.user.id,
        email: session.user.email ?? undefined,
        role: "admin",
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      target: "2fa-recovery",
      message: "Codigos de recuperacao 2FA regenerados.",
      metadata: {
        operationId: randomUUID(),
        domain: BRAND.defaultPanelDomain,
      },
    });

    return {
      status: "success",
      message:
        "Novos codigos de recuperacao gerados. Substitua imediatamente os antigos.",
      recoveryCodes,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel regenerar os codigos de recuperacao.",
    };
  }
}
