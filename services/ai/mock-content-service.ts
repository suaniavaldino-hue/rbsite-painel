import "server-only";

import type {
  ContentGenerationRequest,
  ContentGenerationResult,
  GeneratedContentDocument,
} from "@/types/content-generation";

import {
  buildPostingSuggestion,
  formatPostingSuggestionLabel,
} from "./posting-schedule-service";

function buildInstagramCaption(request: ContentGenerationRequest) {
  return [
    `${request.theme}: sua empresa esta aproveitando todo o potencial do digital?`,
    "Na RB Site, a estrategia nao para no visual. A gente pensa em autoridade, velocidade, conversao e presenca online que gera oportunidade real.",
    `${request.objective} com uma comunicacao que conversa com ${request.audience}.`,
    `${request.cta}`,
  ].join("\n\n");
}

function buildFacebookCaption(request: ContentGenerationRequest) {
  return [
    `Se o tema e ${request.theme.toLowerCase()}, vale olhar para isso de forma estrategica.`,
    `Muitas empresas investem em redes sociais, mas continuam perdendo oportunidades por nao terem uma estrutura digital forte. A RB Site trabalha justamente esse ponto com sites, landing pages, SEO e performance orientados a conversao.`,
    `Neste conteudo, o foco e ${request.objective.toLowerCase()} para um publico de ${request.audience.toLowerCase()}.`,
    `${request.cta}`,
  ].join("\n\n");
}

function buildHashtags(theme: string, format: "instagram" | "facebook") {
  const base = [
    "#rbsite",
    "#siteprofissional",
    "#presencadigital",
    "#marketingdigital",
    "#negocioslocais",
    "#conversaodigital",
    "#landingpage",
    "#seo",
    "#performancedigital",
    "#sitequevende",
    "#estrategiadigital",
    "#empresaslocais",
    "#ux",
    "#autoridadeonline",
    "#geracaodeleads",
  ];

  const themedTag = `#${theme
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")}`;

  const tags = [themedTag, ...base];

  return format === "instagram" ? tags.slice(0, 15) : tags.slice(0, 8);
}

function buildBaseDocument(
  request: ContentGenerationRequest,
): GeneratedContentDocument {
  const postingSuggestion = buildPostingSuggestion(request);

  const base: GeneratedContentDocument = {
    title: `${request.theme} com foco em conversao real`,
    subtitle: "Autoridade digital nao nasce por acaso. Ela e projetada.",
    hook: `Seu ${request.theme.toLowerCase()} pode estar deixando dinheiro na mesa.`,
    artText:
      request.format === "reel"
        ? "Sua presencia digital esta convencendo ou afastando clientes?"
        : `Transforme ${request.theme.toLowerCase()} em autoridade e vendas.`,
    visualIdea:
      "Direcao de arte premium com interface de site, graficos de performance, contrastes quentes e destaque comercial para a proposta da RB Site.",
    bestPostingTime: formatPostingSuggestionLabel(postingSuggestion),
    postingSuggestion,
    captions: {
      instagram: buildInstagramCaption(request),
      facebook: buildFacebookCaption(request),
    },
    hashtags: {
      instagram: buildHashtags(request.theme, "instagram"),
      facebook: buildHashtags(request.theme, "facebook"),
    },
  };

  if (request.format === "carousel") {
    base.carousel = {
      coverHook: `5 sinais de que ${request.theme.toLowerCase()} precisa mudar`,
      slides: [
        {
          title: "Sinal 1",
          body: "Sua empresa recebe visitas, mas quase nao converte em contato.",
        },
        {
          title: "Sinal 2",
          body: "O visual ate chama atencao, mas nao deixa clara a proposta de valor.",
        },
        {
          title: "Sinal 3",
          body: "A experiencia e lenta, confusa ou sem foco em proximo passo.",
        },
        {
          title: "Sinal 4",
          body: "Instagram concentra a comunicacao, mas falta uma base propria para vender.",
        },
        {
          title: "Sinal 5",
          body: "SEO, velocidade e conversao nao estao sendo tratados como prioridade.",
        },
      ],
      finalSlideCta: request.cta,
    };
  }

  if (request.format === "reel") {
    base.reel = {
      openingHook:
        "Se sua empresa depende so de rede social, voce esta construindo em terreno alugado.",
      shortCaption:
        "Presenca digital forte exige estrategia, performance e uma base propria para converter.",
      scenes: [
        {
          scene: "Cena 1",
          visual: "Empresario olhando metricas fracas no notebook.",
          spokenLine:
            "Postar todo dia nao resolve quando a estrutura digital nao esta preparada para vender.",
          onScreenText: "Rede social sozinha nao sustenta conversao",
        },
        {
          scene: "Cena 2",
          visual: "Tela de site lento e usuario saindo rapido.",
          spokenLine:
            "Site lento, mensagem fraca e falta de clareza derrubam autoridade e leads.",
          onScreenText: "Lentidao e mensagem fraca custam caro",
        },
        {
          scene: "Cena 3",
          visual: "Mockup premium de site e landing page da RB Site.",
          spokenLine:
            "Na RB Site, a gente transforma presenca digital em estrutura de conversao.",
          onScreenText: request.cta,
        },
      ],
    };
  }

  return base;
}

export async function generateMockContent(
  request: ContentGenerationRequest,
  warnings: string[] = [],
): Promise<ContentGenerationResult> {
  return {
    content: buildBaseDocument(request),
    meta: {
      source: "mock",
      mode: request.mode ?? "auto",
      model: "mock-rbsite-generator",
      generatedAt: new Date().toISOString(),
      usedMockFallback: true,
      warnings,
    },
  };
}
