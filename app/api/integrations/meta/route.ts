import { NextResponse, type NextRequest } from "next/server";

import { getAdminSession, unauthorizedApiResponse } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/security/audit";
import { getClientIpAddress, getUserAgent } from "@/lib/security/request";
import {
  serializeMetaError,
  testMetaConnection,
} from "@/services/meta/meta-publishing-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);

  if (!session) {
    return unauthorizedApiResponse();
  }

  try {
    const result = await testMetaConnection();

    await logAuditEvent({
      event: "integration.tested",
      actor: {
        id: session.user.id,
        email: session.user.email ?? undefined,
        role: "admin",
        ipAddress: getClientIpAddress(request.headers),
        userAgent: getUserAgent(request.headers),
      },
      target: "meta",
      message: "Teste de integracao Meta executado.",
      metadata: {
        ok: result.ok,
      },
    });

    return NextResponse.json({
      success: result.ok,
      data: result,
    });
  } catch (error) {
    await logAuditEvent({
      event: "integration.test_failed",
      level: "error",
      actor: {
        id: session.user.id,
        email: session.user.email ?? undefined,
        role: "admin",
        ipAddress: getClientIpAddress(request.headers),
        userAgent: getUserAgent(request.headers),
      },
      target: "meta",
      message: "Teste de integracao Meta falhou.",
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
