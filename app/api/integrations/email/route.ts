import { NextResponse } from "next/server";

import { getAdminSession, unauthorizedApiResponse } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/security/audit";
import { getClientIpAddress, getUserAgent } from "@/lib/security/request";
import {
  sendTransactionalEmail,
  verifySmtpConnection,
} from "@/services/email/smtp-service";

export const runtime = "nodejs";

function buildTestEmailHtml(email: string) {
  return `
    <div style="font-family:Arial,sans-serif;background:#f5f7fb;padding:24px;color:#162a41">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:24px;padding:32px;border:1px solid rgba(22,42,65,0.08)">
        <p style="font-size:12px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:#f08129;margin:0 0 12px">RB Site Social Automation</p>
        <h1 style="font-size:28px;line-height:1.1;margin:0 0 16px;color:#162a41">Teste real de email</h1>
        <p style="font-size:16px;line-height:1.7;margin:0 0 20px;color:#5b6b7b">
          Este email confirma que o SMTP do painel RB Site conseguiu autenticar e enviar uma mensagem real para <strong>${email}</strong>.
        </p>
        <p style="font-size:14px;line-height:1.7;margin:16px 0 0;color:#5b6b7b">
          Data do teste: <strong>${new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "medium",
            timeZone: "America/Sao_Paulo",
          }).format(new Date())}</strong>.
        </p>
      </div>
    </div>
  `;
}

export async function GET(request: Request) {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedApiResponse();
  }

  try {
    const result = await verifySmtpConnection();

    await logAuditEvent({
      event: "integration.tested",
      actor: {
        id: session.user.id,
        email: session.user.email ?? undefined,
        role: "admin",
        ipAddress: getClientIpAddress(request.headers),
        userAgent: getUserAgent(request.headers),
      },
      target: "smtp",
      message: "Teste de conexao SMTP executado.",
      metadata: {
        ok: result.ok,
      },
    });

    return NextResponse.json({
      success: result.ok,
      data: {
        ...result,
        previewOtpEnabled: process.env.AUTH_EMAIL_OTP_PREVIEW === "true",
        previewResetEnabled:
          process.env.AUTH_SHOW_RESET_TOKEN_PREVIEW === "true",
      },
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
      target: "smtp",
      message: "Teste de conexao SMTP falhou.",
    });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha inesperada ao verificar o SMTP.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedApiResponse();
  }

  const targetEmail = session.user.email?.trim() || process.env.AUTH_ADMIN_EMAIL?.trim();

  if (!targetEmail) {
    return NextResponse.json(
      {
        success: false,
        error: "Nenhum email administrativo esta disponivel para teste.",
      },
      { status: 400 },
    );
  }

  try {
    await sendTransactionalEmail({
      to: targetEmail,
      subject: "Teste SMTP do painel RB Site",
      text: [
        "Este email confirma que o SMTP do painel RB Site enviou uma mensagem real.",
        "",
        `Destino: ${targetEmail}`,
        `Data: ${new Date().toISOString()}`,
      ].join("\n"),
      html: buildTestEmailHtml(targetEmail),
    });

    await logAuditEvent({
      event: "integration.tested",
      actor: {
        id: session.user.id,
        email: session.user.email ?? undefined,
        role: "admin",
        ipAddress: getClientIpAddress(request.headers),
        userAgent: getUserAgent(request.headers),
      },
      target: "smtp",
      message: "Email real de teste SMTP enviado.",
      metadata: {
        to: targetEmail,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        provider: "smtp",
        to: targetEmail,
        message: `Email de teste enviado para ${targetEmail}.`,
        previewOtpEnabled: process.env.AUTH_EMAIL_OTP_PREVIEW === "true",
        previewResetEnabled:
          process.env.AUTH_SHOW_RESET_TOKEN_PREVIEW === "true",
      },
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
      target: "smtp",
      message: "Envio real de teste SMTP falhou.",
    });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha inesperada ao enviar o email de teste.",
      },
      { status: 500 },
    );
  }
}
