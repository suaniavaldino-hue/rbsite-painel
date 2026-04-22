import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { getRecentAuditLogs } from "@/lib/security/audit";
import { listContents } from "@/services/database/content-repository";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [auditLogsResult, contentsResult] = await Promise.allSettled([
    getRecentAuditLogs(5),
    listContents({
      limit: 18,
      order: "newest",
    }),
  ]);

  const recentAuditLogs =
    auditLogsResult.status === "fulfilled" ? auditLogsResult.value : [];
  const initialContents =
    contentsResult.status === "fulfilled" ? contentsResult.value : [];

  return (
    <DashboardOverview
      initialContents={initialContents}
      recentAuditLogs={recentAuditLogs}
    />
  );
}
