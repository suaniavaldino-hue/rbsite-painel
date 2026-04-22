import Image from "next/image";

import type { ContentRecord } from "@/types/content";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusTone(status: ContentRecord["status"]) {
  if (status === "published") {
    return "border-emerald-300/18 bg-emerald-400/10 text-emerald-100";
  }

  if (status === "scheduled" || status === "planned") {
    return "border-sky-300/18 bg-sky-400/10 text-sky-100";
  }

  if (status === "failed") {
    return "border-rose-300/18 bg-rose-400/10 text-rose-100";
  }

  return "border-amber-300/18 bg-amber-300/10 text-amber-100";
}

function typeLabel(type: ContentRecord["type"]) {
  if (type === "carousel") {
    return "Carrossel";
  }

  if (type === "reel") {
    return "Reel";
  }

  return "Post";
}

type PostCardProps = {
  item: ContentRecord;
};

export function PostCard({ item }: PostCardProps) {
  return (
    <article className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] shadow-[0_18px_48px_rgb(2_6_23_/_0.22)]">
      <div className="relative aspect-[1.12/1] border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(254,119,11,0.22),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-end bg-[radial-gradient(circle_at_top_right,rgba(254,119,11,0.28),transparent_30%),linear-gradient(135deg,#0d1e31,#081726)] p-5">
            <p className="max-w-[16rem] font-display text-2xl font-semibold tracking-[-0.03em] text-white">
              {item.title}
            </p>
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
          <span className="rounded-full border border-white/12 bg-slate-950/65 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white">
            {typeLabel(item.type)}
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${statusTone(item.status)}`}
          >
            {item.status}
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            {item.theme ?? "Conteudo RB Site"}
          </p>
          <span className="text-xs text-slate-500">{formatDate(item.createdAt)}</span>
        </div>

        <h3 className="mt-4 font-display text-2xl font-semibold tracking-[-0.03em] text-white">
          {item.title}
        </h3>

        <p className="mt-4 text-sm leading-7 text-slate-300">{item.content}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {item.platform ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              {item.platform === "both"
                ? "Instagram + Facebook"
                : item.platform === "instagram"
                  ? "Instagram"
                  : "Facebook"}
            </span>
          ) : null}

          {item.provider ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              {item.provider}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
