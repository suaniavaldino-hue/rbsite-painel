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

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readNestedRecord(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const normalizedValue = readString(value);

    if (normalizedValue) {
      return normalizedValue;
    }
  }

  return undefined;
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function buildFallbackArtText(input: {
  title: string;
  hook: string;
  subtitle: string;
}) {
  const preferred = firstString(input.hook, input.title, input.subtitle) ?? input.title;
  return truncateText(preferred, 90);
}

function normalizeArtText(input: {
  data: Record<string, unknown>;
  title: string;
  hook: string;
  subtitle: string;
}) {
  return (
    firstString(
      input.data.artText,
      input.data.art_text,
      input.data.artCopy,
      input.data.copyOnArt,
      input.data.copy_on_art,
      input.data.imageText,
      input.data.image_text,
      input.data.overlayText,
      input.data.overlay_text,
      input.data.textOnImage,
      input.data.text_on_image,
      input.data.postText,
      input.data.post_text,
      input.data.shortHeadline,
      input.data.short_headline,
      input.data.headline,
    ) ??
    buildFallbackArtText({
      title: input.title,
      hook: input.hook,
      subtitle: input.subtitle,
    })
  );
}

function buildFallbackCaption(input: {
  title: string;
  subtitle: string;
  hook: string;
  cta: string;
  platform: "instagram" | "facebook";
}) {
  if (input.platform === "instagram") {
    return [
      input.hook,
      "",
      input.subtitle,
      "",
      input.cta,
    ].join("\n");
  }

  return [
    input.title,
    "",
    input.subtitle,
    "",
    "Uma presenca digital forte precisa unir estrategia, performance e clareza comercial. A RB Site ajuda negocios a transformar site, SEO e landing pages em ativos reais de conversao.",
    "",
    input.cta,
  ].join("\n");
}

function normalizeCaptionSet(input: {
  data: Record<string, unknown>;
  captions?: Record<string, unknown>;
  request: ContentGenerationRequest;
  title: string;
  subtitle: string;
  hook: string;
}) {
  const instagram = firstString(
    input.captions?.instagram,
    input.captions?.ig,
    input.data.instagramCaption,
    input.data.captionInstagram,
    input.data.legendaInstagram,
    input.data.legenda_instagram,
    input.data.caption,
  );
  const facebook = firstString(
    input.captions?.facebook,
    input.captions?.fb,
    input.data.facebookCaption,
    input.data.captionFacebook,
    input.data.legendaFacebook,
    input.data.legenda_facebook,
    input.data.caption,
  );

  return {
    instagram:
      instagram ??
      buildFallbackCaption({
        title: input.title,
        subtitle: input.subtitle,
        hook: input.hook,
        cta: input.request.cta,
        platform: "instagram",
      }),
    facebook:
      facebook ??
      buildFallbackCaption({
        title: input.title,
        subtitle: input.subtitle,
        hook: input.hook,
        cta: input.request.cta,
        platform: "facebook",
      }),
  };
}

function normalizeHashtagValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => readString(item)).filter(Boolean) as string[];
  }

  const stringValue = readString(value);

  if (!stringValue) {
    return [];
  }

  const matches = stringValue.match(/#[\p{L}\p{N}_]+/gu);

  if (matches?.length) {
    return matches;
  }

  return stringValue
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (item.startsWith("#") ? item : `#${item.replace(/^#+/, "")}`));
}

function normalizeFallbackHashtags(platform: "instagram" | "facebook") {
  const base = [
    "#rbsite",
    "#siteprofissional",
    "#criacaodesites",
    "#landingpage",
    "#seo",
    "#presencadigital",
    "#marketingdigital",
    "#conversaodigital",
  ];

  return platform === "instagram" ? base : base.slice(0, 6);
}

function ensureStringArray(value: unknown, field: string, maxLength: number) {
  const normalizedItems = normalizeHashtagValue(value);

  if (normalizedItems.length === 0) {
    throw new ContentGenerationServiceError(
      `Generated content field "${field}" must be a non-empty array.`,
    );
  }

  return normalizedItems.slice(0, maxLength).map((item, index) =>
    ensureString(item, `${field}[${index}]`),
  );
}

function normalizeHashtagSet(input: {
  data: Record<string, unknown>;
  hashtags?: Record<string, unknown>;
}) {
  const instagram = normalizeHashtagValue(
    input.hashtags?.instagram ??
      input.hashtags?.ig ??
      input.data.instagramHashtags ??
      input.data.hashtagsInstagram ??
      input.data.hashtags_instagram ??
      input.data.hashtags,
  ).slice(0, 15);
  const facebook = normalizeHashtagValue(
    input.hashtags?.facebook ??
      input.hashtags?.fb ??
      input.data.facebookHashtags ??
      input.data.hashtagsFacebook ??
      input.data.hashtags_facebook ??
      input.data.hashtags,
  ).slice(0, 8);

  return {
    instagram:
      instagram.length > 0 ? instagram : normalizeFallbackHashtags("instagram"),
    facebook:
      facebook.length > 0 ? facebook : normalizeFallbackHashtags("facebook"),
  };
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
  const captions = readNestedRecord(data.captions);
  const hashtags = readNestedRecord(data.hashtags);
  const postingSuggestionInput = readNestedRecord(data.postingSuggestion);

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

  const title = ensureString(data.title, "title");
  const subtitle = ensureString(data.subtitle, "subtitle");
  const hook = ensureString(data.hook, "hook");
  const captionSet = normalizeCaptionSet({
    data,
    captions,
    request,
    title,
    subtitle,
    hook,
  });
  const hashtagSet = normalizeHashtagSet({ data, hashtags });

  const normalized: GeneratedContentDocument = {
    title,
    subtitle,
    hook,
    artText: normalizeArtText({
      data,
      title,
      hook,
      subtitle,
    }),
    visualIdea: ensureString(data.visualIdea, "visualIdea"),
    bestPostingTime:
      (typeof data.bestPostingTime === "string" && data.bestPostingTime.trim()) ||
      formatPostingSuggestionLabel(postingSuggestion),
    postingSuggestion,
    captions: {
      instagram: ensureString(captionSet.instagram, "captions.instagram"),
      facebook: ensureString(captionSet.facebook, "captions.facebook"),
    },
    hashtags: {
      instagram: ensureStringArray(
        hashtagSet.instagram,
        "hashtags.instagram",
        15,
      ),
      facebook: ensureStringArray(hashtagSet.facebook, "hashtags.facebook", 8),
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
