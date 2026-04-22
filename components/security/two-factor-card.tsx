"use client";

import { useActionState } from "react";

import {
  confirmTwoFactorEnrollmentAction,
  regenerateRecoveryCodesAction,
  startTwoFactorEnrollmentAction,
  type TwoFactorActionState,
} from "@/actions/security/two-factor-actions";

type TwoFactorCardProps = {
  enabled: boolean;
  pendingSecret?: string;
  pendingOtpAuthUrl?: string;
  startCsrfToken: string;
  confirmCsrfToken: string;
  recoveryCsrfToken: string;
};

const initialState: TwoFactorActionState = {
  status: "idle",
  message: "",
};

function Feedback({
  state,
}: {
  state: TwoFactorActionState;
}) {
  if (!state.message) {
    return null;
  }

  const success = state.status === "success";

  return (
    <div
      className={`rounded-2xl px-4 py-3 text-sm ${
        success
          ? "border border-emerald-400/18 bg-emerald-500/10 text-emerald-50"
          : "border border-rose-400/18 bg-rose-500/10 text-rose-100"
      }`}
    >
      <p>{state.message}</p>

      {state.setupSecret ? (
        <div className="mt-3 grid gap-2 rounded-[18px] border border-white/10 bg-slate-950/40 p-4 font-mono text-xs text-slate-100">
          <span>Secret: {state.setupSecret}</span>
          <span className="break-all">URI: {state.otpAuthUrl}</span>
        </div>
      ) : null}

      {state.recoveryCodes?.length ? (
        <div className="mt-3 grid gap-2 rounded-[18px] border border-white/10 bg-slate-950/40 p-4 font-mono text-xs text-slate-100 sm:grid-cols-2">
          {state.recoveryCodes.map((code) => (
            <span key={code}>{code}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TwoFactorCard({
  enabled,
  pendingSecret,
  pendingOtpAuthUrl,
  startCsrfToken,
  confirmCsrfToken,
  recoveryCsrfToken,
}: TwoFactorCardProps) {
  const [startState, startAction, startPending] = useActionState(
    startTwoFactorEnrollmentAction,
    initialState,
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmTwoFactorEnrollmentAction,
    initialState,
  );
  const [recoveryState, recoveryAction, recoveryPending] = useActionState(
    regenerateRecoveryCodesAction,
    initialState,
  );
  const setupSecret = startState.setupSecret ?? pendingSecret;
  const otpAuthUrl = startState.otpAuthUrl ?? pendingOtpAuthUrl;

  return (
    <div className="grid gap-6">
      <article className="surface-card rounded-[30px] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              Two-Factor Authentication
            </p>
            <h2 className="mt-4 font-display text-2xl font-semibold tracking-[-0.03em] text-white">
              Proteja o admin com TOTP e codigos de recuperacao.
            </h2>
          </div>

          <span
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${
              enabled
                ? "border-emerald-400/18 bg-emerald-500/10 text-emerald-100"
                : "border-white/10 bg-white/6 text-slate-300"
            }`}
          >
            {enabled ? "2FA ativo" : "2FA pendente"}
          </span>
        </div>

        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
          O segundo fator usa aplicativo autenticador compatível com TOTP. A
          ativacao e protegida por senha atual, CSRF e auditoria.
        </p>

        <form action={startAction} className="mt-6 grid gap-4">
          <input type="hidden" name="csrfToken" value={startCsrfToken} />

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Senha atual
            </span>
            <input
              type="password"
              name="currentPassword"
              autoComplete="current-password"
              placeholder="Confirme sua senha"
              className="h-14 rounded-2xl border border-white/10 bg-slate-950/50 px-4 text-white outline-none transition focus:border-amber-300/40 focus:bg-slate-950/70"
              required
            />
          </label>

          <button
            type="submit"
            disabled={startPending}
            className="inline-flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-white/6 px-5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {startPending ? "Preparando autenticador..." : "Gerar segredo 2FA"}
          </button>
        </form>

        <Feedback state={startState} />

        {setupSecret && otpAuthUrl ? (
          <form action={confirmAction} className="mt-8 grid gap-4 rounded-[24px] border border-amber-300/16 bg-amber-300/8 p-5">
            <input type="hidden" name="csrfToken" value={confirmCsrfToken} />

            <p className="text-xs uppercase tracking-[0.28em] text-amber-200">
              Confirmacao do autenticador
            </p>
            <p className="text-sm leading-7 text-amber-50/90">
              Adicione o segredo no app autenticador e confirme com o primeiro
              codigo de 6 digitos.
            </p>

            <div className="rounded-[18px] border border-white/10 bg-slate-950/45 p-4 font-mono text-xs text-white">
              <p>Secret: {setupSecret}</p>
              <p className="mt-2 break-all">URI: {otpAuthUrl}</p>
            </div>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">
                Senha atual
              </span>
              <input
                type="password"
                name="currentPassword"
                autoComplete="current-password"
                placeholder="Confirme sua senha novamente"
                className="h-14 rounded-2xl border border-white/10 bg-slate-950/50 px-4 text-white outline-none transition focus:border-amber-200/45 focus:bg-slate-950/70"
                required
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">
                Codigo TOTP
              </span>
              <input
                type="text"
                inputMode="numeric"
                name="otp"
                placeholder="123456"
                className="h-14 rounded-2xl border border-white/10 bg-slate-950/50 px-4 text-white outline-none transition focus:border-amber-200/45 focus:bg-slate-950/70"
                required
              />
            </label>

            <button
              type="submit"
              disabled={confirmPending}
              className="inline-flex h-14 items-center justify-center rounded-2xl bg-amber-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {confirmPending ? "Confirmando 2FA..." : "Confirmar e habilitar 2FA"}
            </button>

            <Feedback state={confirmState} />
          </form>
        ) : null}
      </article>

      {enabled ? (
        <article className="surface-card rounded-[30px] p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Recuperacao
          </p>
          <h3 className="mt-4 font-display text-2xl font-semibold tracking-[-0.03em] text-white">
            Regenerar codigos de emergencia
          </h3>

          <p className="mt-4 text-sm leading-7 text-slate-300">
            Gere uma nova lista de codigos de recuperacao. Isso invalida todos os
            codigos anteriores.
          </p>

          <form action={recoveryAction} className="mt-6 grid gap-4">
            <input type="hidden" name="csrfToken" value={recoveryCsrfToken} />

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Senha atual
              </span>
              <input
                type="password"
                name="currentPassword"
                autoComplete="current-password"
                placeholder="Confirme sua senha"
                className="h-14 rounded-2xl border border-white/10 bg-slate-950/50 px-4 text-white outline-none transition focus:border-amber-300/40 focus:bg-slate-950/70"
                required
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Codigo 2FA atual
              </span>
              <input
                type="text"
                inputMode="numeric"
                name="otp"
                placeholder="123456"
                className="h-14 rounded-2xl border border-white/10 bg-slate-950/50 px-4 text-white outline-none transition focus:border-amber-300/40 focus:bg-slate-950/70"
                required
              />
            </label>

            <button
              type="submit"
              disabled={recoveryPending}
              className="inline-flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-white/6 px-5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {recoveryPending ? "Regenerando..." : "Regenerar codigos"}
            </button>
          </form>

          <Feedback state={recoveryState} />
        </article>
      ) : null}
    </div>
  );
}
