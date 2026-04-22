import type {
  ContentFormat,
  FunnelStage,
  GenerationMode,
  SocialPlatform,
} from "@/types/content-generation";
import type {
  PlannerFormatStrategy,
  PlannerGenerationMode,
  PlannerGenerationRequest,
} from "@/types/planner";

import { sanitizeOptionalText, sanitizePlainText } from "@/lib/security/sanitize";

const modes: PlannerGenerationMode[] = ["single", "batch"];
const formats: ContentFormat[] = ["post", "carousel", "reel"];
const formatStrategies: PlannerFormatStrategy[] = [
  "single_format",
  "mixed",
];
const platforms: SocialPlatform[] = ["instagram", "facebook", "both"];
const funnelStages: FunnelStage[] = ["top", "middle", "bottom"];
const providerModes: GenerationMode[] = ["auto", "live", "mock"];

const MAX_BATCH_ITEMS = 12;

export class PlannerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlannerValidationError";
  }
}

function ensureObject(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new PlannerValidationError("O corpo da requisicao deve ser um objeto JSON.");
  }

  return payload as Record<string, unknown>;
}

function ensureEnum<T extends string>(
  value: unknown,
  options: readonly T[],
  field: string,
) {
  if (typeof value !== "string" || !options.includes(value as T)) {
    throw new PlannerValidationError(
      `O campo "${field}" deve ser um dos seguintes valores: ${options.join(", ")}.`,
    );
  }

  return value as T;
}

function ensureRequiredText(value: unknown, field: string, maxLength = 180) {
  if (typeof value !== "string") {
    throw new PlannerValidationError(`O campo "${field}" e obrigatorio.`);
  }

  const normalized = sanitizePlainText(value, maxLength);

  if (!normalized) {
    throw new PlannerValidationError(`O campo "${field}" e obrigatorio.`);
  }

  return normalized;
}

function normalizeThemes(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const themes = value
    .map((entry) => sanitizeOptionalText(entry, 180))
    .filter((entry): entry is string => Boolean(entry));

  return themes.length > 0 ? themes.slice(0, MAX_BATCH_ITEMS) : undefined;
}

function normalizeQuantity(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  const normalized = Math.max(1, Math.min(MAX_BATCH_ITEMS, Math.floor(value)));
  return normalized;
}

function resolveDefaultFallbackToMock() {
  return process.env.NODE_ENV !== "production";
}

function resolveDefaultProviderMode() {
  return process.env.NODE_ENV === "production" ? "live" : "auto";
}

export function parsePlannerGenerationRequest(
  payload: unknown,
): PlannerGenerationRequest {
  const data = ensureObject(payload);
  const mode = ensureEnum(data.mode ?? "single", modes, "mode");
  const format = ensureEnum(data.format ?? "post", formats, "format");
  const formatStrategy = ensureEnum(
    data.formatStrategy ?? "single_format",
    formatStrategies,
    "formatStrategy",
  );

  const request: PlannerGenerationRequest = {
    mode,
    theme: sanitizeOptionalText(data.theme, 180),
    themes: normalizeThemes(data.themes),
    quantity: normalizeQuantity(data.quantity),
    objective: ensureRequiredText(data.objective, "objective", 180),
    format,
    formatStrategy,
    platform: ensureEnum(data.platform ?? "both", platforms, "platform"),
    voiceTone: ensureRequiredText(data.voiceTone, "voiceTone", 120),
    cta: ensureRequiredText(data.cta, "cta", 160),
    audience: ensureRequiredText(data.audience, "audience", 160),
    funnelStage: ensureEnum(data.funnelStage ?? "middle", funnelStages, "funnelStage"),
    extraContext: sanitizeOptionalText(data.extraContext, 500),
    providerMode:
      data.providerMode === undefined
        ? resolveDefaultProviderMode()
        : ensureEnum(data.providerMode, providerModes, "providerMode"),
    fallbackToMock:
      typeof data.fallbackToMock === "boolean"
        ? data.fallbackToMock
        : resolveDefaultFallbackToMock(),
  };

  if (request.mode === "single" && !request.theme) {
    throw new PlannerValidationError(
      'No modo single, o campo "theme" e obrigatorio.',
    );
  }

  if (request.mode === "batch") {
    const themeCount = request.themes?.length ?? 0;
    const quantity = request.quantity ?? themeCount;

    if (themeCount === 0 && !quantity) {
      throw new PlannerValidationError(
        "No modo em massa, informe uma lista de temas ou a quantidade desejada.",
      );
    }

    request.quantity = quantity || 1;
  }

  return request;
}

export function parsePlannerScheduleUpdate(payload: unknown) {
  const data = ensureObject(payload);
  const scheduledFor = ensureRequiredText(data.scheduledFor, "scheduledFor", 80);
  const parsedDate = new Date(scheduledFor);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new PlannerValidationError(
      'O campo "scheduledFor" deve ser uma data ISO valida.',
    );
  }

  return {
    scheduledFor: parsedDate.toISOString(),
  };
}
