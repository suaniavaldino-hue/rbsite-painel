"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoMark } from "@/components/ui/logo-mark";
import { DASHBOARD_NAVIGATION } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils/cn";

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[304px] shrink-0 2xl:w-[320px] xl:block">
      <div className="surface-card sticky top-5 flex max-h-[calc(100vh-2.5rem)] flex-col rounded-[30px] p-4 2xl:p-5">
        <LogoMark className="px-2 pb-5" />

        <div className="mb-5 rounded-[24px] border border-amber-300/14 bg-amber-300/8 px-4 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-200">
            Painel protegido
          </p>
          <p className="mt-3 text-sm leading-6 text-amber-50/90">
            Rotas privadas, APIs internas e testes de integracao ficam liberados
            apenas com sessao administrativa valida.
          </p>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
          {DASHBOARD_NAVIGATION.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-[22px] border px-4 py-3 transition",
                  isActive
                    ? "border-amber-300/28 bg-amber-400/10 text-white shadow-[0_18px_42px_rgb(245_158_11_/_0.08)]"
                    : "border-transparent bg-white/4 text-slate-300 hover:border-white/10 hover:bg-white/7 hover:text-white",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{item.title}</span>
                  <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.24em] text-slate-500">
                    {item.group}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  {item.description}
                </p>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
