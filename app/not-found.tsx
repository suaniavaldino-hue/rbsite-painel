import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="surface-card w-full max-w-xl rounded-[32px] p-8 text-center">
        <div className="mb-4 inline-flex rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.3em] text-amber-200">
          Rota nao encontrada
        </div>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-white">
          Esta pagina ainda nao existe no painel.
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          A estrutura base foi preparada na ETAPA 2. As telas completas serao
          adicionadas nas proximas fases mantendo a arquitetura ja definida.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
        >
          Voltar para a base do projeto
        </Link>
      </div>
    </main>
  );
}
