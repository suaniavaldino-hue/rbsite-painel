import "server-only";

import type { ContentFormat } from "@/types/content-generation";
import type { ImageGenerationInput, ImageGenerationResult } from "@/types/ai";

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

function buildImagePrompt(input: ImageGenerationInput) {
  return [
    "Premium social media creative for RB Site.",
    "Brazilian SaaS aesthetic, clean composition, expensive commercial feel.",
    "Use the RB Site color system with orange highlights and deep navy contrast.",
    "Avoid clutter, excessive text inside the artwork, and generic stock-photo style.",
    `Theme: ${input.request.theme}.`,
    `Objective: ${input.request.objective}.`,
    `Format: ${input.request.format}.`,
    `Title reference: ${input.generated.title}.`,
    `Visual direction: ${input.generated.visualIdea}.`,
    "Create a polished marketing image with space for refined typography overlay.",
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

    return {
      imageUrl: `data:image/png;base64,${buffer.toString("base64")}`,
      provider: "stability",
      model: `stable-image-${this.model}`,
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
          formData.append("prompt", "abstract orange and navy gradient background");
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
