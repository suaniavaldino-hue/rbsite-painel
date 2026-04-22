import type {
  ContentFormat,
  ContentGenerationRequest,
  FunnelStage,
  GenerationMode,
  SocialPlatform,
} from "@/types/content-generation";
import { sanitizeOptionalText, sanitizePlainText } from "@/lib/security/sanitize";

const formats: ContentFormat[] = ["post", "carousel", "reel"];
const platforms: SocialPlatform[] = ["instagram", "facebook", "both"];
const funnelStages: FunnelStage[] = ["top", "middle", "bottom"];
const modes: GenerationMode[] = ["auto", "live", "mock"];

export class ContentGenerationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentGenerationValidationError";
  }
}

function ensureNonEmptyString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ContentGenerationValidationError(
      `The field "${field}" must be a non-empty string.`,
    );
  }

  const sanitizedValue = sanitizePlainText(value, 300);

  if (!sanitizedValue) {
    throw new ContentGenerationValidationError(
      `The field "${field}" must be a non-empty string.`,
    );
  }

  return sanitizedValue;
}

function ensureEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  field: string,
) {
  if (typeof value !== "string" || !allowedValues.includes(value as T)) {
    throw new ContentGenerationValidationError(
      `The field "${field}" must be one of: ${allowedValues.join(", ")}.`,
    );
  }

  return value as T;
}

export function parseContentGenerationRequest(
  payload: unknown,
): ContentGenerationRequest {
  if (!payload || typeof payload !== "object") {
    throw new ContentGenerationValidationError(
      "The request body must be a JSON object.",
    );
  }

  const data = payload as Record<string, unknown>;

  const mode =
    data.mode === undefined
      ? "auto"
      : ensureEnum(data.mode, modes, "mode");

  return {
    theme: ensureNonEmptyString(data.theme, "theme"),
    objective: ensureNonEmptyString(data.objective, "objective"),
    format: ensureEnum(data.format, formats, "format"),
    platform: ensureEnum(data.platform, platforms, "platform"),
    voiceTone: ensureNonEmptyString(data.voiceTone, "voiceTone"),
    cta: ensureNonEmptyString(data.cta, "cta"),
    audience: ensureNonEmptyString(data.audience, "audience"),
    funnelStage: ensureEnum(data.funnelStage, funnelStages, "funnelStage"),
    extraContext: sanitizeOptionalText(data.extraContext, 1200),
    mode,
    fallbackToMock:
      typeof data.fallbackToMock === "boolean" ? data.fallbackToMock : true,
  };
}
