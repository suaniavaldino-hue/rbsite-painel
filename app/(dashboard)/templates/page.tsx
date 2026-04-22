import Link from "next/link";

export const dynamic = "force-dynamic";

const templateNames = [
  "Post comercial",
  "Post educativo",
  "Carrossel checklist",
  "Carrossel erro x solucao",
  "Reel dor",
  "Reel autoridade",
  "Reel oferta",
  "Prova social",
];

export default function TemplatesPage() {
  return (
    <div className="grid gap-6">
      <section className="surface-card rounded-[32px] p-6 md:p-8">
        <span className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-200">
          Templates
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">
          Biblioteca visual pronta para a camada Canva
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
          Esta area centraliza os blocos reutilizaveis que vao alimentar as
          composicoes futuras com Canva Connect, Stability AI e a identidade da
          RB Site.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {templateNames.map((template) => (
          <article
            key={template}
            className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-200">
              Template
            </p>
            <h2 className="mt-4 font-display text-2xl font-semibold tracking-[-0.03em] text-white">
              {template}
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Estrutura preparada para reaproveitamento nas proximas fases do
              painel.
            </p>
          </article>
        ))}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/integracoes"
          className="inline-flex h-12 items-center justify-center rounded-full bg-amber-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
        >
          Ver integracoes
        </Link>
      </div>
    </div>
  );
}
