import "server-only";

import type { ContentFormat } from "@/types/content-generation";
import type { ImageGenerationInput, ImageGenerationResult } from "@/types/ai";

import { buildPosterDataUrl } from "./poster-composer";

type StabilityImageServiceOptions = {
  apiKey: string;
  model: "core" | "ultra";
};

function resolveAspectRatio(format: ContentFormat) {
  if (format === "reel") {
    return "9:16";
  }

  return "1:1";
}

function buildBackgroundPrompt(input: ImageGenerationInput) {
  const orientation =
    input.request.format === "reel"
      ? "vertical premium poster composition"
      : "square premium poster composition";

  return [
    "Create one premium social media campaign background for RB Site.",
    "This must look like a polished paid social ad, not a website, not a landing page, not a dashboard, not an app screen, not a software mockup.",
    "Use a single strong hero scene with cinematic editorial lighting, premium contrast, clean depth and high-end commercial finish.",
    "Prefer one of these directions: confident entrepreneur portrait in premium office lighting, abstract geometric growth scene, luxury brand object composition, or symbolic performance/conversion visual.",
    "Never show smartphone screens, tablets, laptop interfaces, browser windows, app cards, website cards, UI tiles, dashboards or software panels.",
    "Never show text-like symbols, fake logos, pseudo brand marks, pseudo letters or typographic shapes inside the generated image.",
    "Background should be atmospheric and clean, designed only to support overlay typography that will be added later by the system.",
    "Deep navy and near-black base, elegant orange highlights, subtle cyan light trail only if needed, clean left-side negative space.",
    orientation + ".",
    `Theme: ${input.request.theme}.`,
    `Objective: ${input.request.objective}.`,
    `Audience: ${input.request.audience}.`,
    `Visual direction: ${input.generated.visualIdea}.`,
    `Hook reference: ${input.generated.hook}.`,
    `Art headline reference: ${input.generated.artText}.`,
  ].join(" ");
}

function buildNegativePrompt() {
  return [
    "website screenshot",
    "landing page",
    "dashboard ui",
    "app interface",
    "browser chrome",
    "smartphone screen",
    "tablet interface",
    "laptop with ui",
    "software mockup",
    "wireframe",
    "cards with text",
    "tiles",
    "widgets",
    "app cards",
    "readable text",
    "letters",
    "gibberish typography",
    "watermark",
    "logo",
    "pseudo logo",
    "fake brand mark",
    "collage",
    "template grid",
    "split screen",
    "cheap stock photo",
    "low contrast",
    "messy composition",
  ].join(", ");
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
    formData.append("prompt", buildBackgroundPrompt(input));
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
    const backgroundHref = `data:image/png;base64,${buffer.toString("base64")}`;

    return {
      imageUrl: buildPosterDataUrl({
        format: input.request.format,
        title: input.generated.title,
        subtitle: input.generated.subtitle,
        hook: input.generated.hook,
        artText: input.generated.artText,
        cta: input.request.cta,
        bestPostingTime: input.generated.bestPostingTime,
        backgroundHref,
        eyebrow: "RB SITE SOCIAL AUTOMATION",
        badgeLabel:
          input.request.format === "carousel"
            ? "CARROSSEL"
            : input.request.format === "reel"
              ? "REEL"
              : "POST",
      }),
      provider: "stability",
      model: `stable-image-${this.model}-poster`,
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
            "premium abstract advertising background in deep navy and orange with soft cinematic glow and clean negative space",
          );
          formData.append(
            "negative_prompt",
            "website screenshot, app ui, dashboard, smartphone screen, text, watermark, logo",
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
