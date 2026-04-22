import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { getRecentAuditLogs } from "@/lib/security/audit";
import { listContents } from "@/services/database/content-repository";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [recentAuditLogs, initialContents] = await Promise.all([
    getRecentAuditLogs(5),
    listContents({
      limit: 18,
      order: "newest",
    }),
  ]);

  return (
    <DashboardOverview
      initialContents={initialContents}
      recentAuditLogs={recentAuditLogs}
    />
  );
}
