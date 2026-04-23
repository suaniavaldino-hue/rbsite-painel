import { NextResponse, type NextRequest } from "next/server";

import { getAdminSession, unauthorizedApiResponse } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/security/audit";
import { getClientIpAddress, getUserAgent } from "@/lib/security/request";
import { createCanvaServiceFromEnv } from "@/services/ai/canva.service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);

  if (!session) {
    return unauthorizedApiResponse();
  }

  try {
    const service = createCanvaServiceFromEnv();

    if (!service) {
      return NextResponse.json({
        success: false,
        error: "CANVA_ACCESS_TOKEN nao configurado.",
      });
    }

    const response = await service.testConnection();

    await logAuditEvent({
      event: "integration.tested",
      actor: {
        id: session.user.id,
        email: session.user.email ?? undefined,
        role: "admin",
        ipAddress: getClientIpAddress(request.headers),
        userAgent: getUserAgent(request.headers),
      },
      target: "canva",
      message: "Teste de integracao Canva executado.",
      metadata: {
        ok: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ok: true,
        provider: "canva",
        model: "connect-api",
        message: `Canva respondeu com ${response.capabilities?.length ?? 0} capability(s) disponivel(is).`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha inesperada ao testar Canva.",
      },
      { status: 500 },
    );
  }
}
