import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";
import { AmbientBackground } from "@/components/ui/ambient-background";
import { LogoWordmark } from "@/components/ui/logo-wordmark";
import { isEmailLoginOtpEnabled } from "@/lib/security/email-login";

type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
  }>;
};

export const dynamic = "force-dynamic";

function sanitizeCallbackUrl(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();

  if (session?.user?.role === "admin") {
    redirect("/dashboard");
  }

  const params = searchParams ? await searchParams : undefined;
  const callbackUrl = sanitizeCallbackUrl(params?.callbackUrl);
  const emailOtpEnabled = isEmailLoginOtpEnabled();

  return (
    <main className="relative isolate min-h-screen overflow-hidden px-6 py-8 md:px-10 md:py-10">
      <AmbientBackground />

      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="surface-card relative hidden overflow-hidden rounded-[36px] p-10 xl:flex xl:flex-col xl:justify-between">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />

          <div>
            <LogoWordmark priority imageClassName="max-w-[18rem]" />

            <span className="mt-8 inline-flex rounded-full border border-amber-300/20 bg-amber-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-200">
              Autenticacao segura
            </span>

            <h1 className="mt-6 max-w-2xl font-display text-4xl font-semibold tracking-[-0.05em] text-white">
              Painel interno da RB Site com validacao por email antes da sessao
              e operacao pronta para producao.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300">
              O acesso administrativo agora usa Argon2id, cookies HttpOnly,
              rate limiting, lockout temporario, CSRF, auditoria, suporte a
              segundo fator e confirmacao por codigo temporario enviado ao email
              do admin em subdominio com SSL.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-[26px] border border-white/10 bg-white/6 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Senhas
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                Hash Argon2id com parametrizacao forte e sem texto puro.
              </p>
            </article>

            <article className="rounded-[26px] border border-white/10 bg-white/6 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Sessao
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                Cookie seguro com HttpOnly, Secure e SameSite explicito.
              </p>
            </article>

            <article className="rounded-[26px] border border-white/10 bg-white/6 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Protecao
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                APIs, rotas privadas e Server Actions autorizadas no backend.
              </p>
            </article>
          </div>
        </section>

        <section className="surface-card relative flex items-center rounded-[36px] p-5 sm:p-8 md:p-10">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
          <LoginForm
            callbackUrl={callbackUrl}
            emailOtpEnabled={emailOtpEnabled}
          />
        </section>
      </div>
    </main>
  );
}
