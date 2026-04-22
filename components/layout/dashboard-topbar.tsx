import { SignOutButton } from "@/components/auth/sign-out-button";

type DashboardTopbarProps = {
  userName: string;
  userEmail: string;
};

export function DashboardTopbar({
  userName,
  userEmail,
}: DashboardTopbarProps) {
  return (
    <header className="surface-card rounded-[28px] px-5 py-4 md:px-6 lg:px-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Acesso administrativo
          </p>
          <h2 className="mt-2 font-display text-xl font-semibold tracking-[-0.04em] text-white md:text-[1.75rem]">
            RB Site Social Automation
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Operacao segura, geracao assistida por IA e fila editorial centralizada.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5">
            <p className="text-xs text-slate-400">{userName}</p>
            <p className="mt-1 text-sm font-medium text-white">{userEmail}</p>
          </div>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
