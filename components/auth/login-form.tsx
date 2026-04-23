"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { type FormEvent, useEffect, useState, useTransition } from "react";

import { LogoWordmark } from "@/components/ui/logo-wordmark";

type LoginFormProps = {
  callbackUrl: string;
  emailOtpEnabled: boolean;
};

type EmailChallengeResponse = {
  success: boolean;
  data?: {
    challengeId: string;
    expiresAt: string;
    destination: string;
    previewCode?: string;
  };
  error?: string;
};

const SAVED_ADMIN_EMAIL_KEY = "rbsite.adminEmail";

function sanitizeCallbackUrl(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

async function readJsonResponse<T>(response: Response) {
  const rawBody = await response.text();

  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody) as T;
  } catch {
    throw new Error(
      response.ok
        ? "O servidor respondeu em formato invalido."
        : `O servidor retornou uma resposta invalida (${response.status}).`,
    );
  }
}

export function LoginForm({ callbackUrl, emailOtpEnabled }: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [emailLoginCode, setEmailLoginCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [challengeMessage, setChallengeMessage] = useState<string | null>(null);
  const [challengePreviewCode, setChallengePreviewCode] = useState<string | null>(null);

  useEffect(() => {
    const savedEmail = window.localStorage.getItem(SAVED_ADMIN_EMAIL_KEY);

    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  useEffect(() => {
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail) {
      window.localStorage.setItem(SAVED_ADMIN_EMAIL_KEY, normalizedEmail);
    }
  }, [email]);

  async function requestEmailChallenge() {
    const response = await fetch("/api/auth/email-challenge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const result = await readJsonResponse<EmailChallengeResponse>(response);

    if (!response.ok || !result?.success || !result.data) {
      throw new Error(
        result?.error ??
          `Nao foi possivel enviar o codigo de confirmacao por email (${response.status}).`,
      );
    }

    setChallengeId(result.data.challengeId);
    setChallengePreviewCode(result.data.previewCode ?? null);
    setChallengeMessage(
      `Codigo enviado para ${result.data.destination}. Valido ate ${formatDate(result.data.expiresAt)}.`,
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        if (emailOtpEnabled && !challengeId) {
          await requestEmailChallenge();
          return;
        }

        const result = await signIn("credentials", {
          email,
          password,
          otp,
          recoveryCode,
          emailLoginCode,
          emailChallengeId: challengeId,
          redirect: false,
          callbackUrl: sanitizeCallbackUrl(callbackUrl),
        });

        if (!result || result.error) {
          setError(
            "Falha de autenticacao. Verifique senha, codigo por email e possivel bloqueio temporario.",
          );
          return;
        }

        router.push(result.url ?? "/dashboard");
        router.refresh();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Falha ao iniciar o processo de login.",
        );
      }
    });
  }

  function handleResendChallenge() {
    setError(null);

    startTransition(async () => {
      try {
        await requestEmailChallenge();
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Nao foi possivel reenviar o codigo.",
        );
      }
    });
  }

  const waitingForEmailCode = emailOtpEnabled && Boolean(challengeId);

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-3">
          <LogoWordmark imageClassName="max-w-[13rem] md:max-w-[15rem]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">
            Painel interno premium
          </span>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
          Senha + Email OTP
        </span>
      </div>

      <div className="mt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-200">
          Login admin
        </p>

        <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">
          Entre com senha forte e codigo de confirmacao enviado por email.
        </h1>

        <p className="mt-4 text-base leading-8 text-slate-300">
          O acesso administrativo da RB Site combina senha protegida por
          Argon2id, cookies HttpOnly, rate limiting e confirmacao por codigo
          temporario enviado ao email do admin.
        </p>
      </div>

      <form onSubmit={handleSubmit} autoComplete="on" className="mt-10 grid gap-5">
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Email administrativo
          </span>
          <input
            type="email"
            name="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="contato@rbsite.com.br"
            className="h-14 rounded-2xl border border-white/10 bg-slate-950/50 px-4 text-white outline-none transition focus:border-amber-300/40 focus:bg-slate-950/70"
            required
          />
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Senha
          </span>
          <div className="flex h-14 items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-4 transition focus-within:border-amber-300/40 focus-within:bg-slate-950/70">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300/60" />
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Digite sua senha"
              className="min-w-0 flex-1 bg-transparent text-white outline-none"
              required
            />
          </div>
        </label>

        {waitingForEmailCode ? (
          <div className="rounded-[26px] border border-amber-300/18 bg-amber-300/8 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-200">
              Confirmacao por email
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-200">
              {challengeMessage}
            </p>

            {challengePreviewCode ? (
              <p className="mt-3 text-sm leading-7 text-amber-100">
                Preview local do codigo:{" "}
                <span className="font-mono text-white">{challengePreviewCode}</span>
              </p>
            ) : null}

            <label className="mt-4 grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Codigo enviado por email
              </span>
              <input
                type="text"
                inputMode="numeric"
                name="one-time-code"
                autoComplete="one-time-code"
                value={emailLoginCode}
                onChange={(event) => setEmailLoginCode(event.target.value)}
                placeholder="123456"
                className="h-14 rounded-2xl border border-white/10 bg-slate-950/50 px-4 text-white outline-none transition focus:border-amber-300/40 focus:bg-slate-950/70"
                required={waitingForEmailCode}
              />
            </label>

            <button
              type="button"
              onClick={handleResendChallenge}
              disabled={isPending}
              className="mt-4 text-sm font-semibold text-amber-200 transition hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Reenviar codigo
            </button>
          </div>
        ) : null}

        <details className="rounded-[26px] border border-white/10 bg-white/5 p-5">
          <summary className="cursor-pointer text-sm font-semibold text-slate-200">
            Opcoes avancadas de seguranca
          </summary>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Codigo 2FA
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder="123456"
                className="h-14 rounded-2xl border border-white/10 bg-slate-950/50 px-4 text-white outline-none transition focus:border-amber-300/40 focus:bg-slate-950/70"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Codigo de recuperacao
              </span>
              <input
                type="text"
                value={recoveryCode}
                onChange={(event) => setRecoveryCode(event.target.value)}
                placeholder="ABCD-EFGH-IJKL"
                className="h-14 rounded-2xl border border-white/10 bg-slate-950/50 px-4 text-white outline-none transition focus:border-amber-300/40 focus:bg-slate-950/70"
              />
            </label>
          </div>
        </details>

        {error ? (
          <div className="rounded-2xl border border-rose-400/18 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending
            ? "Processando..."
            : waitingForEmailCode
              ? "Confirmar codigo e entrar"
              : emailOtpEnabled
                ? "Enviar codigo por email"
                : "Entrar no painel"}
          <span aria-hidden className="text-base leading-none">
            &gt;
          </span>
        </button>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/recuperar-senha"
          className="text-sm font-semibold text-amber-200 transition hover:text-amber-100"
        >
          Esqueci minha senha
        </Link>
        <span className="text-xs uppercase tracking-[0.24em] text-slate-500">
          HTTPS obrigatorio em producao
        </span>
      </div>

      <div className="mt-8 rounded-[26px] border border-white/10 bg-white/5 p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
          Boas praticas
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          Mantenha a senha do admin forte e armazene SMTP, segredos e hashes
          apenas em variaveis de ambiente. O email do admin sugerido para a RB
          Site e <span className="font-mono text-slate-200">contato@rbsite.com.br</span>.
        </p>
      </div>
    </div>
  );
}
