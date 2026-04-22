import "server-only";

import type {
  ContentGenerationRequest,
  ContentGenerationResult,
} from "@/types/content-generation";

import {
  buildContentSystemPrompt,
  buildContentUserPrompt,
} from "./content-generation-prompts";
import {
  ContentGenerationServiceError,
  normalizeGeneratedDocument,
} from "./content-generation-validators";

type GeminiContentServiceOptions = {
  apiKey: string;
  model: string;
};

type GeminiResponseShape = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

function stripMarkdownJsonFences(value: string) {
  return value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export class GeminiContentService {
  private readonly apiKey: string;

  private readonly model: string;

  constructor(options: GeminiContentServiceOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
  }

  async generate(
    request: ContentGenerationRequest,
  ): Promise<ContentGenerationResult> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: [
                    buildContentSystemPrompt(),
                    "Return only valid JSON.",
                    buildContentUserPrompt(request),
                  ].join("\n\n"),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.8,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new ContentGenerationServiceError(
        `Gemini request failed: ${response.status} ${errorBody}`,
      );
    }

    const payload = (await response.json()) as GeminiResponseShape;
    const outputText = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("\n")
      .trim();

    if (!outputText) {
      throw new ContentGenerationServiceError(
        "Gemini did not return any usable content.",
      );
    }

    const parsedPayload = JSON.parse(stripMarkdownJsonFences(outputText));
    const content = normalizeGeneratedDocument(parsedPayload, request);

    return {
      content,
      meta: {
        source: "gemini",
        mode: request.mode ?? "auto",
        model: this.model,
        generatedAt: new Date().toISOString(),
        usedMockFallback: false,
        warnings: [],
      },
    };
  }

  async generateMultimodal(input: {
    prompt: string;
    imageBase64: string;
    mimeType?: string;
  }) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: input.prompt,
                },
                {
                  inlineData: {
                    mimeType: input.mimeType ?? "image/png",
                    data: input.imageBase64,
                  },
                },
              ],
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new ContentGenerationServiceError(
        `Gemini multimodal request failed: ${response.status} ${errorBody}`,
      );
    }

    const payload = (await response.json()) as GeminiResponseShape;
    return (
      payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("\n")
        .trim() ?? ""
    );
  }

  async testConnection() {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: "Responda apenas com a palavra online.",
                },
              ],
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new ContentGenerationServiceError(
        `Gemini healthcheck failed: ${response.status} ${errorBody}`,
      );
    }

    const payload = (await response.json()) as GeminiResponseShape;
    const output =
      payload.candidates?.[0]?.content?.parts?.[0]?.text?.toLowerCase() ?? "";

    return output.includes("online");
  }
}

export function createGeminiContentServiceFromEnv() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  return new GeminiContentService({
    apiKey,
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  });
}
