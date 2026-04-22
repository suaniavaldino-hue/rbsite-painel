import Link from "next/link";

import { PasswordResetForm } from "@/components/auth/password-reset-form";
import { AmbientBackground } from "@/components/ui/ambient-background";
import { LogoMark } from "@/components/ui/logo-mark";
import { createCsrfToken } from "@/lib/security/csrf";
import { validatePasswordResetToken } from "@/lib/security/password-reset";

type PasswordResetTokenPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function PasswordResetTokenPage({
  params,
}: PasswordResetTokenPageProps) {
  const { token } = await params;
  const validToken = await validatePasswordResetToken(token);
  const csrfToken = createCsrfToken("password-reset-confirm");

  return (
    <main className="relative isolate min-h-screen overflow-hidden px-6 py-8 md:px-10 md:py-10">
      <AmbientBackground />

      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-5xl gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="surface-card relative hidden overflow-hidden rounded-[36px] p-10 xl:flex xl:flex-col xl:justify-between">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />

          <div>
            <LogoMark />
            <span className="mt-8 inline-flex rounded-full border border-amber-300/20 bg-amber-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-200">
              Reset protegido
            </span>

            <h1 className="mt-6 max-w-2xl font-display text-4xl font-semibold tracking-[-0.05em] text-white">
              Crie uma nova senha forte e invalide acessos antigos.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300">
              A redefinicao usa token expiravel e versao de sessao, para que
              logins anteriores nao continuem autorizados apos a troca.
            </p>
          </div>
        </section>

        <section className="surface-card relative flex items-center rounded-[36px] p-5 sm:p-8 md:p-10">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />

          <div className="mx-auto w-full max-w-xl">
            <LogoMark />

            <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-200">
              Nova senha
            </p>
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.05em] text-white">
              {validToken
                ? "Defina sua nova credencial administrativa."
                : "Este link nao pode mais ser utilizado."}
            </h1>
            <p className="mt-4 text-base leading-8 text-slate-300">
              {validToken
                ? "Use uma senha forte com pelo menos 12 caracteres, combinando letras e numeros."
                : "Solicite um novo fluxo de recuperacao para continuar com seguranca."}
            </p>

            {validToken ? (
              <PasswordResetForm csrfToken={csrfToken} token={token} />
            ) : (
              <div className="mt-10 rounded-[26px] border border-rose-400/18 bg-rose-500/10 p-5 text-sm leading-7 text-rose-100">
                O token expirou, foi consumido ou nao pertence a uma solicitacao valida.
              </div>
            )}

            <Link
              href={validToken ? "/login" : "/recuperar-senha"}
              className="mt-8 inline-flex text-sm font-semibold text-amber-200 transition hover:text-amber-100"
            >
              {validToken ? "Voltar para o login" : "Solicitar novo link"}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
