import { NextResponse, type NextRequest } from "next/server";

import { executeGenerateContent } from "@/actions/contents/generate-content";
import { getAdminSession, unauthorizedApiResponse } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/security/audit";
import { assertTrustedRequestOrigin, TrustedOriginError } from "@/lib/security/origin";
import { getClientIpAddress, getUserAgent } from "@/lib/security/request";
import {
  ContentGenerationValidationError,
} from "@/lib/validations/content-generation";
import { ContentGenerationServiceError } from "@/services/ai/content-generation-validators";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);

  if (!session) {
    return unauthorizedApiResponse();
  }

  try {
    assertTrustedRequestOrigin(request.headers);
    const body = await request.json();
    const result = await executeGenerateContent(body);

    await logAuditEvent({
      event: "content.generated",
      actor: {
        id: session.user.id,
        email: session.user.email ?? undefined,
        role: "admin",
        ipAddress: getClientIpAddress(request.headers),
        userAgent: getUserAgent(request.headers),
      },
      message: "Conteudo gerado pelo backend interno.",
      metadata: {
        format: result.request.format,
        platform: result.request.platform,
        mode: result.request.mode ?? "auto",
        provider: result.record.provider ?? "n/a",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        generated: result.generated,
        creative: result.creative,
        record: result.record,
      },
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

    if (
      error instanceof ContentGenerationValidationError ||
      error instanceof ContentGenerationServiceError
    ) {
      await logAuditEvent({
        event: "content.generation_failed",
        level: "warn",
        actor: {
          id: session.user.id,
          email: session.user.email ?? undefined,
          role: "admin",
          ipAddress: getClientIpAddress(request.headers),
          userAgent: getUserAgent(request.headers),
        },
        message: "Falha validada na geracao de conteudo.",
        metadata: {
          reason: error.message,
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 },
      );
    }

    await logAuditEvent({
      event: "content.generation_failed",
      level: "error",
      actor: {
        id: session.user.id,
        email: session.user.email ?? undefined,
        role: "admin",
        ipAddress: getClientIpAddress(request.headers),
        userAgent: getUserAgent(request.headers),
      },
      message: "Erro inesperado na geracao de conteudo.",
      metadata: {
        reason: error instanceof Error ? error.message : "unknown",
      },
    });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected content generation error.",
      },
      { status: 500 },
    );
  }
}
