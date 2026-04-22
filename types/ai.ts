import type {
  CaptionSet,
  ContentGenerationRequest,
  GeneratedContentDocument,
  HashtagSet,
} from "@/types/content-generation";

export type TextProvider = "openai" | "gemini" | "mock";
export type ImageProvider = "stability" | "canva" | "mock";
export type DesignProvider = "canva" | "none";

export type AiOrchestratorRequest = ContentGenerationRequest;

export type AiOrchestratorResult = {
  title: string;
  content: string;
  caption: string;
  hashtags: string[];
  image_url: string;
  captions: CaptionSet;
  hashtagsByPlatform: HashtagSet;
  generated: GeneratedContentDocument;
  meta: {
    textProvider: TextProvider;
    textModel: string;
    imageProvider: ImageProvider;
    imageModel: string;
    designProvider: DesignProvider;
    generatedAt: string;
    usedMockFallback: boolean;
    warnings: string[];
  };
};

export type ImageGenerationInput = {
  request: ContentGenerationRequest;
  generated: GeneratedContentDocument;
};

export type ImageGenerationResult = {
  imageUrl: string;
  provider: ImageProvider;
  model: string;
  warnings?: string[];
};
