import "server-only";

import type {
  AiOrchestratorRequest,
  AiOrchestratorResult,
  ImageGenerationResult,
} from "@/types/ai";
import type { ContentGenerationResult } from "@/types/content-generation";

import { generateMockContent } from "./mock-content-service";
import { createCanvaServiceFromEnv } from "./canva.service";
import { createGeminiContentServiceFromEnv } from "./gemini.service";
import { createOpenAIContentServiceFromEnv } from "./openai.service";
import { buildPosterRenderUrl } from "./poster-composer";
import { createPixabayImageServiceFromEnv } from "./pixabay.service";
import {
  createStabilityImageServiceFromEnv,
  StabilityImageServiceError,
} from "./stability.service";

function buildMockImageResult(
  request: AiOrchestratorRequest,
  generated: ContentGenerationResult["content"],
): ImageGenerationResult {
  const posterUrl = buildPosterRenderUrl({
    format: request.format,
    title: generated.title,
    subtitle: generated.subtitle,
    hook: generated.hook,
    artText: generated.artText,
  });

  return {
    imageUrl: posterUrl,
    shareImageUrl: posterUrl,
    provider: "mock",
    model: "rbsite-premium-poster-fallback",
  };
}

async function generateTextWithFallback(
  request: AiOrchestratorRequest,
): Promise<ContentGenerationResult> {
  const openaiService = createOpenAIContentServiceFromEnv();
  const geminiService = createGeminiContentServiceFromEnv();

  if (request.mode === "mock") {
    return generateMockContent(request);
  }

  if (openaiService) {
    try {
      return await openaiService.generate(request);
    } catch (error) {
      if (request.mode === "live" && !geminiService) {
        throw error;
      }

      if (geminiService) {
        try {
          const geminiResult = await geminiService.generate(request);
          geminiResult.meta.warnings.push(
            "OpenAI falhou e o fallback Gemini assumiu a geracao de texto.",
          );
          return geminiResult;
        } catch (geminiError) {
          if (!request.fallbackToMock) {
            throw geminiError;
          }

          return generateMockContent(request, [
            error instanceof Error ? error.message : "OpenAI failed.",
            geminiError instanceof Error ? geminiError.message : "Gemini failed.",
          ]);
        }
      }

      if (!request.fallbackToMock) {
        throw error;
      }
    }
  }

  if (geminiService) {
    try {
      return await geminiService.generate(request);
    } catch (error) {
      if (!request.fallbackToMock) {
        throw error;
      }

      return generateMockContent(request, [
        error instanceof Error ? error.message : "Gemini failed.",
      ]);
    }
  }

  if (request.mode === "live") {
    throw new Error(
      "Nenhum provedor de texto esta configurado para operacao live. Configure OpenAI ou Gemini.",
    );
  }

  return generateMockContent(request, [
    "Nenhuma chave de IA configurada. Retornado fallback local.",
  ]);
}

async function generateImageWithFallback(
  request: AiOrchestratorRequest,
  textResult: ContentGenerationResult,
) {
  const pixabayService = createPixabayImageServiceFromEnv();
  const stabilityService = createStabilityImageServiceFromEnv();
  const canvaService = createCanvaServiceFromEnv();
  const warnings: string[] = [];

  if (request.mode !== "mock" && pixabayService) {
    try {
      return await pixabayService.generate({
        request,
        generated: textResult.content,
      });
    } catch (error) {
      warnings.push(
        error instanceof Error
          ? error.message
          : "Pixabay falhou ao selecionar a imagem de apoio.",
      );
    }
  }

  if (request.mode !== "mock" && stabilityService) {
    try {
      return await stabilityService.generate({
        request,
        generated: textResult.content,
      });
    } catch (error) {
      warnings.push(
        error instanceof StabilityImageServiceError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Stability falhou na geracao da imagem.",
      );
    }
  }

  if (request.mode !== "mock" && canvaService) {
    try {
      const composed = await canvaService.composeCreative();

      if (composed) {
        return composed;
      }

      warnings.push(
        "Canva conectado, mas a composicao automatica depende de template OAuth configurado.",
      );
    } catch (error) {
      warnings.push(
        error instanceof Error ? error.message : "Canva falhou na composicao.",
      );
    }
  }

  warnings.push(
    pixabayService
      ? "O compositor interno finalizou a arte para manter o fluxo operacional sem bloquear a geracao."
      : "Sem Pixabay configurado, o compositor interno assumiu a arte final para evitar falha dura de imagem.",
  );

  const mockImage = buildMockImageResult(request, textResult.content);
  return {
    ...mockImage,
    warnings,
  };
}

export async function generateOrchestratedContent(
  request: AiOrchestratorRequest,
): Promise<AiOrchestratorResult> {
  const textResult = await generateTextWithFallback(request);
  const imageResult = await generateImageWithFallback(request, textResult);
  const warnings = [
    ...textResult.meta.warnings,
    ...(imageResult.warnings ?? []),
  ];
  const caption =
    request.platform === "facebook"
      ? textResult.content.captions.facebook
      : textResult.content.captions.instagram;
  const hashtags =
    request.platform === "facebook"
      ? textResult.content.hashtags.facebook
      : textResult.content.hashtags.instagram;

  return {
    title: textResult.content.title,
    content: textResult.content.subtitle,
    caption,
    hashtags,
    image_url: imageResult.imageUrl,
    publication_image_url: imageResult.shareImageUrl ?? imageResult.imageUrl,
    captions: textResult.content.captions,
    hashtagsByPlatform: textResult.content.hashtags,
    generated: {
      ...textResult.content,
      imageUrl: imageResult.imageUrl,
    },
    meta: {
      textProvider: textResult.meta.source,
      textModel: textResult.meta.model,
      imageProvider: imageResult.provider,
      imageModel: imageResult.model,
      designProvider: imageResult.provider === "canva" ? "canva" : "none",
      generatedAt: new Date().toISOString(),
      usedMockFallback:
        textResult.meta.usedMockFallback || imageResult.provider === "mock",
      warnings,
    },
  };
}
