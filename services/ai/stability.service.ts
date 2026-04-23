import "server-only";

import type { ContentFormat } from "@/types/content-generation";
import type { ImageGenerationInput, ImageGenerationResult } from "@/types/ai";

type StabilityImageServiceOptions = {
  apiKey: string;
  model: "core" | "ultra";
};

type CanvasSize = {
  width: number;
  height: number;
};

function resolveAspectRatio(format: ContentFormat) {
  if (format === "reel") {
    return "9:16";
  }

  return "1:1";
}

function resolveCanvasSize(format: ContentFormat): CanvasSize {
  if (format === "reel") {
    return { width: 1080, height: 1920 };
  }

  return { width: 1080, height: 1080 };
}

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

function buildBackgroundPrompt(input: ImageGenerationInput) {
  const orientation =
    input.request.format === "reel"
      ? "vertical poster composition"
      : "square social media poster composition";

  return [
    "High-end social media advertisement background for RB Site.",
    "Create one single premium poster scene, not a website, not a dashboard, not a landing page, not a collage.",
    "No readable text, no letters, no words, no browser UI, no fake interface, no app screenshot, no menu bar.",
    "Hero-centric advertising composition with a strong subject or symbolic object, cinematic lighting, deep navy and orange palette, premium SaaS energy.",
    "Use elegant contrast, depth, glow accents, modern editorial framing, clean negative space for headline overlay on the left or upper area.",
    "The scene must look like a polished paid social creative, not a webpage mockup.",
    orientation + ".",
    `Theme: ${input.request.theme}.`,
    `Objective: ${input.request.objective}.`,
    `Visual direction: ${input.generated.visualIdea}.`,
    `Hook reference: ${input.generated.hook}.`,
    `Subject reference: ${input.generated.title}.`,
  ].join(" ");
}

function buildNegativePrompt() {
  return [
    "website screenshot",
    "landing page",
    "dashboard ui",
    "browser chrome",
    "navbar",
    "illegible text",
    "gibberish letters",
    "paragraphs",
    "watermark",
    "multiple panels",
    "split screen",
    "collage",
    "template grid",
    "low contrast",
    "cheap stock image",
  ].join(", ");
}

function buildPosterSvg(input: {
  imageBase64: string;
  source: ImageGenerationInput;
}) {
  const { width, height } = resolveCanvasSize(input.source.request.format);
  const isVertical = input.source.request.format === "reel";
  const titleLines = wrapText(
    input.source.generated.title,
    isVertical ? 15 : 18,
  );
  const subtitleLines = wrapText(
    input.source.generated.subtitle,
    isVertical ? 22 : 28,
  );
  const accentLabel = input.source.request.format === "carousel"
    ? "CARROSSEL"
    : input.source.request.format === "reel"
      ? "REEL"
      : "POST";
  const backgroundWord = wrapText(input.source.generated.hook, isVertical ? 10 : 12)
    .slice(0, 2)
    .join(" ")
    .toUpperCase();

  const titleFontSize = isVertical ? 102 : 88;
  const titleStartY = isVertical ? 360 : 300;
  const subtitleStartY = isVertical ? 860 : 690;
  const footerY = height - 110;
  const ctaY = height - 255;
  const infoY = height - 245;
  const infoWidth = isVertical ? 360 : 320;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
  <defs>
    <linearGradient id="overlayDark" x1="80" y1="120" x2="${width}" y2="${height}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#07111D" stop-opacity="0.92"/>
      <stop offset="0.44" stop-color="#081726" stop-opacity="0.58"/>
      <stop offset="1" stop-color="#081726" stop-opacity="0.24"/>
    </linearGradient>
    <linearGradient id="orangeGlow" x1="${width - 280}" y1="60" x2="${width - 40}" y2="360" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FE9A3B" stop-opacity="0.96"/>
      <stop offset="1" stop-color="#FE770B" stop-opacity="0.72"/>
    </linearGradient>
    <linearGradient id="accentStroke" x1="70" y1="${height - 300}" x2="${width - 60}" y2="${height - 40}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FE770B"/>
      <stop offset="1" stop-color="#FFD2AA"/>
    </linearGradient>
    <filter id="softShadow" x="0" y="0" width="${width}" height="${height}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="24" stdDeviation="36" flood-color="#020617" flood-opacity="0.34"/>
    </filter>
  </defs>

  <rect width="${width}" height="${height}" fill="#081726"/>
  <image href="data:image/png;base64,${input.imageBase64}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>
  <rect width="${width}" height="${height}" fill="url(#overlayDark)"/>
  <circle cx="${width - 120}" cy="120" r="220" fill="url(#orangeGlow)" opacity="0.18"/>
  <circle cx="${isVertical ? 160 : 90}" cy="${height - 70}" r="220" fill="#FE770B" opacity="0.14"/>
  <path d="M70 ${height - 190}C240 ${height - 250} 410 ${height - 120} ${width - 90} ${height - 210}" stroke="url(#accentStroke)" stroke-width="14" stroke-linecap="round" opacity="0.96"/>
  <path d="M60 ${height - 120}C260 ${height - 210} 480 ${height - 20} ${width - 70} ${height - 120}" stroke="#4BC1FF" stroke-width="8" stroke-linecap="round" opacity="0.68"/>

  <text x="80" y="110" fill="#F8FAFC" font-size="24" font-weight="700" letter-spacing="7">RB SITE SOCIAL AUTOMATION</text>
  <rect x="${width - 220}" y="70" width="140" height="48" rx="24" fill="#FE770B"/>
  <text x="${width - 150}" y="101" text-anchor="middle" fill="#081726" font-size="18" font-weight="800" letter-spacing="2.4">${accentLabel}</text>

  <text x="70" y="${isVertical ? 250 : 230}" fill="#F8FAFC" fill-opacity="0.10" font-size="${isVertical ? 180 : 210}" font-weight="900" letter-spacing="-6">${escapeSvg(backgroundWord)}</text>

  <g filter="url(#softShadow)">
    ${renderTextLines({
      lines: titleLines,
      x: 82,
      startY: titleStartY,
      fontSize: titleFontSize,
      lineGap: isVertical ? 8 : 6,
      fill: "#FFFFFF",
      fontWeight: 800,
      maxLines: isVertical ? 4 : 3,
    })}
  </g>

  <rect x="82" y="${isVertical ? 760 : 600}" width="${isVertical ? 360 : 300}" height="14" rx="7" fill="#FE770B"/>
  ${renderTextLines({
    lines: subtitleLines,
    x: 82,
    startY: subtitleStartY,
    fontSize: isVertical ? 38 : 32,
    lineGap: 12,
    fill: "#E2E8F0",
    fontWeight: 500,
    maxLines: isVertical ? 5 : 4,
  })}

  <rect x="82" y="${ctaY}" width="${isVertical ? 420 : 390}" height="94" rx="28" fill="#FE770B"/>
  <text x="120" y="${ctaY + 38}" fill="#081726" font-size="20" font-weight="700" letter-spacing="2.8">CTA</text>
  <text x="120" y="${ctaY + 70}" fill="#081726" font-size="34" font-weight="900" letter-spacing="-0.8">${escapeSvg(input.source.request.cta.slice(0, isVertical ? 20 : 24).toUpperCase())}</text>

  <rect x="${width - infoWidth - 80}" y="${infoY}" width="${infoWidth}" height="94" rx="28" fill="#081726" fill-opacity="0.82" stroke="#FFFFFF" stroke-opacity="0.14"/>
  <text x="${width - infoWidth - 44}" y="${infoY + 38}" fill="#FFFFFF" font-size="20" font-weight="700" letter-spacing="2.8">MELHOR JANELA</text>
  <text x="${width - infoWidth - 44}" y="${infoY + 70}" fill="#FEA347" font-size="30" font-weight="900" letter-spacing="-0.8">${escapeSvg(input.source.generated.bestPostingTime.toUpperCase())}</text>

  <text x="82" y="${footerY}" fill="#F8FAFC" font-size="24" font-weight="700">rbsite.com.br</text>
  <text x="${width - 82}" y="${footerY}" text-anchor="end" fill="#F8FAFC" font-size="22" font-weight="600">contato@rbsite.com.br</text>
</svg>`.trim();
}

function buildImagePrompt(input: ImageGenerationInput) {
  return [
    "Premium social media advertising background for RB Site.",
    "Create one bold campaign visual only, with a hero subject or symbolic object, cinematic editorial composition and premium commercial polish.",
    "Use deep navy, black, white and vibrant orange accents aligned with RB Site branding.",
    "The visual must feel like an expensive Instagram ad, not like a website or landing page screenshot.",
    "Keep generous clean negative space for title overlay.",
    `Theme: ${input.request.theme}.`,
    `Objective: ${input.request.objective}.`,
    `Format: ${input.request.format}.`,
    `Title reference: ${input.generated.title}.`,
    `Hook reference: ${input.generated.hook}.`,
    `Visual direction: ${input.generated.visualIdea}.`,
    "No readable text should appear in the generated background because the final typography will be added by the design system.",
  ].join(" ");
}

export class StabilityImageService {
  private readonly apiKey: string;

  private readonly model: StabilityImageServiceOptions["model"];

  constructor(options: StabilityImageServiceOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
  }

  async generate(input: ImageGenerationInput): Promise<ImageGenerationResult> {
    const endpoint =
      this.model === "ultra"
        ? "https://api.stability.ai/v2beta/stable-image/generate/ultra"
        : "https://api.stability.ai/v2beta/stable-image/generate/core";

    const formData = new FormData();
    formData.append("prompt", buildImagePrompt(input));
    formData.append("negative_prompt", buildNegativePrompt());
    formData.append("aspect_ratio", resolveAspectRatio(input.request.format));
    formData.append("output_format", "png");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "image/*",
      },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Stability image generation failed: ${response.status} ${errorBody}`,
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const svg = buildPosterSvg({
      imageBase64: buffer.toString("base64"),
      source: input,
    });

    return {
      imageUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      provider: "stability",
      model: `stable-image-${this.model}-composed`,
    };
  }

  async testConnection() {
    const response = await fetch(
      "https://api.stability.ai/v2beta/stable-image/generate/core",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "image/*",
        },
        body: (() => {
          const formData = new FormData();
          formData.append(
            "prompt",
            "clean premium orange and navy abstract advertising background with no text",
          );
          formData.append(
            "negative_prompt",
            "website screenshot, UI, dashboard, text, watermark",
          );
          formData.append("aspect_ratio", "1:1");
          formData.append("output_format", "png");
          return formData;
        })(),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Stability healthcheck failed: ${response.status} ${errorBody}`,
      );
    }

    return true;
  }
}

export function createStabilityImageServiceFromEnv() {
  const apiKey = process.env.STABILITY_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  return new StabilityImageService({
    apiKey,
    model:
      process.env.STABILITY_IMAGE_MODEL === "ultra" ? "ultra" : "core",
  });
}
