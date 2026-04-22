import { BRAND } from "@/lib/constants/brand";
import type { ContentGenerationRequest } from "@/types/content-generation";

export function buildContentSystemPrompt() {
  return [
    "You are the senior content strategist for RB Site.",
    "Always write in Brazilian Portuguese.",
    "RB Site specializes in website creation, landing pages, SEO, performance, digital presence, and strategic web solutions.",
    "The audience is business owners and local companies that need more authority and conversion online.",
    "The tone must be strategic, professional, commercially strong, and persuasive without sounding generic or desperate.",
    "Use sharp hooks, practical language, credible positioning, and concrete calls to action.",
    "Never return markdown, commentary, or extra explanation outside the requested JSON structure.",
    "When the requested format is post, do not include carousel or reel objects.",
    "When the requested format is carousel, include a carousel object with 5 to 8 slides and omit the reel object.",
    "When the requested format is reel, include a reel object with scenes and omit the carousel object.",
    "Instagram caption must be more direct, scannable, and emotionally sticky.",
    "Facebook caption must be more explanatory, contextual, and commercially grounded.",
    "Instagram hashtags must contain at most 15 items.",
    "Facebook hashtags must contain at most 8 items.",
    `Keep the brand anchored to ${BRAND.name}, website ${BRAND.website}, and WhatsApp ${BRAND.whatsapp}.`,
  ].join(" ");
}

export function buildContentUserPrompt(request: ContentGenerationRequest) {
  const requestedPlatform =
    request.platform === "both"
      ? "Instagram e Facebook"
      : request.platform === "instagram"
        ? "Instagram"
        : "Facebook";

  return [
    "Crie um conteudo para a RB Site com base no briefing abaixo.",
    `Tema: ${request.theme}.`,
    `Objetivo: ${request.objective}.`,
    `Formato principal: ${request.format}.`,
    `Plataforma principal: ${requestedPlatform}.`,
    `Tom de voz: ${request.voiceTone}.`,
    `CTA: ${request.cta}.`,
    `Publico: ${request.audience}.`,
    `Nivel de funil: ${request.funnelStage}.`,
    request.extraContext
      ? `Contexto adicional: ${request.extraContext}.`
      : "Contexto adicional: nenhum.",
    "Retorne titulo forte, subtitulo, hook, texto da arte, ideia visual, melhor horario sugerido em formato de dia e hora, um objeto postingSuggestion com weekday, time, isoDateTime e rationale, legenda para Instagram, legenda para Facebook, hashtags para Instagram e hashtags para Facebook.",
    "Se o formato for carousel, gere capa com gancho, de 5 a 8 slides e o ultimo slide com CTA.",
    "Se o formato for reel, gere gancho inicial, cenas com visual, fala e texto na tela, e uma legenda curta para o reel.",
    "Evite frases vagas como 'sua empresa merece'. Prefira mensagens ligadas a autoridade, performance, conversao, SEO, site profissional e vendas.",
  ].join(" ");
}
