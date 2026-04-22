import { NextResponse } from "next/server";

import { getAdminSession, unauthorizedApiResponse } from "@/lib/auth/session";
import { listPlannerBoardItems } from "@/services/planner/planner-service";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedApiResponse();
  }

  const items = await listPlannerBoardItems();

  return NextResponse.json({
    success: true,
    data: items,
  });
}
