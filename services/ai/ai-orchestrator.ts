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
import { createStabilityImageServiceFromEnv } from "./stability.service";

function escapeSvg(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapText(text: string, maxChars: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length > maxChars && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.slice(0, 4);
}

function buildMockImageResult(
  request: AiOrchestratorRequest,
  generated: ContentGenerationResult["content"],
): ImageGenerationResult {
  const titleLines = wrapText(generated.title, 22);
  const subtitleLines = wrapText(generated.subtitle, 34);

  const titleSvg = titleLines
    .map((line, index) => {
      return `<text x="96" y="${320 + index * 82}" fill="#081726" font-size="72" font-weight="800" letter-spacing="-1.8">${escapeSvg(line)}</text>`;
    })
    .join("");

  const subtitleSvg = subtitleLines
    .map((line, index) => {
      return `<text x="96" y="${640 + index * 48}" fill="#3f5367" font-size="34" font-weight="500">${escapeSvg(line)}</text>`;
    })
    .join("");

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080" fill="none">
  <defs>
    <linearGradient id="bg" x1="90" y1="80" x2="1000" y2="1030" gradientUnits="userSpaceOnUse">
      <stop stop-color="#ffffff"/>
      <stop offset="1" stop-color="#eef4fb"/>
    </linearGradient>
    <linearGradient id="accent" x1="760" y1="70" x2="1020" y2="280" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FEA347"/>
      <stop offset="1" stop-color="#FE770B"/>
    </linearGradient>
    <filter id="shadow" x="18" y="30" width="1044" height="1032" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="22" stdDeviation="28" flood-color="#081726" flood-opacity="0.18"/>
    </filter>
  </defs>

  <rect width="1080" height="1080" fill="#f4f7fb"/>
  <circle cx="940" cy="120" r="210" fill="#FE770B" opacity="0.16"/>
  <circle cx="100" cy="1020" r="240" fill="#081726" opacity="0.08"/>
  <g filter="url(#shadow)">
    <rect x="48" y="50" width="984" height="980" rx="40" fill="url(#bg)"/>
  </g>
  <path d="M78 142C320 26 602 28 972 132V214C688 154 438 168 78 290V142Z" fill="url(#accent)"/>
  <text x="96" y="230" fill="#6a7c8f" font-size="24" font-weight="700" letter-spacing="6">RB SITE SOCIAL AUTOMATION</text>
  ${titleSvg}
  ${subtitleSvg}
  <rect x="96" y="794" width="396" height="132" rx="28" fill="#081726"/>
  <text x="132" y="842" fill="#f8fafc" font-size="21" font-weight="700" letter-spacing="3">MELHOR HORARIO</text>
  <text x="132" y="886" fill="#FEA347" font-size="35" font-weight="800">${escapeSvg(generated.bestPostingTime.toUpperCase())}</text>
  <rect x="544" y="794" width="418" height="132" rx="28" fill="#081726" opacity="0.08" stroke="#081726" stroke-opacity="0.16"/>
  <text x="580" y="842" fill="#4b5f74" font-size="21" font-weight="700" letter-spacing="3">CTA</text>
  <text x="580" y="886" fill="#081726" font-size="33" font-weight="800">${escapeSvg(request.cta.slice(0, 28).toUpperCase())}</text>
  <text x="96" y="972" fill="#4b5f74" font-size="22" font-weight="600">rbsite.com.br</text>
  <text x="958" y="972" text-anchor="end" fill="#081726" font-size="20" font-weight="700">conteudo premium com IA</text>
</svg>`.trim();

  return {
    imageUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    provider: "mock",
    model: "rbsite-branded-svg",
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
  const stabilityService = createStabilityImageServiceFromEnv();
  const canvaService = createCanvaServiceFromEnv();
  const warnings: string[] = [];

  if (request.mode !== "mock" && stabilityService) {
    try {
      return await stabilityService.generate({
        request,
        generated: textResult.content,
      });
    } catch (error) {
      warnings.push(
        error instanceof Error
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
