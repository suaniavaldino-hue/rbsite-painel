import { NextResponse } from "next/server";

import { getAdminSession, unauthorizedApiResponse } from "@/lib/auth/session";
import { sanitizeOptionalText } from "@/lib/security/sanitize";
import { listContents } from "@/services/database/content-repository";
import type { ContentStatus } from "@/types/content";
import type { ContentFormat } from "@/types/content-generation";

const allowedTypes: Array<ContentFormat | "all"> = [
  "all",
  "post",
  "carousel",
  "reel",
];
const allowedStatuses: Array<ContentStatus | "all"> = [
  "all",
  "draft",
  "planned",
  "scheduled",
  "published",
  "failed",
];

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedApiResponse();
  }

  const { searchParams } = new URL(request.url);
  const search = sanitizeOptionalText(searchParams.get("search"), 120);
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const limit = Number(searchParams.get("limit") ?? "24");
  const order = searchParams.get("order") === "oldest" ? "oldest" : "newest";

  const items = await listContents({
    search,
    type: allowedTypes.includes(type as ContentFormat | "all")
      ? (type as ContentFormat | "all" | undefined)
      : "all",
    status: allowedStatuses.includes(status as ContentStatus | "all")
      ? (status as ContentStatus | "all" | undefined)
      : "all",
    limit: Number.isFinite(limit) ? Math.max(1, Math.min(limit, 100)) : 24,
    order,
  });

  return NextResponse.json({
    success: true,
    data: items,
  });
}
