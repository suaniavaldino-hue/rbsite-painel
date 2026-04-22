import Image from "next/image";

import { cn } from "@/lib/utils/cn";

type LogoMarkProps = {
  className?: string;
  compact?: boolean;
};

export function LogoMark({ className, compact = false }: LogoMarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative h-11 w-11 overflow-hidden rounded-2xl bg-white/8 shadow-[0_18px_40px_rgb(240_129_41_/_0.22)] ring-1 ring-white/10">
        <Image
          src="/brand/rbsite-favicon.png"
          alt="RB Site"
          fill
          sizes="44px"
          className="object-cover"
          priority
        />
      </div>

      {!compact ? (
        <div className="flex flex-col">
          <span className="font-display text-base font-semibold tracking-[-0.03em] text-white">
            RB Site
          </span>
          <span className="text-xs uppercase tracking-[0.28em] text-slate-400">
            Social Automation
          </span>
        </div>
      ) : null}
    </div>
  );
}
