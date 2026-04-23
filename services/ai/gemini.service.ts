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
  fallbackModels?: string[];
  maxRetries?: number;
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

type GeminiRequestResult = {
  payload: GeminiResponseShape;
  model: string;
};

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_GEMINI_FALLBACK_MODELS = ["gemini-2.5-flash-lite"];
const RETRYABLE_GEMINI_STATUSES = new Set([429, 500, 502, 503, 504]);

function stripMarkdownJsonFences(value: string) {
  return value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseEnvList(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueModels(models: string[]) {
  return Array.from(new Set(models.map((model) => model.trim()).filter(Boolean)));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryGeminiStatus(status: number) {
  return RETRYABLE_GEMINI_STATUSES.has(status);
}

function normalizeGeminiError(status: number, body: string, model: string) {
  if (status === 503) {
    return `Gemini modelo "${model}" indisponivel por alta demanda temporaria (503).`;
  }

  if (status === 429) {
    return `Gemini modelo "${model}" recusou a requisicao por limite de uso/rate limit (429).`;
  }

  return `Gemini modelo "${model}" falhou com status ${status}: ${body}`;
}

export class GeminiContentService {
  private readonly apiKey: string;

  private readonly model: string;

  private readonly models: string[];

  private readonly maxRetries: number;

  constructor(options: GeminiContentServiceOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.models = uniqueModels([
      options.model,
      ...(options.fallbackModels ?? []),
    ]);
    this.maxRetries = Math.max(0, Math.min(options.maxRetries ?? 1, 3));
  }

  async generate(
    request: ContentGenerationRequest,
  ): Promise<ContentGenerationResult> {
    const { payload, model } = await this.requestGenerateContent({
      operation: "Gemini request",
      body: {
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
      },
    });

    const outputText = this.extractText(payload);

    if (!outputText) {
      throw new ContentGenerationServiceError(
        `Gemini modelo "${model}" nao retornou conteudo utilizavel.`,
      );
    }

    const parsedPayload = JSON.parse(stripMarkdownJsonFences(outputText));
    const content = normalizeGeneratedDocument(parsedPayload, request);

    return {
      content,
      meta: {
        source: "gemini",
        mode: request.mode ?? "auto",
        model,
        generatedAt: new Date().toISOString(),
        usedMockFallback: false,
        warnings: model === this.model ? [] : [`Gemini usou fallback de modelo: ${model}.`],
      },
    };
  }

  async generateMultimodal(input: {
    prompt: string;
    imageBase64: string;
    mimeType?: string;
  }) {
    const { payload } = await this.requestGenerateContent({
      operation: "Gemini multimodal request",
      body: {
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
      },
    });

    return this.extractText(payload);
  }

  async testConnection() {
    const { payload } = await this.requestGenerateContent({
      operation: "Gemini healthcheck",
      body: {
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
      },
    });

    return this.extractText(payload).toLowerCase().includes("online");
  }

  private async requestGenerateContent(input: {
    operation: string;
    body: Record<string, unknown>;
  }): Promise<GeminiRequestResult> {
    const failures: string[] = [];

    for (const model of this.models) {
      for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": this.apiKey,
            },
            body: JSON.stringify(input.body),
          },
        );

        if (response.ok) {
          const payload = (await response.json()) as GeminiResponseShape;
          return { payload, model };
        }

        const errorBody = await response.text();
        const normalizedError = normalizeGeminiError(
          response.status,
          errorBody,
          model,
        );
        failures.push(normalizedError);

        if (
          !shouldRetryGeminiStatus(response.status) ||
          attempt === this.maxRetries
        ) {
          break;
        }

        await sleep(600 * (attempt + 1));
      }
    }

    throw new ContentGenerationServiceError(
      `${input.operation} indisponivel apos retry/fallback de modelo. ${failures.join(" | ")}`,
    );
  }

  private extractText(payload: GeminiResponseShape) {
    return (
      payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("\n")
        .trim() ?? ""
    );
  }
}

export function createGeminiContentServiceFromEnv() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const primaryModel = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const fallbackModels = uniqueModels([
    ...parseEnvList(process.env.GEMINI_FALLBACK_MODELS),
    ...DEFAULT_GEMINI_FALLBACK_MODELS,
  ]).filter((model) => model !== primaryModel);
  const maxRetries = Number(process.env.GEMINI_MAX_RETRIES ?? 1);

  return new GeminiContentService({
    apiKey,
    model: primaryModel,
    fallbackModels,
    maxRetries: Number.isFinite(maxRetries) ? maxRetries : 1,
  });
}
