import "server-only";

import type { ContentFormat } from "@/types/content-generation";
import type { ImageGenerationInput, ImageGenerationResult } from "@/types/ai";

import {
  buildPosterRenderUrl,
} from "./poster-composer";

type PixabayImageServiceOptions = {
  apiKey: string;
};

type PixabayHit = {
  id: number;
  largeImageURL?: string;
  webformatURL?: string;
  tags?: string;
  user?: string;
};

type PixabaySearchResponse = {
  total: number;
  totalHits: number;
  hits: PixabayHit[];
};

export class PixabayImageServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PixabayImageServiceError";
  }
}

function resolveOrientation(format: ContentFormat) {
  return format === "reel" ? "vertical" : "horizontal";
}

function normalizeKeyword(value: string) {
  return value.toLowerCase();
}

function buildQueryCandidates(input: ImageGenerationInput) {
  const keywordBase = `${input.request.theme} ${input.generated.visualIdea}`.toLowerCase();
  const candidates: string[] = [];

  if (/seo|google|trafego|analytics|ranking|performance/.test(keywordBase)) {
    candidates.push("digital marketing analytics office team laptop");
  }

  if (/landing|site|website|ux|ui|design|web design/.test(keywordBase)) {
    candidates.push("web design agency office laptop creative team");
    candidates.push("graphic design studio branding laptop business");
  }

  if (/logo|brand|branding|identidade/.test(keywordBase)) {
    candidates.push("branding design studio creative professional office");
  }

  candidates.push("web design company business office professional laptop");
  candidates.push("creative agency business team modern office");
  candidates.push("professional business meeting office technology");

  return [...new Set(candidates.map(normalizeKeyword))];
}

export class PixabayImageService {
  private readonly apiKey: string;

  constructor(options: PixabayImageServiceOptions) {
    this.apiKey = options.apiKey;
  }

  private async searchImage(
    query: string,
    format: ContentFormat,
  ): Promise<PixabayHit | null> {
    const params = new URLSearchParams({
      key: this.apiKey,
      q: query,
      image_type: "photo",
      safesearch: "true",
      orientation: resolveOrientation(format),
      category: "business",
      order: "popular",
      per_page: "12",
    });

    const response = await fetch(`https://pixabay.com/api/?${params.toString()}`, {
      headers: {
        Accept: "application/json",
      },
      next: {
        revalidate: 60 * 60 * 24,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new PixabayImageServiceError(
        `Pixabay search failed: ${response.status} ${body}`,
      );
    }

    const result = (await response.json()) as PixabaySearchResponse;
    return result.hits[0] ?? null;
  }

  async generate(input: ImageGenerationInput): Promise<ImageGenerationResult> {
    for (const query of buildQueryCandidates(input)) {
      const hit = await this.searchImage(query, input.request.format);
      const backgroundHref = hit?.largeImageURL ?? hit?.webformatURL;

      if (!backgroundHref) {
        continue;
      }

      const posterUrl = buildPosterRenderUrl({
        format: input.request.format,
        title: input.generated.title,
        subtitle: input.generated.subtitle,
        hook: input.generated.hook,
        artText: input.generated.artText,
        backgroundHref,
      });

      return {
        imageUrl: posterUrl,
        shareImageUrl: posterUrl,
        provider: "pixabay",
        model: `pixabay-photo-search:${query}`,
      };
    }

    throw new PixabayImageServiceError(
      "Pixabay nao encontrou uma imagem coerente para o nicho de web design e design grafico.",
    );
  }
}

export function createPixabayImageServiceFromEnv() {
  const apiKey = process.env.PIXABAY_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  return new PixabayImageService({
    apiKey,
  });
}
