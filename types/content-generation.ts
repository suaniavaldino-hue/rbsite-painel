export type ContentFormat = "post" | "carousel" | "reel";

export type SocialPlatform = "instagram" | "facebook" | "both";

export type FunnelStage = "top" | "middle" | "bottom";

export type GenerationMode = "auto" | "live" | "mock";

export type GenerationSource = "openai" | "gemini" | "mock";

export type ImageGenerationSource = "stability" | "canva" | "mock";

export type DesignGenerationSource = "canva" | "none";

export type CaptionSet = {
  instagram: string;
  facebook: string;
};

export type HashtagSet = {
  instagram: string[];
  facebook: string[];
};

export type CarouselSlide = {
  title: string;
  body: string;
};

export type ReelScene = {
  scene: string;
  visual: string;
  spokenLine: string;
  onScreenText: string;
};

export type CarouselOutput = {
  coverHook: string;
  slides: CarouselSlide[];
  finalSlideCta: string;
};

export type ReelOutput = {
  openingHook: string;
  scenes: ReelScene[];
  shortCaption: string;
};

export type PostingSuggestion = {
  weekday: string;
  time: string;
  isoDateTime: string;
  rationale: string;
};

export type GeneratedContentDocument = {
  title: string;
  subtitle: string;
  hook: string;
  artText: string;
  visualIdea: string;
  bestPostingTime: string;
  postingSuggestion: PostingSuggestion;
  captions: CaptionSet;
  hashtags: HashtagSet;
  imageUrl?: string;
  carousel?: CarouselOutput;
  reel?: ReelOutput;
};

export type ContentGenerationRequest = {
  theme: string;
  objective: string;
  format: ContentFormat;
  platform: SocialPlatform;
  voiceTone: string;
  cta: string;
  audience: string;
  funnelStage: FunnelStage;
  extraContext?: string;
  mode?: GenerationMode;
  fallbackToMock?: boolean;
};

export type ContentGenerationResult = {
  content: GeneratedContentDocument;
  meta: {
    source: GenerationSource;
    mode: GenerationMode;
    model: string;
    generatedAt: string;
    usedMockFallback: boolean;
    warnings: string[];
    imageProvider?: ImageGenerationSource;
    designProvider?: DesignGenerationSource;
  };
};
