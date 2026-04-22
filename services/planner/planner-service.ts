import "server-only";

import { randomUUID } from "node:crypto";

import { BRAND } from "@/lib/constants/brand";
import {
  getPlannerItemById,
  listPlannerItems,
  savePlannerItems,
  updatePlannerItem,
} from "@/lib/planner/store";
import { generateContent } from "@/services/ai/content-generation-service";
import { buildPostingSuggestion } from "@/services/ai/posting-schedule-service";
import {
  buildContentSummaryText,
  createContent,
  updateContent,
} from "@/services/database/content-repository";
import { dispatchMetaPublication } from "@/services/meta/meta-publishing-service";
import type { ContentFormat } from "@/types/content-generation";
import type { MetaPlatform, MetaPublicationRequest } from "@/types/meta-publishing";
import type {
  PlannerGenerationRequest,
  PlannerGenerationResponse,
  PlannerItem,
  PlannerMetaDispatchResponse,
} from "@/types/planner";

import { buildPlannerAssetUrls } from "./planner-art-service";

const DEFAULT_BULK_THEMES = [
  "Seu site pode estar afastando clientes",
  "Instagram nao substitui um site profissional",
  "5 sinais de que sua empresa precisa de um novo site",
  "Landing page boa gera mais leads",
  "SEO ajuda sua empresa a ser encontrada",
  "Site lento derruba conversao",
  "Sua empresa transmite autoridade online?",
  "Site bonito nao e o mesmo que site que vende",
];

function resolveThemes(request: PlannerGenerationRequest) {
  if (request.mode === "single") {
    return [request.theme!];
  }

  const themes = [...(request.themes ?? [])];
  const quantity = request.quantity ?? themes.length ?? 1;

  for (const fallbackTheme of DEFAULT_BULK_THEMES) {
    if (themes.length >= quantity) {
      break;
    }

    if (!themes.includes(fallbackTheme)) {
      themes.push(fallbackTheme);
    }
  }

  return themes.slice(0, quantity);
}

function resolveFormatForIndex(
  request: PlannerGenerationRequest,
  index: number,
): ContentFormat {
  if (request.formatStrategy !== "mixed") {
    return request.format;
  }

  const formats: ContentFormat[] = ["post", "carousel", "reel"];
  return formats[index % formats.length];
}

function resolveTargetPlatforms(platform: PlannerItem["platform"]): MetaPlatform[] {
  if (platform === "both") {
    return ["instagram", "facebook"];
  }

  return [platform];
}

function createPendingMetaBoard(platform: PlannerItem["platform"], scheduledFor: string) {
  const targetPlatforms = resolveTargetPlatforms(platform);
  const state: PlannerItem["metaBoard"] = {
    note:
      "A visao abaixo representa o planner operacional da Meta dentro do painel. Itens do Facebook usam agendamento nativo quando possivel; Instagram usa fila interna quando a publicacao futura depende do scheduler do sistema.",
  };

  for (const targetPlatform of targetPlatforms) {
    state[targetPlatform] = {
      platform: targetPlatform,
      status: "pending",
      scheduledFor,
      updatedAt: new Date().toISOString(),
      note:
        targetPlatform === "facebook"
          ? "Pronto para sincronizar com a janela nativa de agendamento do Facebook."
          : "Pronto para sincronizar com o pipeline do Instagram.",
    };
  }

  return state;
}

function ensureAscendingSchedule(isoDateTime: string, previousDate?: Date) {
  const scheduledDate = new Date(isoDateTime);

  if (!previousDate) {
    return scheduledDate;
  }

  while (scheduledDate.getTime() <= previousDate.getTime()) {
    scheduledDate.setDate(scheduledDate.getDate() + 1);
  }

  return scheduledDate;
}

function derivePlannerStatus(item: PlannerItem): PlannerItem["status"] {
  const channelStates = Object.values(item.metaBoard).filter(
    (value): value is NonNullable<PlannerItem["metaBoard"]["facebook"]> => {
      return value !== null && typeof value === "object" && "status" in value;
    },
  );

  if (channelStates.length === 0) {
    return "draft";
  }

  if (channelStates.every((state) => state.status === "published")) {
    return "published";
  }

  if (channelStates.every((state) => state.status === "failed")) {
    return "failed";
  }

  return "scheduled";
}

function buildMetaRequestForItem(
  item: PlannerItem,
  platform: MetaPlatform,
): MetaPublicationRequest {
  const scheduledFor = item.scheduledFor;

  if (item.format === "post") {
    return {
      platform,
      mediaType: "image",
      caption:
        platform === "instagram"
          ? item.content.captions.instagram
          : item.content.captions.facebook,
      message:
        platform === "facebook" ? item.content.captions.facebook : undefined,
      mediaUrl: item.assets.primaryUrl,
      scheduledFor,
      allowInternalScheduling: true,
      contentId: item.id,
    };
  }

  if (item.format === "carousel") {
    return {
      platform,
      mediaType: "carousel",
      caption:
        platform === "instagram"
          ? item.content.captions.instagram
          : item.content.captions.facebook,
      message:
        platform === "facebook" ? item.content.captions.facebook : undefined,
      mediaUrls: item.assets.carouselUrls,
      scheduledFor,
      allowInternalScheduling: true,
      contentId: item.id,
    };
  }

  throw new Error(
    "A geracao automatica de reels no planner ainda precisa de pipeline de video para sincronizar com a Meta.",
  );
}

export async function generatePlannerItems(
  request: PlannerGenerationRequest,
): Promise<PlannerGenerationResponse> {
  const themes = resolveThemes(request);
  const batchId = randomUUID();
  const createdItems: PlannerItem[] = [];
  let lastScheduledDate: Date | undefined;

  for (const [index, theme] of themes.entries()) {
    const format = resolveFormatForIndex(request, index);
    const generation = await generateContent({
      theme,
      objective: request.objective,
      format,
      platform: request.platform,
      voiceTone: request.voiceTone,
      cta: request.cta,
      audience: request.audience,
      funnelStage: request.funnelStage,
      extraContext:
        request.extraContext ??
        `${BRAND.positioning} Gere tambem titulo, descricao, tags, arte premium e janela ideal de postagem.`,
      mode: "auto",
      fallbackToMock: request.fallbackToMock ?? true,
    });

    const suggestion =
      generation.content.postingSuggestion ??
      buildPostingSuggestion({
        theme,
        objective: request.objective,
        format,
        platform: request.platform,
        voiceTone: request.voiceTone,
        cta: request.cta,
        audience: request.audience,
        funnelStage: request.funnelStage,
        extraContext: request.extraContext,
        fallbackToMock: request.fallbackToMock ?? true,
      });
    const scheduledDate = ensureAscendingSchedule(
      suggestion.isoDateTime,
      lastScheduledDate,
    );
    lastScheduledDate = scheduledDate;
    const carouselSlideCount =
      format === "carousel"
        ? (generation.content.carousel?.slides.length ?? 0) + 1
        : 0;
    const now = new Date().toISOString();
    const itemId = randomUUID();

    const item: PlannerItem = {
      id: itemId,
      batchId,
      createdAt: now,
      updatedAt: now,
      scheduledFor: scheduledDate.toISOString(),
      theme,
      objective: request.objective,
      format,
      platform: request.platform,
      audience: request.audience,
      voiceTone: request.voiceTone,
      funnelStage: request.funnelStage,
      cta: request.cta,
      extraContext: request.extraContext,
      status: "scheduled",
      content: {
        ...generation.content,
        postingSuggestion: {
          ...suggestion,
          isoDateTime: scheduledDate.toISOString(),
        },
        bestPostingTime: `${suggestion.weekday} ${suggestion.time}`,
      },
      assets: buildPlannerAssetUrls(itemId, carouselSlideCount),
      metaBoard: createPendingMetaBoard(request.platform, scheduledDate.toISOString()),
    };

    await createContent({
      id: itemId,
      title: generation.content.title,
      type: format,
      content: buildContentSummaryText({
        subtitle: generation.content.subtitle,
        facebookCaption: generation.content.captions.facebook,
        instagramCaption: generation.content.captions.instagram,
      }),
      status: "scheduled",
      theme,
      objective: request.objective,
      platform: request.platform,
      funnelStage: request.funnelStage,
      caption: generation.content.captions.instagram,
      hashtags: generation.content.hashtags.instagram,
      imageUrl: generation.content.imageUrl,
      provider: `${generation.meta.source}/${generation.meta.imageProvider ?? "mock"}`,
      source: "planner",
    });

    createdItems.push(item);
  }

  await savePlannerItems(createdItems);

  return {
    batchId,
    items: createdItems,
  };
}

export async function listPlannerBoardItems() {
  return listPlannerItems();
}

export async function updatePlannerSchedule(itemId: string, scheduledFor: string) {
  const updatedItem = await updatePlannerItem(itemId, (item) => {
    const updatedAt = new Date().toISOString();

    return {
      ...item,
      updatedAt,
      scheduledFor,
      content: {
        ...item.content,
        postingSuggestion: {
          ...item.content.postingSuggestion,
          isoDateTime: scheduledFor,
        },
      },
      metaBoard: {
        ...item.metaBoard,
        facebook: item.metaBoard.facebook
          ? {
              ...item.metaBoard.facebook,
              status: "pending",
              scheduledFor,
              updatedAt,
            }
          : undefined,
        instagram: item.metaBoard.instagram
          ? {
              ...item.metaBoard.instagram,
              status: "pending",
              scheduledFor,
              updatedAt,
            }
          : undefined,
      },
      status: "scheduled",
    };
  });

  if (updatedItem) {
    await updateContent(itemId, {
      status: "scheduled",
    });
  }

  return updatedItem;
}

export async function dispatchPlannerItemToMeta(
  itemId: string,
): Promise<PlannerMetaDispatchResponse> {
  const item = await getPlannerItemById(itemId);

  if (!item) {
    throw new Error("Item do planner nao encontrado.");
  }

  const targetPlatforms = resolveTargetPlatforms(item.platform);
  const results: PlannerMetaDispatchResponse["results"] = [];
  const updatedAt = new Date().toISOString();
  let nextItem = item;

  for (const platform of targetPlatforms) {
    try {
      const request = buildMetaRequestForItem(nextItem, platform);
      const result = await dispatchMetaPublication(request);

      results.push({
        platform,
        status: result.status,
        deliveryMode: result.deliveryMode,
        note: result.note,
        remoteId: result.remoteId,
        permalink: result.permalink,
      });

      nextItem = {
        ...nextItem,
        updatedAt,
        metaBoard: {
          ...nextItem.metaBoard,
          [platform]: {
            platform,
            status:
              result.status === "published"
                ? "published"
                : result.status === "failed"
                  ? "failed"
                  : result.status === "planned"
                    ? "planned"
                    : "scheduled",
            deliveryMode: result.deliveryMode,
            remoteId: result.remoteId,
            remotePostId: result.remotePostId,
            permalink: result.permalink,
            scheduledFor: result.scheduledFor ?? nextItem.scheduledFor,
            updatedAt,
            note: result.note,
          },
        },
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Falha inesperada ao sincronizar com a Meta.";

      results.push({
        platform,
        status: "failed",
        note: message,
      });

      nextItem = {
        ...nextItem,
        updatedAt,
        metaBoard: {
          ...nextItem.metaBoard,
          [platform]: {
            platform,
            status: "failed",
            scheduledFor: nextItem.scheduledFor,
            updatedAt,
            note: message,
          },
        },
      };
    }
  }

  nextItem = {
    ...nextItem,
    status: derivePlannerStatus(nextItem),
  };

  const persisted = await updatePlannerItem(itemId, () => nextItem);

  if (!persisted) {
    throw new Error("Nao foi possivel persistir o item apos a sincronizacao.");
  }

  await updateContent(itemId, {
    status: persisted.status,
  });

  return {
    item: persisted,
    results,
  };
}
