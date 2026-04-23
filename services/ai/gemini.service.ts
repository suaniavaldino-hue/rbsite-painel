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
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

type GeminiErrorPayload = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: Array<{
      "@type"?: string;
      retryDelay?: string;
    }>;
  };
};

type GeminiRequestResult = {
  payload: GeminiResponseShape;
  model: string;
};

type GeminiAttemptOutcome =
  | {
      ok: true;
      payload: GeminiResponseShape;
    }
  | {
      ok: false;
      status: number;
      body: string;
      retryable: boolean;
      retryDelayMs: number;
      shouldTryNextModel: boolean;
    };

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_GEMINI_FALLBACK_MODELS = ["gemini-2.5-flash-lite"];

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

function normalizeGeminiModelName(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return DEFAULT_GEMINI_MODEL;
  }

  const withoutPrefix = trimmed.replace(/^models\//i, "");

  if (
    withoutPrefix.startsWith("gemini-") ||
    withoutPrefix.startsWith("imagen-") ||
    withoutPrefix.startsWith("veo-")
  ) {
    return withoutPrefix;
  }

  if (
    withoutPrefix.includes("flash") ||
    withoutPrefix.includes("pro") ||
    withoutPrefix.includes("lite")
  ) {
    return `gemini-${withoutPrefix}`;
  }

  return withoutPrefix;
}

function uniqueModels(models: string[]) {
  return Array.from(
    new Set(
      models
        .map((model) => normalizeGeminiModelName(model))
        .filter(Boolean),
    ),
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryDelayMs(errorBody: string) {
  try {
    const parsed = JSON.parse(errorBody) as GeminiErrorPayload;
    const retryDelay = parsed.error?.details?.find((detail) => detail?.retryDelay)
      ?.retryDelay;

    if (!retryDelay) {
      return 0;
    }

    const match = retryDelay.match(/^(\d+)(?:\.(\d+))?s$/i);

    if (!match) {
      return 0;
    }

    const seconds = Number(match[1] ?? "0");
    const fraction = Number(`0.${match[2] ?? "0"}`);
    return Math.round((seconds + fraction) * 1000);
  } catch {
    return 0;
  }
}

function buildRetryDelayMs(status: number, attempt: number, errorBody: string) {
  const apiSuggestedDelay = parseRetryDelayMs(errorBody);

  if (apiSuggestedDelay > 0 && apiSuggestedDelay <= 5000) {
    return apiSuggestedDelay;
  }

  if (status === 503) {
    return Math.min(1000 * 2 ** attempt, 4000);
  }

  if (status === 429) {
    return 0;
  }

  return 0;
}

function classifyFailure(status: number, errorBody: string) {
  const retryDelayMs = buildRetryDelayMs(status, 0, errorBody);

  if (status === 404) {
    return {
      retryable: false,
      shouldTryNextModel: true,
      retryDelayMs,
    };
  }

  if (status === 429) {
    return {
      retryable: retryDelayMs > 0,
      shouldTryNextModel: true,
      retryDelayMs,
    };
  }

  if (status === 503 || status === 500 || status === 502 || status === 504) {
    return {
      retryable: true,
      shouldTryNextModel: true,
      retryDelayMs: retryDelayMs || 1000,
    };
  }

  return {
    retryable: false,
    shouldTryNextModel: false,
    retryDelayMs: 0,
  };
}

function normalizeGeminiError(status: number, body: string, model: string) {
  if (status === 404) {
    return `Gemini modelo "${model}" falhou com status 404: ${body}`;
  }

  if (status === 503) {
    return `Gemini modelo "${model}" indisponivel por alta demanda temporaria (503).`;
  }

  if (status === 429) {
    return `Gemini modelo "${model}" recusou a requisicao por limite de uso/rate limit (429).`;
  }

  return `Gemini modelo "${model}" falhou com status ${status}: ${body}`;
}

function buildGeminiPrompt(request: ContentGenerationRequest) {
  return [
    buildContentSystemPrompt(),
    "Return only valid JSON.",
    buildContentUserPrompt(request),
  ].join("\n\n");
}

export function getGeminiRuntimeConfigFromEnv() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const primaryModel = normalizeGeminiModelName(
    process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
  );
  const fallbackModels = uniqueModels([
    ...parseEnvList(process.env.GEMINI_FALLBACK_MODELS),
    ...DEFAULT_GEMINI_FALLBACK_MODELS,
  ]).filter((model) => model !== primaryModel);
  const maxRetries = Number(process.env.GEMINI_MAX_RETRIES ?? 2);

  return {
    apiKey,
    primaryModel,
    fallbackModels,
    maxRetries:
      Number.isFinite(maxRetries) && maxRetries >= 0
        ? Math.min(maxRetries, 3)
        : 2,
  };
}

export class GeminiContentService {
  private readonly apiKey: string;

  private readonly model: string;

  private readonly models: string[];

  private readonly maxRetries: number;

  constructor(options: GeminiContentServiceOptions) {
    this.apiKey = options.apiKey;
    this.model = normalizeGeminiModelName(options.model);
    this.models = uniqueModels([
      this.model,
      ...(options.fallbackModels ?? []),
    ]);
    this.maxRetries = Math.max(0, Math.min(options.maxRetries ?? 2, 3));
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
                text: buildGeminiPrompt(request),
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
        warnings:
          model === this.model
            ? []
            : [`Gemini usou fallback de modelo: ${model}.`],
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

  private async executeAttempt(
    model: string,
    body: Record<string, unknown>,
  ): Promise<GeminiAttemptOutcome> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify(body),
      },
    );

    if (response.ok) {
      return {
        ok: true,
        payload: (await response.json()) as GeminiResponseShape,
      };
    }

    const errorBody = await response.text();
    const classified = classifyFailure(response.status, errorBody);

    return {
      ok: false,
      status: response.status,
      body: errorBody,
      retryable: classified.retryable,
      retryDelayMs: classified.retryDelayMs,
      shouldTryNextModel: classified.shouldTryNextModel,
    };
  }

  private async requestGenerateContent(input: {
    operation: string;
    body: Record<string, unknown>;
  }): Promise<GeminiRequestResult> {
    const failures: string[] = [];

    for (const model of this.models) {
      for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
        const outcome = await this.executeAttempt(model, input.body);

        if (outcome.ok) {
          return { payload: outcome.payload, model };
        }

        const retryDelayMs = buildRetryDelayMs(
          outcome.status,
          attempt,
          outcome.body,
        );
        const canRetryCurrentModel =
          outcome.retryable && attempt < this.maxRetries && retryDelayMs > 0;

        if (canRetryCurrentModel) {
          await sleep(retryDelayMs);
          continue;
        }

        failures.push(normalizeGeminiError(outcome.status, outcome.body, model));

        if (!outcome.shouldTryNextModel) {
          throw new ContentGenerationServiceError(
            `${input.operation} failed sem fallback recuperavel. ${failures.join(" | ")}`,
          );
        }

        break;
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
  const runtimeConfig = getGeminiRuntimeConfigFromEnv();

  if (!runtimeConfig) {
    return null;
  }

  return new GeminiContentService({
    apiKey: runtimeConfig.apiKey,
    model: runtimeConfig.primaryModel,
    fallbackModels: runtimeConfig.fallbackModels,
    maxRetries: runtimeConfig.maxRetries,
  });
}
