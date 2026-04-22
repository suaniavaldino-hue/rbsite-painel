import Link from "next/link";

export const dynamic = "force-dynamic";

export default function HashtagsPage() {
  return (
    <div className="grid gap-6">
      <section className="surface-card rounded-[32px] p-6 md:p-8">
        <span className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-200">
          Hashtags
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">
          Motor de hashtags pronto para o proximo schema
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
          A nova camada multi-IA ja gera hashtags separadas para Instagram e
          Facebook. A exibicao dedicada aqui sera conectada ao schema expandido
          do conteudo persistido.
        </p>
      </section>

      <section className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6">
        <p className="text-sm leading-8 text-slate-300">
          Instagram trabalha com ate 15 hashtags por geracao e Facebook com ate
          8, seguindo as regras definidas para a RB Site. O modulo visual desta
          area entra na etapa seguinte da consolidacao do banco.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center justify-center rounded-full bg-amber-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
          >
            Voltar ao dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
