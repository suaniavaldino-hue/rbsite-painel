import { NextResponse } from "next/server";

import { getAdminSession, unauthorizedApiResponse } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/security/audit";
import { getClientIpAddress, getUserAgent } from "@/lib/security/request";
import { testOpenAIConnection } from "@/services/ai/content-generation-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedApiResponse();
  }

  try {
    const result = await testOpenAIConnection();

    await logAuditEvent({
      event: "integration.tested",
      actor: {
        id: session.user.id,
        email: session.user.email ?? undefined,
        role: "admin",
        ipAddress: getClientIpAddress(request.headers),
        userAgent: getUserAgent(request.headers),
      },
      target: "openai",
      message: "Teste de integracao OpenAI executado.",
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
      target: "openai",
      message: "Teste de integracao OpenAI falhou.",
    });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected OpenAI integration error.",
      },
      { status: 500 },
    );
  }
}
