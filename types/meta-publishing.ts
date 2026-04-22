export type MetaPlatform = "facebook" | "instagram";

export type MetaMediaType = "text" | "image" | "video" | "carousel" | "reel";

export type MetaDeliveryMode =
  | "immediate"
  | "native_schedule"
  | "internal_schedule";

export type MetaPublicationStatus =
  | "published"
  | "scheduled"
  | "planned"
  | "failed";

export type MetaPublicationRequest = {
  platform: MetaPlatform;
  mediaType: MetaMediaType;
  message?: string;
  caption?: string;
  link?: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  scheduledFor?: string;
  allowInternalScheduling?: boolean;
  contentId?: string;
};

export type MetaConnectionResult = {
  ok: boolean;
  provider: "meta";
  version: string;
  page: {
    configured: boolean;
    connected: boolean;
    id?: string;
    name?: string;
  };
  instagram: {
    configured: boolean;
    connected: boolean;
    id?: string;
    username?: string;
  };
  message: string;
};

export type MetaPublicationResult = {
  platform: MetaPlatform;
  mediaType: MetaMediaType;
  status: MetaPublicationStatus;
  deliveryMode: MetaDeliveryMode;
  provider: "meta";
  publishedAt?: string;
  scheduledFor?: string;
  remoteId?: string;
  remotePostId?: string;
  containerId?: string;
  permalink?: string;
  note?: string;
};
