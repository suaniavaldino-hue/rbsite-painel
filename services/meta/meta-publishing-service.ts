import "server-only";

import { env } from "@/lib/utils/env";
import type {
  MetaConnectionResult,
  MetaPublicationRequest,
  MetaPublicationResult,
} from "@/types/meta-publishing";

import { MetaGraphApiError, MetaGraphClient } from "./meta-graph-client";

type MetaPageProfile = {
  id: string;
  name: string;
};

type MetaInstagramProfile = {
  id: string;
  username: string;
};

type MetaPublishResponse = {
  id?: string;
  post_id?: string;
  permalink_url?: string;
};

type InstagramContainerStatus = {
  id: string;
  status?: string;
  status_code?: string;
};

const FACEBOOK_MIN_SCHEDULE_MS = 10 * 60 * 1000;
const FACEBOOK_MAX_SCHEDULE_MS = 180 * 24 * 60 * 60 * 1000;
const INSTAGRAM_VIDEO_POLL_MS = 5000;
const INSTAGRAM_VIDEO_MAX_POLLS = 18;

export class MetaPublishingServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetaPublishingServiceError";
  }
}

function getMetaConfig() {
  return {
    accessToken: process.env.META_GRAPH_API_TOKEN,
    pageId: process.env.META_FACEBOOK_PAGE_ID,
    instagramBusinessId: process.env.META_INSTAGRAM_BUSINESS_ID,
    version: process.env.META_GRAPH_API_VERSION ?? "v25.0",
  };
}

function getClient() {
  const config = getMetaConfig();

  if (!config.accessToken) {
    return null;
  }

  return new MetaGraphClient({
    accessToken: config.accessToken,
    version: config.version,
  });
}

function parseScheduledDate(scheduledFor?: string) {
  if (!scheduledFor) {
    return null;
  }

  const date = new Date(scheduledFor);

  if (Number.isNaN(date.getTime())) {
    throw new MetaPublishingServiceError(
      'The field "scheduledFor" must be a valid ISO date string.',
    );
  }

  return date;
}

function toUnixTimestamp(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

function resolveFacebookMessage(request: MetaPublicationRequest) {
  return request.message ?? request.caption ?? "";
}

function resolveInstagramCaption(request: MetaPublicationRequest) {
  return request.caption ?? request.message ?? "";
}

function assertMetaConfigured() {
  const config = getMetaConfig();

  if (!config.accessToken) {
    throw new MetaPublishingServiceError(
      "META_GRAPH_API_TOKEN is not configured.",
    );
  }

  return config;
}

function assertFacebookConfigured() {
  const config = assertMetaConfigured();

  if (!config.pageId) {
    throw new MetaPublishingServiceError(
      "META_FACEBOOK_PAGE_ID is not configured.",
    );
  }

  return config;
}

function assertInstagramConfigured() {
  const config = assertMetaConfigured();

  if (!config.instagramBusinessId) {
    throw new MetaPublishingServiceError(
      "META_INSTAGRAM_BUSINESS_ID is not configured.",
    );
  }

  return config;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForInstagramContainer(
  client: MetaGraphClient,
  containerId: string,
) {
  for (let attempt = 0; attempt < INSTAGRAM_VIDEO_MAX_POLLS; attempt += 1) {
    const status = await client.get<InstagramContainerStatus>(containerId, {
      fields: "status,status_code",
    });

    const normalized =
      status.status_code?.toUpperCase() ?? status.status?.toUpperCase();

    if (normalized === "FINISHED" || normalized === "PUBLISHED") {
      return;
    }

    if (normalized === "ERROR" || normalized === "EXPIRED") {
      throw new MetaPublishingServiceError(
        `Instagram media container failed with status ${normalized}.`,
      );
    }

    await sleep(INSTAGRAM_VIDEO_POLL_MS);
  }

  throw new MetaPublishingServiceError(
    "Instagram media container did not become ready in time.",
  );
}

async function createInstagramContainer(
  client: MetaGraphClient,
  instagramBusinessId: string,
  request: MetaPublicationRequest,
) {
  const caption = resolveInstagramCaption(request);

  if (request.mediaType === "image") {
    const response = await client.post<{ id: string }>(
      `${instagramBusinessId}/media`,
      {
        image_url: request.mediaUrl,
        caption,
      },
    );

    return {
      containerId: response.id,
      shouldWait: false,
    };
  }

  if (request.mediaType === "video") {
    const response = await client.post<{ id: string }>(
      `${instagramBusinessId}/media`,
      {
        media_type: "VIDEO",
        video_url: request.mediaUrl,
        caption,
      },
    );

    return {
      containerId: response.id,
      shouldWait: true,
    };
  }

  if (request.mediaType === "reel") {
    const response = await client.post<{ id: string }>(
      `${instagramBusinessId}/media`,
      {
        media_type: "REELS",
        video_url: request.mediaUrl,
        caption,
      },
    );

    return {
      containerId: response.id,
      shouldWait: true,
    };
  }

  if (request.mediaType === "carousel") {
    const children: string[] = [];

    for (const mediaUrl of request.mediaUrls ?? []) {
      const child = await client.post<{ id: string }>(
        `${instagramBusinessId}/media`,
        {
          image_url: mediaUrl,
          is_carousel_item: true,
        },
      );

      children.push(child.id);
    }

    const parent = await client.post<{ id: string }>(
      `${instagramBusinessId}/media`,
      {
        media_type: "CAROUSEL",
        children: children.join(","),
        caption,
      },
    );

    return {
      containerId: parent.id,
      shouldWait: false,
    };
  }

  throw new MetaPublishingServiceError(
    `Instagram media type "${request.mediaType}" is not supported.`,
  );
}

async function publishInstagramNow(
  client: MetaGraphClient,
  instagramBusinessId: string,
  request: MetaPublicationRequest,
): Promise<MetaPublicationResult> {
  const container = await createInstagramContainer(
    client,
    instagramBusinessId,
    request,
  );

  if (container.shouldWait) {
    await waitForInstagramContainer(client, container.containerId);
  }

  const response = await client.post<MetaPublishResponse>(
    `${instagramBusinessId}/media_publish`,
    {
      creation_id: container.containerId,
    },
  );

  return {
    platform: "instagram",
    mediaType: request.mediaType,
    provider: "meta",
    status: "published",
    deliveryMode: "immediate",
    publishedAt: new Date().toISOString(),
    remoteId: response.id,
    remotePostId: response.id,
    containerId: container.containerId,
    permalink: response.permalink_url,
  };
}

async function publishFacebookNow(
  client: MetaGraphClient,
  pageId: string,
  request: MetaPublicationRequest,
): Promise<MetaPublicationResult> {
  if (request.mediaType === "text") {
    const response = await client.post<MetaPublishResponse>(`${pageId}/feed`, {
      message: resolveFacebookMessage(request) || undefined,
      link: request.link,
      published: true,
    });

    return {
      platform: "facebook",
      mediaType: request.mediaType,
      provider: "meta",
      status: "published",
      deliveryMode: "immediate",
      publishedAt: new Date().toISOString(),
      remoteId: response.id,
      remotePostId: response.post_id,
      permalink: response.permalink_url,
    };
  }

  if (request.mediaType === "image") {
    const response = await client.post<MetaPublishResponse>(`${pageId}/photos`, {
      url: request.mediaUrl,
      caption: resolveFacebookMessage(request) || undefined,
      published: true,
    });

    return {
      platform: "facebook",
      mediaType: request.mediaType,
      provider: "meta",
      status: "published",
      deliveryMode: "immediate",
      publishedAt: new Date().toISOString(),
      remoteId: response.id,
      remotePostId: response.post_id,
      permalink: response.permalink_url,
    };
  }

  if (request.mediaType === "video") {
    const response = await client.post<MetaPublishResponse>(`${pageId}/videos`, {
      file_url: request.mediaUrl,
      description: resolveFacebookMessage(request) || undefined,
      published: true,
    });

    return {
      platform: "facebook",
      mediaType: request.mediaType,
      provider: "meta",
      status: "published",
      deliveryMode: "immediate",
      publishedAt: new Date().toISOString(),
      remoteId: response.id,
      remotePostId: response.post_id,
      permalink: response.permalink_url,
    };
  }

  if (request.mediaType === "carousel") {
    const mediaIds: string[] = [];

    for (const mediaUrl of request.mediaUrls ?? []) {
      const photo = await client.post<MetaPublishResponse>(`${pageId}/photos`, {
        url: mediaUrl,
        published: false,
      });

      if (photo.id) {
        mediaIds.push(photo.id);
      }
    }

    const attachedMedia = mediaIds.reduce<Record<string, string>>(
      (collection, mediaId, index) => {
        collection[`attached_media[${index}]`] = JSON.stringify({
          media_fbid: mediaId,
        });

        return collection;
      },
      {},
    );

    const response = await client.post<MetaPublishResponse>(`${pageId}/feed`, {
      message: resolveFacebookMessage(request) || undefined,
      published: true,
      ...attachedMedia,
    });

    return {
      platform: "facebook",
      mediaType: request.mediaType,
      provider: "meta",
      status: "published",
      deliveryMode: "immediate",
      publishedAt: new Date().toISOString(),
      remoteId: response.id,
      remotePostId: response.post_id,
      permalink: response.permalink_url,
    };
  }

  throw new MetaPublishingServiceError(
    `Facebook media type "${request.mediaType}" is not supported.`,
  );
}

async function scheduleFacebookNative(
  client: MetaGraphClient,
  pageId: string,
  request: MetaPublicationRequest,
  scheduledDate: Date,
): Promise<MetaPublicationResult> {
  const delta = scheduledDate.getTime() - Date.now();

  if (delta < FACEBOOK_MIN_SCHEDULE_MS || delta > FACEBOOK_MAX_SCHEDULE_MS) {
    throw new MetaPublishingServiceError(
      "Facebook native scheduling requires a time between 10 minutes and 6 months in the future.",
    );
  }

  const scheduleTimestamp = toUnixTimestamp(scheduledDate);

  if (request.mediaType === "text") {
    const response = await client.post<MetaPublishResponse>(`${pageId}/feed`, {
      message: resolveFacebookMessage(request) || undefined,
      link: request.link,
      published: false,
      scheduled_publish_time: scheduleTimestamp,
    });

    return {
      platform: "facebook",
      mediaType: request.mediaType,
      provider: "meta",
      status: "scheduled",
      deliveryMode: "native_schedule",
      scheduledFor: scheduledDate.toISOString(),
      remoteId: response.id,
      remotePostId: response.post_id,
      permalink: response.permalink_url,
    };
  }

  if (request.mediaType === "image") {
    const response = await client.post<MetaPublishResponse>(`${pageId}/photos`, {
      url: request.mediaUrl,
      caption: resolveFacebookMessage(request) || undefined,
      published: false,
      scheduled_publish_time: scheduleTimestamp,
    });

    return {
      platform: "facebook",
      mediaType: request.mediaType,
      provider: "meta",
      status: "scheduled",
      deliveryMode: "native_schedule",
      scheduledFor: scheduledDate.toISOString(),
      remoteId: response.id,
      remotePostId: response.post_id,
      permalink: response.permalink_url,
    };
  }

  if (request.mediaType === "video") {
    const response = await client.post<MetaPublishResponse>(`${pageId}/videos`, {
      file_url: request.mediaUrl,
      description: resolveFacebookMessage(request) || undefined,
      published: false,
      scheduled_publish_time: scheduleTimestamp,
    });

    return {
      platform: "facebook",
      mediaType: request.mediaType,
      provider: "meta",
      status: "scheduled",
      deliveryMode: "native_schedule",
      scheduledFor: scheduledDate.toISOString(),
      remoteId: response.id,
      remotePostId: response.post_id,
      permalink: response.permalink_url,
    };
  }

  if (request.mediaType === "carousel") {
    const mediaIds: string[] = [];

    for (const mediaUrl of request.mediaUrls ?? []) {
      const photo = await client.post<MetaPublishResponse>(`${pageId}/photos`, {
        url: mediaUrl,
        published: false,
      });

      if (photo.id) {
        mediaIds.push(photo.id);
      }
    }

    const attachedMedia = mediaIds.reduce<Record<string, string>>(
      (collection, mediaId, index) => {
        collection[`attached_media[${index}]`] = JSON.stringify({
          media_fbid: mediaId,
        });

        return collection;
      },
      {},
    );

    const response = await client.post<MetaPublishResponse>(`${pageId}/feed`, {
      message: resolveFacebookMessage(request) || undefined,
      published: false,
      scheduled_publish_time: scheduleTimestamp,
      ...attachedMedia,
    });

    return {
      platform: "facebook",
      mediaType: request.mediaType,
      provider: "meta",
      status: "scheduled",
      deliveryMode: "native_schedule",
      scheduledFor: scheduledDate.toISOString(),
      remoteId: response.id,
      remotePostId: response.post_id,
      permalink: response.permalink_url,
    };
  }

  throw new MetaPublishingServiceError(
    `Facebook native scheduling does not support "${request.mediaType}" in this backend yet.`,
  );
}

function planInstagramSchedule(
  request: MetaPublicationRequest,
  scheduledDate: Date,
): MetaPublicationResult {
  return {
    platform: "instagram",
    mediaType: request.mediaType,
    provider: "meta",
    status: "planned",
    deliveryMode: "internal_schedule",
    scheduledFor: scheduledDate.toISOString(),
    note:
      "Instagram future publishing must be executed by the system scheduler at the scheduled time.",
  };
}

export async function testMetaConnection(): Promise<MetaConnectionResult> {
  const config = getMetaConfig();
  const client = getClient();

  if (!client || !config.accessToken) {
    return {
      ok: false,
      provider: "meta",
      version: config.version,
      page: {
        configured: Boolean(config.pageId),
        connected: false,
      },
      instagram: {
        configured: Boolean(config.instagramBusinessId),
        connected: false,
      },
      message: "META_GRAPH_API_TOKEN is not configured.",
    };
  }

  let page: MetaPageProfile | null = null;
  let instagram: MetaInstagramProfile | null = null;

  if (config.pageId) {
    page = await client.get<MetaPageProfile>(config.pageId, {
      fields: "id,name",
    });
  }

  if (config.instagramBusinessId) {
    instagram = await client.get<MetaInstagramProfile>(
      config.instagramBusinessId,
      {
        fields: "id,username",
      },
    );
  }

  const pageConnected = Boolean(page);
  const instagramConnected = Boolean(instagram);

  return {
    ok: pageConnected || instagramConnected,
    provider: "meta",
    version: config.version,
    page: {
      configured: Boolean(config.pageId),
      connected: pageConnected,
      id: page?.id,
      name: page?.name,
    },
    instagram: {
      configured: Boolean(config.instagramBusinessId),
      connected: instagramConnected,
      id: instagram?.id,
      username: instagram?.username,
    },
    message:
      pageConnected || instagramConnected
        ? "Meta connection is healthy."
        : "Meta IDs are configured, but no target could be reached.",
  };
}

export async function dispatchMetaPublication(
  request: MetaPublicationRequest,
): Promise<MetaPublicationResult> {
  const scheduledDate = parseScheduledDate(request.scheduledFor);

  if (request.platform === "facebook") {
    const config = assertFacebookConfigured();
    const client = getClient();

    if (!client) {
      throw new MetaPublishingServiceError(
        "META_GRAPH_API_TOKEN is not configured.",
      );
    }

    if (scheduledDate && scheduledDate.getTime() > Date.now()) {
      return scheduleFacebookNative(client, config.pageId!, request, scheduledDate);
    }

    return publishFacebookNow(client, config.pageId!, request);
  }

  if (request.platform === "instagram") {
    const config = assertInstagramConfigured();
    const client = getClient();

    if (!client) {
      throw new MetaPublishingServiceError(
        "META_GRAPH_API_TOKEN is not configured.",
      );
    }

    if (scheduledDate && scheduledDate.getTime() > Date.now()) {
      if (!request.allowInternalScheduling) {
        throw new MetaPublishingServiceError(
          "Instagram future scheduling requires allowInternalScheduling=true.",
        );
      }

      return planInstagramSchedule(request, scheduledDate);
    }

    return publishInstagramNow(client, config.instagramBusinessId!, request);
  }

  throw new MetaPublishingServiceError(
    `Unsupported platform "${String(request.platform)}".`,
  );
}

export function serializeMetaError(error: unknown) {
  if (error instanceof MetaGraphApiError) {
    return {
      message: error.message,
      status: error.status,
      code: error.code,
      subcode: error.subcode,
      traceId: error.traceId,
      type: error.errorType,
      provider: "meta",
      appUrl: env.appUrl,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      provider: "meta",
      appUrl: env.appUrl,
    };
  }

  return {
    message: "Unexpected Meta Graph API error.",
    provider: "meta",
    appUrl: env.appUrl,
  };
}
