type EmptyStateProps = {
  title: string;
  copy: string;
};

export function EmptyState({ title, copy }: EmptyStateProps) {
  return (
    <div className="rounded-[28px] border border-dashed border-white/12 bg-white/5 px-6 py-8 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
        Estado vazio
      </p>
      <h3 className="mt-4 font-display text-2xl font-semibold tracking-[-0.03em] text-white">
        {title}
      </h3>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-300">
        {copy}
      </p>
    </div>
  );
}
