import Link from "next/link";

import type { ContentRecord } from "@/types/content";

import { EmptyState } from "./empty-state";
import { PostCard } from "./post-card";

type ContentLibrarySectionProps = {
  kicker: string;
  title: string;
  description: string;
  items: ContentRecord[];
  emptyTitle: string;
  emptyCopy: string;
};

export function ContentLibrarySection({
  kicker,
  title,
  description,
  items,
  emptyTitle,
  emptyCopy,
}: ContentLibrarySectionProps) {
  return (
    <div className="grid gap-6">
      <section className="surface-card rounded-[32px] p-6 md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-200">
              {kicker}
            </span>
            <h1 className="mt-5 font-display text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
              {description}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center justify-center rounded-full bg-amber-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              Voltar ao dashboard
            </Link>
            <Link
              href="/planejamento"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Abrir planner
            </Link>
          </div>
        </div>
      </section>

      {items.length > 0 ? (
        <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {items.map((item) => (
            <PostCard key={item.id} item={item} />
          ))}
        </section>
      ) : (
        <EmptyState title={emptyTitle} copy={emptyCopy} />
      )}
    </div>
  );
}
