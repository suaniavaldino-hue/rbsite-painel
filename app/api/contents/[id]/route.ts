import { NextResponse } from "next/server";

import { getAdminSession, unauthorizedApiResponse } from "@/lib/auth/session";
import { assertTrustedRequestOrigin, TrustedOriginError } from "@/lib/security/origin";
import { sanitizeOptionalText } from "@/lib/security/sanitize";
import {
  getContentById,
  updateContent,
} from "@/services/database/content-repository";
import type { ContentStatus } from "@/types/content";
import type { ContentFormat } from "@/types/content-generation";

const allowedTypes: ContentFormat[] = ["post", "carousel", "reel"];
const allowedStatuses: ContentStatus[] = [
  "draft",
  "planned",
  "scheduled",
  "published",
  "failed",
];

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedApiResponse();
  }

  const params = await context.params;
  const item = await getContentById(params.id);

  if (!item) {
    return NextResponse.json(
      {
        success: false,
        error: "Conteudo nao encontrado.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    data: item,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedApiResponse();
  }

  try {
    assertTrustedRequestOrigin(request.headers);
    const body = (await request.json()) as Record<string, unknown>;
    const params = await context.params;
    const nextTitle = sanitizeOptionalText(body.title, 180);
    const nextContent = sanitizeOptionalText(body.content, 2000);
    const nextType =
      typeof body.type === "string" && allowedTypes.includes(body.type as ContentFormat)
        ? (body.type as ContentFormat)
        : undefined;
    const nextStatus =
      typeof body.status === "string" &&
      allowedStatuses.includes(body.status as ContentStatus)
        ? (body.status as ContentStatus)
        : undefined;

    const item = await updateContent(params.id, {
      title: nextTitle,
      content: nextContent,
      type: nextType,
      status: nextStatus,
    });

    if (!item) {
      return NextResponse.json(
        {
          success: false,
          error: "Conteudo nao encontrado.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error) {
    if (error instanceof TrustedOriginError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 403 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha inesperada ao atualizar o conteudo.",
      },
      { status: 500 },
    );
  }
}
