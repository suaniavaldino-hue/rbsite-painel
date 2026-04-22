export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="hero-glow left-[-10rem] top-[-8rem] h-72 w-72 bg-amber-500/18" />
      <div className="hero-glow right-[-4rem] top-20 h-64 w-64 bg-orange-400/14" />
      <div className="hero-glow bottom-[-9rem] left-1/3 h-80 w-80 bg-amber-300/10" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
}
