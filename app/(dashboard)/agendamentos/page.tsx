import { MetaPlannerWorkspace } from "@/components/planning/meta-planner-workspace";
import { listPlannerBoardItems } from "@/services/planner/planner-service";

export const dynamic = "force-dynamic";

export default async function SchedulingPage() {
  const items = await listPlannerBoardItems();

  return <MetaPlannerWorkspace initialItems={items} view="agenda" />;
}
