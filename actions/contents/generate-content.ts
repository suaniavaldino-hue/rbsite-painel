"use server";

import { getAdminSession } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/security/audit";
import { parseContentGenerationRequest } from "@/lib/validations/content-generation";
import { generateOrchestratedContent } from "@/services/ai/ai-orchestrator";
import {
  buildContentSummaryText,
  createContent,
} from "@/services/database/content-repository";
import type { ContentSource } from "@/types/content";
import type {
  ContentGenerationRequest,
  ContentGenerationResult,
} from "@/types/content-generation";

type GenerateContentExecutionOptions = {
  contentId?: string;
  source?: ContentSource;
  status?: "draft" | "scheduled" | "published" | "failed" | "planned";
};

export type GenerateContentExecutionResult = {
  request: ContentGenerationRequest;
  generated: ContentGenerationResult;
  creative: Awaited<ReturnType<typeof generateOrchestratedContent>>;
  record: Awaited<ReturnType<typeof createContent>>;
};

export async function executeGenerateContent(
  payload: unknown,
  options: GenerateContentExecutionOptions = {},
): Promise<GenerateContentExecutionResult> {
  const request = parseContentGenerationRequest(payload);
  const creative = await generateOrchestratedContent(request);

  const generated: ContentGenerationResult = {
    content: creative.generated,
    meta: {
      source: creative.meta.textProvider,
      mode: request.mode ?? "auto",
      model: creative.meta.textModel,
      generatedAt: creative.meta.generatedAt,
      usedMockFallback: creative.meta.usedMockFallback,
      warnings: creative.meta.warnings,
      imageProvider: creative.meta.imageProvider,
      designProvider: creative.meta.designProvider,
    },
  };

  const record = await createContent({
    id: options.contentId,
    title: creative.title,
    type: request.format,
    content: buildContentSummaryText({
      subtitle: creative.content,
      facebookCaption: creative.captions.facebook,
      instagramCaption: creative.captions.instagram,
    }),
    status: options.status ?? "draft",
    theme: request.theme,
    objective: request.objective,
    platform: request.platform,
    funnelStage: request.funnelStage,
    caption: creative.caption,
    hashtags: creative.hashtags,
    imageUrl: creative.image_url,
    provider: `${creative.meta.textProvider}/${creative.meta.imageProvider}`,
    source: options.source ?? "manual",
  });

  return {
    request,
    generated,
    creative,
    record,
  };
}

export async function generateContentAction(payload: unknown) {
  const session = await getAdminSession();

  if (!session) {
    throw new Error("Authentication required.");
  }

  const result = await executeGenerateContent(payload);

  await logAuditEvent({
    event: "content.generated",
    actor: {
      id: session.user.id,
      email: session.user.email ?? undefined,
      role: "admin",
    },
    message: "Conteudo gerado via Server Action central.",
    metadata: {
      format: result.request.format,
      platform: result.request.platform,
      provider: result.record.provider ?? "n/a",
    },
  });

  return result;
}
