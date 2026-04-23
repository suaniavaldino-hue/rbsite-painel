import { NextResponse, type NextRequest } from "next/server";

import { getAdminSession, unauthorizedApiResponse } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/security/audit";
import { getClientIpAddress, getUserAgent } from "@/lib/security/request";
import {
  createGeminiContentServiceFromEnv,
  getGeminiRuntimeConfigFromEnv,
} from "@/services/ai/gemini.service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);

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

    const runtimeConfig = getGeminiRuntimeConfigFromEnv();
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
        model: runtimeConfig?.primaryModel ?? "gemini-2.5-flash",
        fallbackModels: runtimeConfig?.fallbackModels ?? [],
      },
    });

    return NextResponse.json({
      success: online,
      data: {
        ok: online,
        provider: "gemini",
        model: runtimeConfig?.primaryModel ?? "gemini-2.5-flash",
        fallbackModels: runtimeConfig?.fallbackModels ?? [],
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
