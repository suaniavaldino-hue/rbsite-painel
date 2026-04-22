import Link from "next/link";

export const dynamic = "force-dynamic";

export default function CaptionsPage() {
  return (
    <div className="grid gap-6">
      <section className="surface-card rounded-[32px] p-6 md:p-8">
        <span className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-200">
          Legendas
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">
          Biblioteca de legendas em consolidacao
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
          O novo data layer ja centraliza os registros principais. A persistencia
          detalhada de legenda por plataforma e o proximo passo da evolucao do
          schema no Supabase.
        </p>
      </section>

      <section className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6">
        <p className="text-sm leading-8 text-slate-300">
          Neste momento, o painel ja gera legendas distintas para Instagram e
          Facebook, mas o schema legado da tabela `contents` ainda armazena o
          resumo principal. A proxima iteracao amplia as colunas dedicadas sem
          quebrar o que ja esta em producao.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/planejamento"
            className="inline-flex h-12 items-center justify-center rounded-full bg-amber-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
          >
            Gerar no planner
          </Link>
          <Link
            href="/integracoes"
            className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Ver integracoes
          </Link>
        </div>
      </section>
    </div>
  );
}
