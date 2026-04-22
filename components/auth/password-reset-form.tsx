"use client";

import { useActionState } from "react";

import {
  resetPasswordAction,
  type PasswordResetActionState,
} from "@/actions/security/password-reset-actions";

type PasswordResetFormProps = {
  csrfToken: string;
  token: string;
};

const initialState: PasswordResetActionState = {
  status: "idle",
  message: "",
};

export function PasswordResetForm({ csrfToken, token }: PasswordResetFormProps) {
  const boundAction = resetPasswordAction.bind(null, token);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="mt-10 grid gap-5">
      <input type="hidden" name="csrfToken" value={csrfToken} />

      <label className="grid gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
          Nova senha
        </span>
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="Nova senha forte"
          className="h-14 rounded-2xl border border-white/10 bg-slate-950/50 px-4 text-white outline-none transition focus:border-amber-300/40 focus:bg-slate-950/70"
          required
        />
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
          Confirmar senha
        </span>
        <input
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Repita a nova senha"
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
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Aplicando nova senha..." : "Redefinir senha"}
      </button>
    </form>
  );
}
