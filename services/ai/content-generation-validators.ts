import type {
  ContentGenerationRequest,
  GeneratedContentDocument,
  PostingSuggestion,
} from "@/types/content-generation";

import {
  buildPostingSuggestion,
  formatPostingSuggestionLabel,
} from "./posting-schedule-service";

export class ContentGenerationServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentGenerationServiceError";
  }
}

function ensureString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ContentGenerationServiceError(
      `Generated content field "${field}" is missing or empty.`,
    );
  }

  return value.trim();
}

function ensureStringArray(value: unknown, field: string, maxLength: number) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ContentGenerationServiceError(
      `Generated content field "${field}" must be a non-empty array.`,
    );
  }

  if (value.length > maxLength) {
    throw new ContentGenerationServiceError(
      `Generated content field "${field}" exceeds the limit of ${maxLength} items.`,
    );
  }

  return value.map((item, index) =>
    ensureString(item, `${field}[${index}]`),
  );
}

export function normalizeGeneratedDocument(
  payload: unknown,
  request: ContentGenerationRequest,
): GeneratedContentDocument {
  if (!payload || typeof payload !== "object") {
    throw new ContentGenerationServiceError(
      "The model returned an invalid structured payload.",
    );
  }

  const data = payload as Record<string, unknown>;
  const captions = data.captions as Record<string, unknown> | undefined;
  const hashtags = data.hashtags as Record<string, unknown> | undefined;
  const postingSuggestionInput =
    data.postingSuggestion as Record<string, unknown> | undefined;

  let postingSuggestion: PostingSuggestion;

  try {
    postingSuggestion = {
      weekday: ensureString(
        postingSuggestionInput?.weekday,
        "postingSuggestion.weekday",
      ),
      time: ensureString(
        postingSuggestionInput?.time,
        "postingSuggestion.time",
      ),
      isoDateTime: ensureString(
        postingSuggestionInput?.isoDateTime,
        "postingSuggestion.isoDateTime",
      ),
      rationale: ensureString(
        postingSuggestionInput?.rationale,
        "postingSuggestion.rationale",
      ),
    };
  } catch {
    postingSuggestion = buildPostingSuggestion(request);
  }

  const normalized: GeneratedContentDocument = {
    title: ensureString(data.title, "title"),
    subtitle: ensureString(data.subtitle, "subtitle"),
    hook: ensureString(data.hook, "hook"),
    artText: ensureString(data.artText, "artText"),
    visualIdea: ensureString(data.visualIdea, "visualIdea"),
    bestPostingTime:
      (typeof data.bestPostingTime === "string" && data.bestPostingTime.trim()) ||
      formatPostingSuggestionLabel(postingSuggestion),
    postingSuggestion,
    captions: {
      instagram: ensureString(captions?.instagram, "captions.instagram"),
      facebook: ensureString(captions?.facebook, "captions.facebook"),
    },
    hashtags: {
      instagram: ensureStringArray(
        hashtags?.instagram,
        "hashtags.instagram",
        15,
      ),
      facebook: ensureStringArray(hashtags?.facebook, "hashtags.facebook", 8),
    },
  };

  if (request.format === "carousel") {
    const carousel = data.carousel as Record<string, unknown> | undefined;
    const slides = Array.isArray(carousel?.slides) ? carousel.slides : undefined;

    if (!carousel || !slides || slides.length < 5 || slides.length > 8) {
      throw new ContentGenerationServiceError(
        "The generated carousel payload does not contain 5 to 8 valid slides.",
      );
    }

    normalized.carousel = {
      coverHook: ensureString(carousel.coverHook, "carousel.coverHook"),
      finalSlideCta: ensureString(
        carousel.finalSlideCta,
        "carousel.finalSlideCta",
      ),
      slides: slides.map((slide, index) => {
        const value = slide as Record<string, unknown>;

        return {
          title: ensureString(value.title, `carousel.slides[${index}].title`),
          body: ensureString(value.body, `carousel.slides[${index}].body`),
        };
      }),
    };
  }

  if (request.format === "reel") {
    const reel = data.reel as Record<string, unknown> | undefined;
    const scenes = Array.isArray(reel?.scenes) ? reel.scenes : undefined;

    if (!reel || !scenes || scenes.length < 3) {
      throw new ContentGenerationServiceError(
        "The generated reel payload does not contain enough scenes.",
      );
    }

    normalized.reel = {
      openingHook: ensureString(reel.openingHook, "reel.openingHook"),
      shortCaption: ensureString(reel.shortCaption, "reel.shortCaption"),
      scenes: scenes.map((scene, index) => {
        const value = scene as Record<string, unknown>;

        return {
          scene: ensureString(value.scene, `reel.scenes[${index}].scene`),
          visual: ensureString(value.visual, `reel.scenes[${index}].visual`),
          spokenLine: ensureString(
            value.spokenLine,
            `reel.scenes[${index}].spokenLine`,
          ),
          onScreenText: ensureString(
            value.onScreenText,
            `reel.scenes[${index}].onScreenText`,
          ),
        };
      }),
    };
  }

  return normalized;
}
