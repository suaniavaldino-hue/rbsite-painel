import type {
  ContentFormat,
  FunnelStage,
  SocialPlatform,
} from "@/types/content-generation";

export type ContentStatus =
  | "draft"
  | "planned"
  | "scheduled"
  | "published"
  | "failed";

export type ContentSource = "manual" | "planner";

export type ContentRecord = {
  id: string;
  title: string;
  type: ContentFormat;
  content: string;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
  theme?: string;
  objective?: string;
  platform?: SocialPlatform;
  funnelStage?: FunnelStage;
  caption?: string;
  hashtags: string[];
  imageUrl?: string;
  provider?: string;
  source: ContentSource;
};

export type ListContentsOptions = {
  search?: string;
  type?: ContentFormat | "all";
  status?: ContentStatus | "all";
  limit?: number;
  order?: "newest" | "oldest";
};

export type CreateContentInput = {
  id?: string;
  title: string;
  type: ContentFormat;
  content: string;
  status?: ContentStatus;
  theme?: string;
  objective?: string;
  platform?: SocialPlatform;
  funnelStage?: FunnelStage;
  caption?: string;
  hashtags?: string[];
  imageUrl?: string;
  provider?: string;
  source?: ContentSource;
};

export type UpdateContentInput = Partial<CreateContentInput>;
