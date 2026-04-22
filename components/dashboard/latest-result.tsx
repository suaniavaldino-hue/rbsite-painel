import Image from "next/image";

import type { AiOrchestratorResult } from "@/types/ai";
import type { ContentRecord } from "@/types/content";

type LatestResultProps = {
  latestCreative: AiOrchestratorResult | null;
  fallbackRecord: ContentRecord | null;
  pending?: boolean;
};

export function LatestResult({
  latestCreative,
  fallbackRecord,
  pending = false,
}: LatestResultProps) {
  if (pending) {
    return (
      <article className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6">
        <div className="h-3 w-28 animate-pulse rounded-full bg-white/10" />
        <div className="mt-5 h-10 w-2/3 animate-pulse rounded-2xl bg-white/10" />
        <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-white/10" />
        <div className="mt-3 h-4 w-5/6 animate-pulse rounded-full bg-white/10" />
        <div className="mt-6 h-56 animate-pulse rounded-[26px] bg-white/10" />
      </article>
    );
  }

  if (latestCreative) {
    return (
      <article className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] shadow-[0_18px_48px_rgb(2_6_23_/_0.22)]">
        <div className="grid gap-6 p-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-200">
              Ultimo conteudo gerado
            </p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em] text-white">
              {latestCreative.title}
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-300">
              {latestCreative.content}
            </p>

            <div className="mt-6 grid gap-3 rounded-[24px] border border-white/10 bg-slate-950/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Legenda principal
              </p>
              <p className="text-sm leading-7 text-slate-200">
                {latestCreative.caption}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {latestCreative.hashtags.slice(0, 8).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-3">
            <Image
              src={latestCreative.image_url}
              alt={latestCreative.title}
              width={880}
              height={880}
              unoptimized
              className="h-full min-h-[20rem] w-full rounded-[22px] object-cover"
            />
          </div>
        </div>
      </article>
    );
  }

  if (!fallbackRecord) {
    return (
      <article className="rounded-[30px] border border-dashed border-white/12 bg-white/[0.045] p-6 text-sm leading-7 text-slate-300">
        O dashboard ainda nao recebeu um conteudo persistido. Gere o primeiro
        post para preencher a area de resultado mais recente.
      </article>
    );
  }

  return (
    <article className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
        Ultimo conteudo salvo
      </p>
      <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em] text-white">
        {fallbackRecord.title}
      </h2>
      <p className="mt-4 text-base leading-8 text-slate-300">
        {fallbackRecord.content}
      </p>
    </article>
  );
}
