import { NextResponse } from "next/server";

import { getAdminSession, unauthorizedApiResponse } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/security/audit";
import { assertTrustedRequestOrigin, TrustedOriginError } from "@/lib/security/origin";
import { getClientIpAddress, getUserAgent } from "@/lib/security/request";
import {
  PlannerValidationError,
  parsePlannerScheduleUpdate,
} from "@/lib/validations/planner";
import { updatePlannerSchedule } from "@/services/planner/planner-service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext) {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedApiResponse();
  }

  try {
    assertTrustedRequestOrigin(request.headers);
    const params = await context.params;
    const body = await request.json();
    const payload = parsePlannerScheduleUpdate(body);
    const item = await updatePlannerSchedule(params.id, payload.scheduledFor);

    if (!item) {
      return NextResponse.json(
        {
          success: false,
          error: "Item do planner nao encontrado.",
        },
        { status: 404 },
      );
    }

    await logAuditEvent({
      event: "planner.rescheduled",
      actor: {
        id: session.user.id,
        email: session.user.email ?? undefined,
        role: "admin",
        ipAddress: getClientIpAddress(request.headers),
        userAgent: getUserAgent(request.headers),
      },
      message: "Item do planner reagendado manualmente.",
      metadata: {
        itemId: params.id,
        scheduledFor: payload.scheduledFor,
      },
    });

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
            : "Falha inesperada ao reagendar o item.",
      },
      { status: 500 },
    );
  }
}
