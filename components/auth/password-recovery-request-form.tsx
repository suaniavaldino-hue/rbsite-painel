"use client";

import { useActionState } from "react";

import {
  requestPasswordResetAction,
  type PasswordResetActionState,
} from "@/actions/security/password-reset-actions";

type PasswordRecoveryRequestFormProps = {
  csrfToken: string;
};

const initialState: PasswordResetActionState = {
  status: "idle",
  message: "",
};

export function PasswordRecoveryRequestForm({
  csrfToken,
}: PasswordRecoveryRequestFormProps) {
  const [state, formAction, isPending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-10 grid gap-5">
      <input type="hidden" name="csrfToken" value={csrfToken} />

      <label className="grid gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
          Email administrativo
        </span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          placeholder="contato@rbsite.com.br"
          className="h-14 rounded-2xl border border-white/10 bg-slate-950/50 px-4 text-white outline-none transition focus:border-amber-300/40 focus:bg-slate-950/70"
          required
        />
      </label>

      {state.message ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            state.status === "error"
              ? "border border-rose-400/18 bg-rose-500/10 text-rose-100"
              : "border border-emerald-400/18 bg-emerald-500/10 text-emerald-50"
          }`}
        >
          <p>{state.message}</p>
          {state.previewUrl ? (
            <p className="mt-2 break-all text-xs text-emerald-100/90">
              Preview local: {state.previewUrl}
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Preparando link..." : "Solicitar recuperacao"}
      </button>
    </form>
  );
}
