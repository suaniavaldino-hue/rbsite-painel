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

  return lines.slice(0, 6);
}

function renderTextLines(input: {
  lines: string[];
  x: number;
  startY: number;
  fontSize: number;
  lineGap: number;
  fill: string;
  fontWeight: number;
  maxLines?: number;
}) {
  return input.lines
    .slice(0, input.maxLines ?? input.lines.length)
    .map((line, index) => {
      const y = input.startY + index * (input.fontSize + input.lineGap);
      return `<text x="${input.x}" y="${y}" fill="${input.fill}" font-size="${input.fontSize}" font-weight="${input.fontWeight}" letter-spacing="-1.2">${escapeSvg(line)}</text>`;
    })
    .join("");
}

function buildMockImageResult(
  request: AiOrchestratorRequest,
  generated: ContentGenerationResult["content"],
): ImageGenerationResult {
  const isVertical = request.format === "reel";
  const width = 1080;
  const height = isVertical ? 1920 : 1080;
  const titleLines = wrapText(generated.title, isVertical ? 15 : 18);
  const subtitleLines = wrapText(generated.subtitle, isVertical ? 22 : 28);
  const ghostWord = wrapText(generated.hook, isVertical ? 10 : 12)
    .slice(0, 2)
    .join(" ")
    .toUpperCase();

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
  <defs>
    <linearGradient id="bg" x1="60" y1="70" x2="980" y2="${height - 40}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#091A2B"/>
      <stop offset="0.45" stop-color="#10243A"/>
      <stop offset="1" stop-color="#060E18"/>
    </linearGradient>
    <radialGradient id="orb1" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${isVertical ? 810 : 850} 240) rotate(90) scale(340 340)">
      <stop stop-color="#FE770B" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#FE770B" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="orb2" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(830 ${isVertical ? 950 : 540}) rotate(90) scale(410 300)">
      <stop stop-color="#4BC1FF" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#4BC1FF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="wave1" x1="76" y1="${height - 250}" x2="1006" y2="${height - 120}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FE770B"/>
      <stop offset="1" stop-color="#FFD5B1"/>
    </linearGradient>
    <linearGradient id="wave2" x1="52" y1="${height - 150}" x2="1018" y2="${height - 20}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#4BC1FF"/>
      <stop offset="1" stop-color="#B6F1FF"/>
    </linearGradient>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <circle cx="${isVertical ? 860 : 910}" cy="220" r="260" fill="url(#orb1)" opacity="0.26"/>
  <circle cx="820" cy="${isVertical ? 980 : 560}" r="300" fill="url(#orb2)" opacity="0.34"/>
  <circle cx="${isVertical ? 830 : 820}" cy="${isVertical ? 760 : 500}" r="${isVertical ? 250 : 220}" fill="#0F172A" opacity="0.92" stroke="#F8FAFC" stroke-opacity="0.08" stroke-width="3"/>
  <circle cx="${isVertical ? 830 : 820}" cy="${isVertical ? 760 : 500}" r="${isVertical ? 184 : 164}" fill="#15283D" opacity="0.94"/>
  <circle cx="${isVertical ? 830 : 820}" cy="${isVertical ? 760 : 500}" r="${isVertical ? 114 : 98}" fill="#FE770B" opacity="0.96"/>
  <circle cx="${isVertical ? 830 : 820}" cy="${isVertical ? 760 : 500}" r="${isVertical ? 52 : 42}" fill="#F8FAFC" opacity="0.94"/>

  <text x="80" y="110" fill="#F8FAFC" font-size="24" font-weight="700" letter-spacing="7">RB SITE SOCIAL AUTOMATION</text>
  <rect x="${width - 220}" y="70" width="140" height="48" rx="24" fill="#FE770B"/>
  <text x="${width - 150}" y="101" text-anchor="middle" fill="#081726" font-size="18" font-weight="800" letter-spacing="2.4">${request.format.toUpperCase()}</text>

  <text x="70" y="${isVertical ? 240 : 228}" fill="#FFFFFF" fill-opacity="0.08" font-size="${isVertical ? 176 : 206}" font-weight="900" letter-spacing="-6">${escapeSvg(ghostWord)}</text>

  ${renderTextLines({
    lines: titleLines,
    x: 82,
    startY: isVertical ? 370 : 305,
    fontSize: isVertical ? 102 : 88,
    lineGap: isVertical ? 8 : 6,
    fill: "#FFFFFF",
    fontWeight: 800,
    maxLines: isVertical ? 4 : 3,
  })}

  <rect x="82" y="${isVertical ? 760 : 610}" width="${isVertical ? 360 : 300}" height="14" rx="7" fill="#FE770B"/>
  ${renderTextLines({
    lines: subtitleLines,
    x: 82,
    startY: isVertical ? 860 : 695,
    fontSize: isVertical ? 38 : 32,
    lineGap: 12,
    fill: "#E2E8F0",
    fontWeight: 500,
    maxLines: isVertical ? 5 : 4,
  })}

  <path d="M70 ${height - 195}C240 ${height - 255} 410 ${height - 120} 990 ${height - 220}" stroke="url(#wave1)" stroke-width="14" stroke-linecap="round" opacity="0.96"/>
  <path d="M58 ${height - 125}C265 ${height - 220} 488 ${height - 20} 1010 ${height - 120}" stroke="url(#wave2)" stroke-width="8" stroke-linecap="round" opacity="0.72"/>

  <rect x="82" y="${height - 255}" width="${isVertical ? 420 : 390}" height="94" rx="28" fill="#FE770B"/>
  <text x="120" y="${height - 217}" fill="#081726" font-size="20" font-weight="700" letter-spacing="2.8">CTA</text>
  <text x="120" y="${height - 185}" fill="#081726" font-size="34" font-weight="900" letter-spacing="-0.8">${escapeSvg(request.cta.slice(0, isVertical ? 20 : 24).toUpperCase())}</text>

  <rect x="${width - (isVertical ? 440 : 400)}" y="${height - 245}" width="${isVertical ? 360 : 320}" height="94" rx="28" fill="#081726" fill-opacity="0.82" stroke="#FFFFFF" stroke-opacity="0.14"/>
  <text x="${width - (isVertical ? 404 : 364)}" y="${height - 207}" fill="#FFFFFF" font-size="20" font-weight="700" letter-spacing="2.8">MELHOR JANELA</text>
  <text x="${width - (isVertical ? 404 : 364)}" y="${height - 175}" fill="#FEA347" font-size="30" font-weight="900" letter-spacing="-0.8">${escapeSvg(generated.bestPostingTime.toUpperCase())}</text>

  <text x="82" y="${height - 108}" fill="#F8FAFC" font-size="24" font-weight="700">rbsite.com.br</text>
  <text x="${width - 82}" y="${height - 108}" text-anchor="end" fill="#F8FAFC" font-size="22" font-weight="600">contato@rbsite.com.br</text>
</svg>`.trim();

  return {
    imageUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    provider: "mock",
    model: "rbsite-premium-poster-svg",
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

  if (!request.fallbackToMock) {
    if (warnings.length > 0) {
      throw new Error(warnings.join(" | "));
    }

    throw new Error(
      "Nenhum provedor de imagem esta configurado para operacao live. Configure Stability AI ou Canva.",
    );
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
