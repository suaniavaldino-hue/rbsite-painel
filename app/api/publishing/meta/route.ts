import { NextResponse } from "next/server";

import { getAdminSession, unauthorizedApiResponse } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/security/audit";
import { assertTrustedRequestOrigin, TrustedOriginError } from "@/lib/security/origin";
import { getClientIpAddress, getUserAgent } from "@/lib/security/request";
import {
  MetaPublishingValidationError,
  parseMetaPublicationRequest,
} from "@/lib/validations/meta-publishing";
import {
  MetaPublishingServiceError,
  dispatchMetaPublication,
  serializeMetaError,
} from "@/services/meta/meta-publishing-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedApiResponse();
  }

  try {
    assertTrustedRequestOrigin(request.headers);
    const body = await request.json();
    const payload = parseMetaPublicationRequest(body);
    const result = await dispatchMetaPublication(payload);

    await logAuditEvent({
      event: "publication.dispatched",
      actor: {
        id: session.user.id,
        email: session.user.email ?? undefined,
        role: "admin",
        ipAddress: getClientIpAddress(request.headers),
        userAgent: getUserAgent(request.headers),
      },
      target: payload.platform,
      message: "Operacao de publicacao para Meta executada.",
      metadata: {
        platform: payload.platform,
        mediaType: payload.mediaType,
        status: result.status,
        deliveryMode: result.deliveryMode,
      },
    });

    return NextResponse.json({
      success: result.status !== "failed",
      data: result,
    });
  } catch (error) {
    if (error instanceof TrustedOriginError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error.message,
            provider: "meta",
          },
        },
        { status: 403 },
      );
    }

    if (
      error instanceof MetaPublishingValidationError ||
      error instanceof MetaPublishingServiceError
    ) {
      await logAuditEvent({
        event: "publication.failed",
        level: "warn",
        actor: {
          id: session.user.id,
          email: session.user.email ?? undefined,
          role: "admin",
          ipAddress: getClientIpAddress(request.headers),
          userAgent: getUserAgent(request.headers),
        },
        target: "meta",
        message: "Falha validada na operacao de publicacao.",
        metadata: {
          reason: error.message,
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            message: error.message,
            provider: "meta",
          },
        },
        { status: 400 },
      );
    }

    await logAuditEvent({
      event: "publication.failed",
      level: "error",
      actor: {
        id: session.user.id,
        email: session.user.email ?? undefined,
        role: "admin",
        ipAddress: getClientIpAddress(request.headers),
        userAgent: getUserAgent(request.headers),
      },
      target: "meta",
      message: "Erro inesperado na operacao de publicacao.",
      metadata: {
        reason: error instanceof Error ? error.message : "unknown",
      },
    });

    return NextResponse.json(
      {
        success: false,
        error: serializeMetaError(error),
      },
      { status: 500 },
    );
  }
}
