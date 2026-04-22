import "server-only";

import { createHash } from "node:crypto";

import OpenAI from "openai";

import type {
  ContentGenerationRequest,
  ContentGenerationResult,
  GeneratedContentDocument,
} from "@/types/content-generation";

import {
  buildContentSystemPrompt,
  buildContentUserPrompt,
} from "./content-generation-prompts";
import { GENERATED_CONTENT_JSON_SCHEMA } from "./content-generation-schema";
import {
  ContentGenerationServiceError,
  normalizeGeneratedDocument,
} from "./content-generation-validators";

type OpenAIContentServiceOptions = {
  apiKey: string;
  model: string;
  reasoningEffort: "minimal" | "low" | "medium" | "high";
  verbosity: "low" | "medium" | "high";
};

type ParsedResponseShape = {
  output_parsed: unknown | null;
  output_text: string;
  model: string;
};

export class OpenAIContentService {
  private readonly client: OpenAI;

  private readonly model: string;

  private readonly reasoningEffort: OpenAIContentServiceOptions["reasoningEffort"];

  private readonly verbosity: OpenAIContentServiceOptions["verbosity"];

  constructor(options: OpenAIContentServiceOptions) {
    this.client = new OpenAI({
      apiKey: options.apiKey,
    });

    this.model = options.model;
    this.reasoningEffort = options.reasoningEffort;
    this.verbosity = options.verbosity;
  }

  async generate(
    request: ContentGenerationRequest,
  ): Promise<ContentGenerationResult> {
    const response = (await this.client.responses.parse({
      model: this.model,
      instructions: buildContentSystemPrompt(),
      input: buildContentUserPrompt(request),
      store: false,
      max_output_tokens: 2600,
      temperature: 0.8,
      prompt_cache_key: `rbsite:${request.format}:${request.platform}`,
      reasoning: {
        effort: this.reasoningEffort,
      },
      safety_identifier: this.createSafetyIdentifier(request),
      text: {
        verbosity: this.verbosity,
        format: {
          type: "json_schema",
          name: "rbsite_content_generation",
          description:
            "Structured social media content for RB Site in Brazilian Portuguese.",
          strict: true,
          schema: GENERATED_CONTENT_JSON_SCHEMA,
        },
      },
    })) as ParsedResponseShape;

    const parsedPayload =
      response.output_parsed ?? this.tryParseText(response.output_text);

    const content = normalizeGeneratedDocument(parsedPayload, request);

    return {
      content,
      meta: {
        source: "openai",
        mode: request.mode ?? "auto",
        model: response.model,
        generatedAt: new Date().toISOString(),
        usedMockFallback: false,
        warnings: [],
      },
    };
  }

  async testConnection() {
    const response = await this.client.responses.create({
      model: this.model,
      instructions: "Answer with the word online.",
      input: "Ping",
      store: false,
      max_output_tokens: 20,
      reasoning: {
        effort: "minimal",
      },
      text: {
        verbosity: "low",
      },
    });

    return response.output_text.toLowerCase().includes("online");
  }

  private tryParseText(text: string): GeneratedContentDocument | unknown {
    try {
      return JSON.parse(text);
    } catch {
      throw new ContentGenerationServiceError(
        "The OpenAI response could not be parsed as structured JSON.",
      );
    }
  }

  private createSafetyIdentifier(request: ContentGenerationRequest) {
    const signature = [
      request.format,
      request.platform,
      request.funnelStage,
      request.theme,
    ].join(":");

    return createHash("sha256").update(signature).digest("hex").slice(0, 64);
  }
}

export function createOpenAIContentServiceFromEnv() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  return new OpenAIContentService({
    apiKey,
    model: process.env.OPENAI_CONTENT_MODEL ?? "gpt-5.4-mini",
    reasoningEffort:
      (process.env.OPENAI_REASONING_EFFORT as
        | "minimal"
        | "low"
        | "medium"
        | "high"
        | undefined) ?? "low",
    verbosity:
      (process.env.OPENAI_TEXT_VERBOSITY as
        | "low"
        | "medium"
        | "high"
        | undefined) ?? "medium",
  });
}
