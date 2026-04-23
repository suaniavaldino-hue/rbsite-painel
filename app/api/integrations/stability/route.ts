import { NextResponse, type NextRequest } from "next/server";

import { getAdminSession, unauthorizedApiResponse } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/security/audit";
import { getClientIpAddress, getUserAgent } from "@/lib/security/request";
import {
  createStabilityImageServiceFromEnv,
  StabilityImageServiceError,
} from "@/services/ai/stability.service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);

  if (!session) {
    return unauthorizedApiResponse();
  }

  try {
    const service = createStabilityImageServiceFromEnv();

    if (!service) {
      return NextResponse.json({
        success: false,
        error: "STABILITY_API_KEY nao configurada.",
      });
    }

    const online = await service.testConnection();

    await logAuditEvent({
      event: "integration.tested",
      actor: {
        id: session.user.id,
        email: session.user.email ?? undefined,
        role: "admin",
        ipAddress: getClientIpAddress(request.headers),
        userAgent: getUserAgent(request.headers),
      },
      target: "stability",
      message: "Teste de integracao Stability executado.",
      metadata: {
        ok: online,
      },
    });

    return NextResponse.json({
      success: online,
      data: {
        ok: online,
        provider: "stability",
        model: process.env.STABILITY_IMAGE_MODEL ?? "core",
        message:
          "Stability gerou uma imagem de teste com sucesso. O teste consome creditos do provedor.",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof StabilityImageServiceError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Falha inesperada ao testar Stability.",
      },
      { status: 500 },
    );
  }
}
