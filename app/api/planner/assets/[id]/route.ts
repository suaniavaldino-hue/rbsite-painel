import { NextResponse } from "next/server";

import { getPlannerItemById } from "@/lib/planner/store";
import { renderPlannerAssetSvg } from "@/services/planner/planner-art-service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
  const params = await context.params;
  const item = await getPlannerItemById(params.id);

  if (!item) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const slideParam = url.searchParams.get("slide");
  const slide = slideParam ? Number(slideParam) : undefined;
  const svg = renderPlannerAssetSvg(
    item,
    Number.isFinite(slide) ? slide : undefined,
  );

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
