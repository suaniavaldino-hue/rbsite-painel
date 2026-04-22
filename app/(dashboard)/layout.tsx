import type { ReactNode } from "react";

import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { AmbientBackground } from "@/components/ui/ambient-background";
import { requireAdminPageSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const session = await requireAdminPageSession("/dashboard");

  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      <AmbientBackground />

      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-6 px-4 py-4 md:px-6 md:py-6">
        <DashboardSidebar />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <DashboardTopbar
            userName={session.user.name ?? "Administrador RB Site"}
            userEmail={session.user.email ?? "contato@rbsite.com.br"}
          />

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
