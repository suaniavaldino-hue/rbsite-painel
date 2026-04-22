import Link from "next/link";

import { AmbientBackground } from "@/components/ui/ambient-background";
import { LogoWordmark } from "@/components/ui/logo-wordmark";
import { BRAND, RB_CONTENT_PILLARS } from "@/lib/constants/brand";
import { DASHBOARD_NAVIGATION } from "@/lib/constants/navigation";

const foundationCards = [
  {
    eyebrow: "Geracao",
    title: "Conteudo estrategico com estrutura pronta para OpenAI, agenda e publicacao.",
    copy:
      "Posts, carrosseis e reels podem sair com texto, legenda, hashtags e melhor janela de postagem no mesmo fluxo.",
  },
  {
    eyebrow: "Operacao",
    title: "Subdominio preparado para operar separado do site institucional da RB Site.",
    copy:
      "A base considera SSL, cookies seguros, variaveis de ambiente protegidas e deploy em painel.rbsite.com.br.",
  },
  {
    eyebrow: "Experiencia",
    title: "Visual premium inspirado em produtos SaaS de alto nivel e alinhado a marca.",
    copy:
      "Paleta navy e laranja da RB Site, profundidade refinada, tipografia forte e linguagem comercial mais madura.",
  },
  {
    eyebrow: "Seguranca",
    title: "Login reforcado com senha hash, auditoria, rate limiting e codigo por email.",
    copy:
      "O painel foi preparado para acesso administrativo de verdade, sem expor segredos no frontend.",
  },
];

export default function Home() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden px-6 py-8 md:px-10 md:py-10">
      <AmbientBackground />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="surface-card relative overflow-hidden rounded-[32px] p-6 md:p-8">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <LogoWordmark priority imageClassName="max-w-[16rem] md:max-w-[18rem]" />
                <span className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-200">
                  Painel premium RB Site
                </span>
              </div>

              <h1 className="font-display text-3xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
                Gere, organize e publique conteudo com a identidade da RB Site
                em um unico painel.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
                A estrutura central do produto ja combina painel administrativo,
                seguranca reforcada, integracoes separadas por services e base
                pronta para OpenAI, Meta Graph API, Supabase e automacoes em
                subdominio com SSL.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
                >
                  Acessar painel seguro
                </Link>
                <Link
                  href="/api/health"
                  className="inline-flex items-center rounded-full border border-white/14 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/24 hover:bg-white/10"
                >
                  Ver healthcheck
                </Link>
                <a
                  href={BRAND.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border border-white/14 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/24 hover:bg-white/10"
                >
                  Abrir site principal
                </a>
              </div>
            </div>

            <div className="grid gap-3 rounded-[28px] border border-white/10 bg-slate-950/40 p-4 md:min-w-[22rem]">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.28em] text-slate-400">
                  Operacao principal
                </span>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                  pronta para evoluir
                </span>
              </div>

              <div className="grid gap-2 text-sm text-slate-200">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Admin base</span>
                  <span>{BRAND.email}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Site oficial</span>
                  <span>{BRAND.websiteLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Canal comercial</span>
                  <span>{BRAND.whatsapp}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Subdominio alvo</span>
                  <span>{BRAND.defaultPanelDomain}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {foundationCards.map((card) => (
            <article key={card.eyebrow} className="surface-card rounded-[28px] p-6">
              <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-200">
                {card.eyebrow}
              </span>
              <h2 className="mt-4 font-display text-2xl font-semibold tracking-[-0.03em] text-white">
                {card.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">{card.copy}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="surface-card rounded-[32px] p-6 md:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Estrutura criada
                </p>
                <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-0.03em] text-white">
                  Mapa da fundacao do app
                </h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                {DASHBOARD_NAVIGATION.length} entradas principais
              </span>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {DASHBOARD_NAVIGATION.map((item) => (
                <div
                  key={item.href}
                  className="rounded-[24px] border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-white">
                      {item.title}
                    </span>
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-400">
                      {item.group}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    {item.description}
                  </p>
                  <p className="mt-3 font-mono text-xs text-slate-500">
                    {item.href}
                  </p>
                </div>
              ))}
            </div>
          </article>

            <article className="surface-card rounded-[32px] p-6 md:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Pilares da RB Site
              </p>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-0.03em] text-white">
              Base editorial pronta para guiar o Instagram e o Facebook com foco em conversao.
              </h2>

            <div className="mt-8 flex flex-wrap gap-2.5">
              {RB_CONTENT_PILLARS.map((pillar) => (
                <span
                  key={pillar}
                  className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-sm text-slate-200"
                >
                  {pillar}
                </span>
              ))}
            </div>

            <div className="mt-8 rounded-[24px] border border-amber-300/16 bg-amber-300/8 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-200">
                Direcao de produto
              </p>
              <p className="mt-3 text-sm leading-7 text-amber-50/90">
                O fluxo segue orientado para gerar conteudo, sugerir melhor dia
                e horario, agendar com consistencia visual e conectar
                publicacao real em Instagram e Facebook.
              </p>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
