import type {
  ContentFormat,
  FunnelStage,
  GeneratedContentDocument,
  GenerationMode,
  SocialPlatform,
} from "@/types/content-generation";
import type {
  MetaDeliveryMode,
  MetaPlatform,
  MetaPublicationStatus,
} from "@/types/meta-publishing";

export type PlannerItemStatus =
  | "draft"
  | "scheduled"
  | "published"
  | "failed";

export type PlannerGenerationMode = "single" | "batch";

export type PlannerFormatStrategy = "single_format" | "mixed";

export type PlannerMetaSyncStatus =
  | "pending"
  | "scheduled"
  | "planned"
  | "published"
  | "failed";

export type PlannerMetaChannelState = {
  platform: MetaPlatform;
  status: PlannerMetaSyncStatus;
  deliveryMode?: MetaDeliveryMode;
  remoteId?: string;
  remotePostId?: string;
  permalink?: string;
  scheduledFor?: string;
  updatedAt?: string;
  note?: string;
};

export type PlannerMetaBoardState = {
  facebook?: PlannerMetaChannelState;
  instagram?: PlannerMetaChannelState;
  note?: string;
};

export type PlannerAssetManifest = {
  primaryUrl: string;
  carouselUrls: string[];
};

export type PlannerItem = {
  id: string;
  batchId?: string;
  createdAt: string;
  updatedAt: string;
  scheduledFor: string;
  theme: string;
  objective: string;
  format: ContentFormat;
  platform: SocialPlatform;
  audience: string;
  voiceTone: string;
  funnelStage: FunnelStage;
  cta: string;
  extraContext?: string;
  status: PlannerItemStatus;
  content: GeneratedContentDocument;
  assets: PlannerAssetManifest;
  metaBoard: PlannerMetaBoardState;
};

export type PlannerState = {
  version: number;
  items: PlannerItem[];
};

export type PlannerGenerationRequest = {
  mode: PlannerGenerationMode;
  theme?: string;
  themes?: string[];
  quantity?: number;
  objective: string;
  format: ContentFormat;
  formatStrategy?: PlannerFormatStrategy;
  platform: SocialPlatform;
  voiceTone: string;
  cta: string;
  audience: string;
  funnelStage: FunnelStage;
  extraContext?: string;
  providerMode?: GenerationMode;
  fallbackToMock?: boolean;
};

export type PlannerGenerationResponse = {
  batchId: string;
  items: PlannerItem[];
};

export type PlannerMetaDispatchResponse = {
  item: PlannerItem;
  results: Array<{
    platform: MetaPlatform;
    status: MetaPublicationStatus;
    deliveryMode?: MetaDeliveryMode;
    note?: string;
    remoteId?: string;
    permalink?: string;
  }>;
};
