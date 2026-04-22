export default function Loading() {
  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="h-10 w-56 animate-pulse rounded-full bg-white/10" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-[28px] border border-white/10 bg-white/6"
            />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="h-[24rem] animate-pulse rounded-[32px] border border-white/10 bg-white/6" />
          <div className="h-[24rem] animate-pulse rounded-[32px] border border-white/10 bg-white/6" />
        </div>
      </div>
    </main>
  );
}
