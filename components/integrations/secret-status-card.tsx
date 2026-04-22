import type { ReactNode } from "react";

type SecretStatusCardProps = {
  title: string;
  description: string;
  value: string;
  configured: boolean;
  connectionLabel?: string;
  connectionTone?: "default" | "success" | "error" | "warning";
  metadata?: string;
  action?: ReactNode;
};

export function SecretStatusCard({
  title,
  description,
  value,
  configured,
  connectionLabel,
  connectionTone = "default",
  metadata,
  action,
}: SecretStatusCardProps) {
  const connectionClasses =
    connectionTone === "success"
      ? "border-emerald-400/18 bg-emerald-500/10 text-emerald-100"
      : connectionTone === "error"
        ? "border-rose-300/18 bg-rose-400/10 text-rose-100"
        : connectionTone === "warning"
          ? "border-amber-300/18 bg-amber-400/10 text-amber-100"
          : "border-white/10 bg-white/6 text-slate-300";

  return (
    <article className="surface-card rounded-[28px] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            {title}
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-300">{description}</p>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${
            configured
              ? "border-emerald-400/18 bg-emerald-500/10 text-emerald-100"
              : "border-white/10 bg-white/6 text-slate-300"
          }`}
        >
          {configured ? "configurado" : "pendente"}
        </span>
      </div>

      <div className="mt-6 rounded-[22px] border border-white/10 bg-slate-950/50 px-4 py-4 font-mono text-sm text-slate-100">
        {value}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${connectionClasses}`}
        >
          {connectionLabel ?? "sem teste"}
        </span>

        {action}
      </div>

      {metadata ? (
        <p className="mt-4 text-sm leading-7 text-slate-300">{metadata}</p>
      ) : null}
    </article>
  );
}
