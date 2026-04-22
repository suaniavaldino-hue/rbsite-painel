import "server-only";

import { env } from "@/lib/utils/env";
import type {
  ContentGenerationRequest,
  ContentGenerationResult,
  GenerationMode,
} from "@/types/content-generation";

import { generateMockContent } from "./mock-content-service";
import { generateOrchestratedContent } from "./ai-orchestrator";
import {
  createGeminiContentServiceFromEnv,
} from "./gemini.service";
import { createOpenAIContentServiceFromEnv } from "./openai.service";

function resolveConfiguredMode(): GenerationMode {
  const configuredMode = process.env.OPENAI_GENERATION_MODE;

  if (
    configuredMode === "auto" ||
    configuredMode === "live" ||
    configuredMode === "mock"
  ) {
    return configuredMode;
  }

  return "auto";
}

function resolveMode(requestMode?: GenerationMode): GenerationMode {
  return requestMode ?? resolveConfiguredMode();
}

export async function generateContent(
  request: ContentGenerationRequest,
): Promise<ContentGenerationResult> {
  const mode = resolveMode(request.mode);
  const openAiService = createOpenAIContentServiceFromEnv();
  const geminiService = createGeminiContentServiceFromEnv();

  const normalizedRequest: ContentGenerationRequest = {
    ...request,
    mode,
  };

  if (mode === "mock") {
    return generateMockContent(normalizedRequest);
  }

  if (!openAiService && !geminiService) {
    if (mode === "live") {
      throw new Error(
        "Nenhum provedor de texto esta configurado para operacao live.",
      );
    }

    return generateMockContent(normalizedRequest, [
      "OpenAI e Gemini nao estao configurados. Retornado fallback local.",
    ]);
  }

  try {
    const orchestrated = await generateOrchestratedContent(normalizedRequest);

    return {
      content: orchestrated.generated,
      meta: {
        source: orchestrated.meta.textProvider,
        mode,
        model: orchestrated.meta.textModel,
        generatedAt: orchestrated.meta.generatedAt,
        usedMockFallback: orchestrated.meta.usedMockFallback,
        warnings: orchestrated.meta.warnings,
        imageProvider: orchestrated.meta.imageProvider,
        designProvider: orchestrated.meta.designProvider,
      },
    };
  } catch (error) {
    if (!normalizedRequest.fallbackToMock) {
      throw error;
    }

    const warning =
      error instanceof Error
        ? `OpenAI generation failed and mock fallback was used: ${error.message}`
        : "OpenAI generation failed and mock fallback was used.";

    return generateMockContent(normalizedRequest, [warning]);
  }
}

export async function testOpenAIConnection() {
  const service = createOpenAIContentServiceFromEnv();

  if (!service) {
    return {
      ok: false,
      provider: "openai",
      mode: resolveConfiguredMode(),
      model: process.env.OPENAI_CONTENT_MODEL ?? "gpt-5.4-mini",
      message: "OPENAI_API_KEY is not configured.",
      appUrl: env.appUrl,
    };
  }

  const online = await service.testConnection();

  return {
    ok: online,
    provider: "openai",
    mode: resolveConfiguredMode(),
    model: process.env.OPENAI_CONTENT_MODEL ?? "gpt-5.4-mini",
    message: online
      ? "OpenAI connection is healthy."
      : "OpenAI connection did not return the expected response.",
    appUrl: env.appUrl,
  };
}
