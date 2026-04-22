import type {
  MetaMediaType,
  MetaPlatform,
  MetaPublicationRequest,
} from "@/types/meta-publishing";
import { sanitizeOptionalText } from "@/lib/security/sanitize";

const platforms: MetaPlatform[] = ["facebook", "instagram"];
const mediaTypes: MetaMediaType[] = [
  "text",
  "image",
  "video",
  "carousel",
  "reel",
];

export class MetaPublishingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetaPublishingValidationError";
  }
}

function ensureObject(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new MetaPublishingValidationError(
      "The request body must be a JSON object.",
    );
  }

  return payload as Record<string, unknown>;
}

function ensureEnum<T extends string>(
  value: unknown,
  options: readonly T[],
  field: string,
) {
  if (typeof value !== "string" || !options.includes(value as T)) {
    throw new MetaPublishingValidationError(
      `The field "${field}" must be one of: ${options.join(", ")}.`,
    );
  }

  return value as T;
}

function normalizeOptionalString(value: unknown) {
  return sanitizeOptionalText(value, 1200);
}

function normalizeStringArray(value: unknown, field: string) {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new MetaPublishingValidationError(
      `The field "${field}" must be an array of strings.`,
    );
  }

  const normalized = value
    .map((item) => sanitizeOptionalText(item, 1200) ?? "")
    .filter(Boolean);

  if (normalized.length === 0) {
    throw new MetaPublishingValidationError(
      `The field "${field}" must contain at least one string.`,
    );
  }

  return normalized;
}

function assertRequirements(request: MetaPublicationRequest) {
  const textValue = request.message ?? request.caption;

  if (request.platform === "facebook") {
    if (request.mediaType === "text" && !textValue && !request.link) {
      throw new MetaPublishingValidationError(
        'Facebook text publishing requires "message" or "link".',
      );
    }

    if (request.mediaType === "image" && !request.mediaUrl) {
      throw new MetaPublishingValidationError(
        'Facebook image publishing requires "mediaUrl".',
      );
    }

    if (request.mediaType === "video" && !request.mediaUrl) {
      throw new MetaPublishingValidationError(
        'Facebook video publishing requires "mediaUrl".',
      );
    }

    if (request.mediaType === "carousel") {
      if (!request.mediaUrls || request.mediaUrls.length < 2) {
        throw new MetaPublishingValidationError(
          'Facebook carousel publishing requires "mediaUrls" with at least 2 image URLs.',
        );
      }
    }

    if (request.mediaType === "reel") {
      throw new MetaPublishingValidationError(
        `Facebook ${request.mediaType} publishing is not implemented in this backend yet.`,
      );
    }
  }

  if (request.platform === "instagram") {
    if (request.mediaType === "text") {
      throw new MetaPublishingValidationError(
        "Instagram does not support text-only publishing via this integration.",
      );
    }

    if (
      (request.mediaType === "image" ||
        request.mediaType === "video" ||
        request.mediaType === "reel") &&
      !request.mediaUrl
    ) {
      throw new MetaPublishingValidationError(
        `Instagram ${request.mediaType} publishing requires "mediaUrl".`,
      );
    }

    if (request.mediaType === "carousel") {
      if (!request.mediaUrls || request.mediaUrls.length < 2) {
        throw new MetaPublishingValidationError(
          'Instagram carousel publishing requires "mediaUrls" with at least 2 image URLs.',
        );
      }

      if (request.mediaUrls.length > 10) {
        throw new MetaPublishingValidationError(
          "Instagram carousel publishing supports at most 10 items.",
        );
      }
    }
  }
}

export function parseMetaPublicationRequest(
  payload: unknown,
): MetaPublicationRequest {
  const data = ensureObject(payload);

  const request: MetaPublicationRequest = {
    platform: ensureEnum(data.platform, platforms, "platform"),
    mediaType: ensureEnum(data.mediaType, mediaTypes, "mediaType"),
    message: normalizeOptionalString(data.message),
    caption: normalizeOptionalString(data.caption),
    link: normalizeOptionalString(data.link),
    mediaUrl: normalizeOptionalString(data.mediaUrl),
    mediaUrls: normalizeStringArray(data.mediaUrls, "mediaUrls"),
    scheduledFor: normalizeOptionalString(data.scheduledFor),
    allowInternalScheduling:
      typeof data.allowInternalScheduling === "boolean"
        ? data.allowInternalScheduling
        : true,
    contentId: normalizeOptionalString(data.contentId),
  };

  assertRequirements(request);

  return request;
}
