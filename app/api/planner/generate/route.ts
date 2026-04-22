import { NextResponse } from "next/server";

import { getAdminSession, unauthorizedApiResponse } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/security/audit";
import { assertTrustedRequestOrigin, TrustedOriginError } from "@/lib/security/origin";
import { getClientIpAddress, getUserAgent } from "@/lib/security/request";
import {
  PlannerValidationError,
  parsePlannerGenerationRequest,
} from "@/lib/validations/planner";
import { generatePlannerItems } from "@/services/planner/planner-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedApiResponse();
  }

  try {
    assertTrustedRequestOrigin(request.headers);
    const body = await request.json();
    const payload = parsePlannerGenerationRequest(body);
    const result = await generatePlannerItems(payload);

    await logAuditEvent({
      event: "planner.generated",
      actor: {
        id: session.user.id,
        email: session.user.email ?? undefined,
        role: "admin",
        ipAddress: getClientIpAddress(request.headers),
        userAgent: getUserAgent(request.headers),
      },
      message: "Itens do planner gerados automaticamente.",
      metadata: {
        mode: payload.mode,
        quantity: result.items.length,
        platform: payload.platform,
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
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

    if (error instanceof PlannerValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha inesperada ao gerar os itens do planner.",
      },
      { status: 500 },
    );
  }
}
