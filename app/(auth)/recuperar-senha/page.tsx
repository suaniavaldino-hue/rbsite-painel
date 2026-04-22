import Link from "next/link";

import { PasswordRecoveryRequestForm } from "@/components/auth/password-recovery-request-form";
import { AmbientBackground } from "@/components/ui/ambient-background";
import { LogoMark } from "@/components/ui/logo-mark";
import { createCsrfToken } from "@/lib/security/csrf";

export const dynamic = "force-dynamic";

export default function PasswordRecoveryPage() {
  const csrfToken = createCsrfToken("password-reset-request");

  return (
    <main className="relative isolate min-h-screen overflow-hidden px-6 py-8 md:px-10 md:py-10">
      <AmbientBackground />

      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl gap-6 xl:grid-cols-[1fr_0.95fr]">
        <section className="surface-card relative hidden overflow-hidden rounded-[36px] p-10 xl:flex xl:flex-col xl:justify-between">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />

          <div>
            <LogoMark />
            <span className="mt-8 inline-flex rounded-full border border-amber-300/20 bg-amber-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-200">
              Recuperacao segura
            </span>

            <h1 className="mt-6 max-w-2xl font-display text-4xl font-semibold tracking-[-0.05em] text-white">
              Redefina o acesso administrativo sem expor senha nem sessao.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300">
              O fluxo usa token expiravel, auditoria de evento, validacao server-side
              e resposta generica para evitar enumeracao de contas.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-[26px] border border-white/10 bg-white/6 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Token
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                Link temporario com validade curta para redefinicao.
              </p>
            </article>

            <article className="rounded-[26px] border border-white/10 bg-white/6 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Sessao
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                Sessoes anteriores sao invalidadas quando a senha muda.
              </p>
            </article>

            <article className="rounded-[26px] border border-white/10 bg-white/6 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Auditoria
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                Cada solicitacao fica registrada para rastreabilidade.
              </p>
            </article>
          </div>
        </section>

        <section className="surface-card relative flex items-center rounded-[36px] p-5 sm:p-8 md:p-10">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />

          <div className="mx-auto w-full max-w-xl">
            <LogoMark />

            <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-200">
              Recuperar senha
            </p>
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.05em] text-white">
              Solicite um novo link de acesso.
            </h1>
            <p className="mt-4 text-base leading-8 text-slate-300">
              Envie o email administrativo e o sistema prepara um link de
              redefinicao com expiração controlada.
            </p>

            <PasswordRecoveryRequestForm csrfToken={csrfToken} />

            <Link
              href="/login"
              className="mt-8 inline-flex text-sm font-semibold text-amber-200 transition hover:text-amber-100"
            >
              Voltar para o login
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
