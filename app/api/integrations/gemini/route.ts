import { NextResponse } from "next/server";

import { getAdminSession, unauthorizedApiResponse } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/security/audit";
import { getClientIpAddress, getUserAgent } from "@/lib/security/request";
import { createGeminiContentServiceFromEnv } from "@/services/ai/gemini.service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedApiResponse();
  }

  try {
    const service = createGeminiContentServiceFromEnv();

    if (!service) {
      return NextResponse.json({
        success: false,
        error: "GEMINI_API_KEY nao configurada.",
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
      target: "gemini",
      message: "Teste de integracao Gemini executado.",
      metadata: {
        ok: online,
      },
    });

    return NextResponse.json({
      success: online,
      data: {
        ok: online,
        provider: "gemini",
        model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
        message: online
          ? "Gemini respondeu corretamente ao healthcheck."
          : "Gemini nao retornou a resposta esperada.",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha inesperada ao testar Gemini.",
      },
      { status: 500 },
    );
  }
}
