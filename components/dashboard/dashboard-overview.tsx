"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState, useTransition } from "react";

import type { AuditLogEntry } from "@/lib/security/types";
import type { AiOrchestratorResult } from "@/types/ai";
import type { ContentRecord, ContentStatus } from "@/types/content";
import type { ContentFormat, SocialPlatform } from "@/types/content-generation";
import type { MetaPublicationResult } from "@/types/meta-publishing";

import { EmptyState } from "./empty-state";
import { LatestResult } from "./latest-result";
import { PostCard } from "./post-card";

type DashboardOverviewProps = {
  initialContents: ContentRecord[];
  recentAuditLogs: AuditLogEntry[];
};

type GenerateApiResponse = {
  success: boolean;
  data?: {
    creative: AiOrchestratorResult;
    record: ContentRecord;
  };
  error?: string;
};

type MetaPublicationApiResponse = {
  success: boolean;
  data?: MetaPublicationResult;
  error?: string | { message?: string };
};

type DashboardNotice = {
  tone: "success" | "error" | "info";
  message: string;
};

type GeneratedPostModalState = {
  creative: AiOrchestratorResult;
  record: ContentRecord;
  format: ContentFormat;
  platform: SocialPlatform;
  theme: string;
};

const QUICK_THEME_INTROS = [
  "Seu site",
  "Sua marca",
  "Sua landing page",
  "Seu design",
  "Sua presenca digital",
  "Sua identidade visual",
];

const QUICK_THEME_ACTIONS = [
  "pode estar afastando clientes",
  "precisa transmitir mais autoridade",
  "esta perdendo conversao",
  "precisa vender melhor",
  "precisa parecer mais premium",
  "precisa gerar mais confianca",
];

const QUICK_THEME_FOCUS = [
  "com foco em web design",
  "com foco em design grafico",
  "com foco em UX e conversao",
  "com foco em branding profissional",
  "com foco em SEO e performance",
  "com foco em sites que vendem",
];

function countByStatus(items: ContentRecord[], status: ContentStatus) {
  return items.filter((item) => item.status === status).length;
}

function formatAuditEvent(event: string) {
  return event.replaceAll(".", " / ");
}

function formatProviderName(value: string) {
  if (value === "openai") {
    return "OpenAI";
  }

  if (value === "gemini") {
    return "Gemini";
  }

  if (value === "stability") {
    return "Stability";
  }

  if (value === "pixabay") {
    return "Pixabay";
  }

  if (value === "canva") {
    return "Canva";
  }

  if (value === "mock") {
    return "Compositor interno";
  }

  return value;
}

function buildQuickTheme(previous?: string) {
  let candidate = previous ?? "";
  let guard = 0;

  while (candidate === previous && guard < 12) {
    const intro =
      QUICK_THEME_INTROS[Math.floor(Math.random() * QUICK_THEME_INTROS.length)];
    const action =
      QUICK_THEME_ACTIONS[
        Math.floor(Math.random() * QUICK_THEME_ACTIONS.length)
      ];
    const focus =
      QUICK_THEME_FOCUS[Math.floor(Math.random() * QUICK_THEME_FOCUS.length)];

    candidate = `${intro} ${action} ${focus}`;
    guard += 1;
  }

  return candidate;
}

function randomQuickThemeDelayMs() {
  return 60_000 + Math.floor(Math.random() * 60_001);
}

function resolveTargetPlatforms(platform: SocialPlatform) {
  if (platform === "both") {
    return ["instagram", "facebook"] as const;
  }

  return [platform] as const;
}

function resolvePlatformLabel(platforms: readonly string[]) {
  if (platforms.length === 2) {
    return "Instagram e Facebook";
  }

  return platforms[0] === "instagram" ? "Instagram" : "Facebook";
}

function resolveMetaErrorMessage(error: MetaPublicationApiResponse["error"]) {
  if (!error) {
    return "Nao foi possivel concluir a operacao na Meta.";
  }

  if (typeof error === "string") {
    return error;
  }

  return error.message ?? "Nao foi possivel concluir a operacao na Meta.";
}

function formatScheduledLabel(value?: string) {
  if (!value) {
    return "a melhor janela sugerida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function DashboardOverview({
  initialContents,
  recentAuditLogs,
}: DashboardOverviewProps) {
  const [contents, setContents] = useState(initialContents);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ContentFormat | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "all">("all");
  const [theme, setTheme] = useState(() => buildQuickTheme());
  const [format, setFormat] = useState<ContentFormat>("post");
  const [platform, setPlatform] = useState<SocialPlatform>("both");
  const [latestCreative, setLatestCreative] = useState<AiOrchestratorResult | null>(
    null,
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<DashboardNotice | null>(null);
  const [generatedPostModal, setGeneratedPostModal] =
    useState<GeneratedPostModalState | null>(null);
  const [publicationAction, setPublicationAction] = useState<
    "publish" | "schedule" | null
  >(null);
  const deferredSearch = useDeferredValue(search);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setTheme((current) => buildQuickTheme(current));
    }, randomQuickThemeDelayMs());

    return () => window.clearTimeout(timeout);
  }, [theme]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setNotice(null);
    }, 6000);

    return () => window.clearTimeout(timeout);
  }, [notice]);

  const filteredContents = contents.filter((item) => {
    const matchesSearch =
      !deferredSearch.trim() ||
      item.title.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      item.content.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      item.theme?.toLowerCase().includes(deferredSearch.toLowerCase());
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const latestRecord = contents[0] ?? null;
  const totalCount = contents.length;
  const draftCount = countByStatus(contents, "draft");
  const scheduledCount =
    countByStatus(contents, "scheduled") + countByStatus(contents, "planned");
  const publishedCount = countByStatus(contents, "published");

  function handleGenerate() {
    setError(null);
    setFeedback(null);
    setNotice(null);

    startTransition(async () => {
      const response = await fetch("/api/contents/generate", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          theme,
          objective: "Gerar leads qualificados para a RB Site",
          format,
          platform,
          voiceTone: "Profissional, estrategico e premium",
          cta: "Fale com a RB Site no WhatsApp",
          audience: "Empresarios e negocios locais",
          funnelStage: "middle",
          extraContext:
            "Nicho fixo: web design e design grafico para empresas. Direcao visual: posts editoriais premium, imagem real de empresa, escritorio, agencia criativa, notebook, equipe profissional, branding e autoridade digital. Nunca usar fotos das pessoas dos perfis de referencia. Preferir imagem profissional estilo banco de imagens/Pixabay com foco em web design, design grafico, sites, landing pages, UX, SEO e conversao.",
          mode: "live",
          fallbackToMock: false,
        }),
      });

      const result = ((await response
        .json()
        .catch(() => null)) ?? {}) as GenerateApiResponse;

      if (!response.ok || !result.success || !result.data) {
        setError(result.error ?? "Nao foi possivel gerar o conteudo.");
        setNotice({
          tone: "error",
          message:
            result.error ?? "A geracao falhou e precisa de revisao nas integracoes.",
        });
        return;
      }

      const textProvider = formatProviderName(
        result.data.creative.meta.textProvider,
      );
      const imageProvider = formatProviderName(
        result.data.creative.meta.imageProvider,
      );

      setLatestCreative(result.data.creative);
      setContents((currentItems) => [result.data!.record, ...currentItems]);
      setGeneratedPostModal({
        creative: result.data.creative,
        record: result.data.record,
        format,
        platform,
        theme,
      });
      setFeedback(
        `Conteudo gerado em modo live via ${textProvider} + ${imageProvider} e salvo na base central do painel.`,
      );
      setNotice({
        tone: "success",
        message:
          "Resumo do post pronto. Revise e escolha se deseja publicar ou agendar.",
      });
    });
  }

  function handleCloseModal() {
    setGeneratedPostModal(null);
  }

  function updateContentStatus(contentId: string, status: ContentStatus) {
    setContents((currentItems) =>
      currentItems.map((item) =>
        item.id === contentId
          ? {
              ...item,
              status,
            }
          : item,
      ),
    );
  }

  function handlePublication(mode: "publish" | "schedule") {
    if (!generatedPostModal) {
      return;
    }

    if (generatedPostModal.format !== "post") {
      setNotice({
        tone: "info",
        message:
          "Publicacao rapida neste popup esta disponivel para post unico. Carrosseis e reels seguem pelo planner.",
      });
      return;
    }

    setPublicationAction(mode);
    setError(null);
    setFeedback(null);

    startTransition(async () => {
      const targets = resolveTargetPlatforms(generatedPostModal.platform);
      const scheduledFor =
        mode === "schedule"
          ? generatedPostModal.creative.generated.postingSuggestion.isoDateTime
          : undefined;

      const settled = await Promise.allSettled(
        targets.map(async (targetPlatform) => {
          const response = await fetch("/api/publishing/meta", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              platform: targetPlatform,
              mediaType: "image",
              mediaUrl:
                generatedPostModal.creative.publication_image_url ??
                generatedPostModal.creative.image_url,
              caption:
                targetPlatform === "facebook"
                  ? generatedPostModal.creative.captions.facebook
                  : generatedPostModal.creative.captions.instagram,
              message:
                targetPlatform === "facebook"
                  ? generatedPostModal.creative.captions.facebook
                  : undefined,
              scheduledFor,
              allowInternalScheduling: true,
              contentId: generatedPostModal.record.id,
            }),
          });

          const payload = ((await response
            .json()
            .catch(() => null)) ?? {}) as MetaPublicationApiResponse;

          if (!response.ok || !payload.success || !payload.data) {
            throw new Error(resolveMetaErrorMessage(payload.error));
          }

          return payload.data;
        }),
      );

      const succeeded = settled.filter(
        (
          result,
        ): result is PromiseFulfilledResult<MetaPublicationResult> =>
          result.status === "fulfilled",
      );
      const failed = settled.filter(
        (result): result is PromiseRejectedResult => result.status === "rejected",
      );

      if (succeeded.length === 0) {
        const failureMessage =
          failed[0]?.reason instanceof Error
            ? failed[0].reason.message
            : "Nao foi possivel concluir a operacao na Meta.";

        setError(failureMessage);
        setNotice({
          tone: "error",
          message: failureMessage,
        });
        setPublicationAction(null);
        return;
      }

      const successPlatforms = resolvePlatformLabel(
        succeeded.map((entry) => entry.value.platform),
      );
      const nextStatus =
        mode === "publish" ? ("published" as const) : ("scheduled" as const);
      const successMessage =
        mode === "publish"
          ? `Post publicado com sucesso em ${successPlatforms}.`
          : `Post agendado para ${formatScheduledLabel(scheduledFor)} em ${successPlatforms}.`;

      updateContentStatus(generatedPostModal.record.id, nextStatus);
      setFeedback(successMessage);
      setNotice({
        tone: failed.length > 0 ? "info" : "success",
        message:
          failed.length > 0
            ? `${successMessage} ${failed.length} canal(is) ainda precisam de revisao.`
            : successMessage,
      });

      if (failed.length > 0) {
        const failedMessage = failed
          .map((entry) =>
            entry.reason instanceof Error
              ? entry.reason.message
              : "Falha inesperada em um dos canais.",
          )
          .join(" | ");
        setError(failedMessage);
      } else {
        setError(null);
      }

      setGeneratedPostModal(null);
      setPublicationAction(null);
    });
  }

  return (
    <div className="grid gap-6">
      {notice ? (
        <div
          className={`fixed right-4 top-4 z-[70] max-w-md rounded-[22px] border px-4 py-4 text-sm shadow-[0_18px_60px_rgb(2_6_23_/_0.36)] backdrop-blur ${
            notice.tone === "success"
              ? "border-emerald-300/18 bg-emerald-400/12 text-emerald-50"
              : notice.tone === "error"
                ? "border-rose-300/18 bg-rose-400/12 text-rose-50"
                : "border-sky-300/18 bg-sky-400/12 text-sky-50"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      <section className="surface-card rounded-[34px] p-6 md:p-8 lg:p-9">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-[50rem]">
            <span className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-200">
              Multi-IA RB Site
            </span>
            <h1 className="mt-5 max-w-4xl font-display text-[2rem] font-semibold tracking-[-0.05em] text-white md:text-[2.8rem] md:leading-[1.02]">
              Gere texto, imagem e agenda editorial em um painel premium sem
              esconder erro real atras de mock silencioso.
            </h1>
            <p className="mt-5 max-w-3xl text-[15px] leading-7 text-slate-300 md:text-base md:leading-8">
              A superficie agora fica mais limpa, mais larga e pronta para operar
              com OpenAI, Gemini, Stability, Pixabay, Canva e Meta com diagnostico
              claro quando alguma integracao nao responder em producao.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                Tema rapido automatico
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                Popup de publicar e agendar
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                Nicho focado em web design
              </span>
            </div>
          </div>

          <div className="grid w-full max-w-[28rem] gap-3 rounded-[28px] border border-white/10 bg-slate-950/40 p-4 md:p-5">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Tema rapido
              </span>
              <input
                value={theme}
                onChange={(event) => setTheme(event.target.value)}
                className="h-14 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none"
              />
              <span className="text-xs leading-6 text-slate-400">
                Atualiza sozinho a cada 1 a 2 minutos com foco em web design e
                design grafico.
              </span>
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Formato
                </span>
                <select
                  value={format}
                  onChange={(event) => setFormat(event.target.value as ContentFormat)}
                  className="h-14 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none"
                >
                  <option value="post">Post</option>
                  <option value="carousel">Carrossel</option>
                  <option value="reel">Reel</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Plataforma
                </span>
                <select
                  value={platform}
                  onChange={(event) =>
                    setPlatform(event.target.value as SocialPlatform)
                  }
                  className="h-14 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none"
                >
                  <option value="both">Instagram + Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isPending}
                className="inline-flex h-14 items-center justify-center rounded-2xl bg-amber-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? "Gerando..." : "Gerar Post"}
              </button>

              <Link
                href="/planejamento"
                className="inline-flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Gerar em massa
              </Link>
            </div>

            <p className="text-xs leading-6 text-slate-400">
              Quando Stability estiver sem creditos, o painel tenta Pixabay e, se
              preciso, fecha a arte com compositor interno sem travar o fluxo.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Conteudos totais",
            value: totalCount,
            copy: "Biblioteca centralizada no painel",
          },
          {
            label: "Em rascunho",
            value: draftCount,
            copy: "Aguardando refinamento ou aprovacao",
          },
          {
            label: "Agendados",
            value: scheduledCount,
            copy: "Planejados para a proxima janela",
          },
          {
            label: "Publicados",
            value: publishedCount,
            copy: "Ja refletidos na operacao",
          },
        ].map((card) => (
          <article key={card.label} className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              {card.label}
            </p>
            <p className="mt-4 font-display text-[2.35rem] font-semibold tracking-[-0.04em] text-white md:text-[2.7rem]">
              {card.value}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-300">{card.copy}</p>
          </article>
        ))}
      </section>

      {feedback ? (
        <div className="rounded-[28px] border border-emerald-300/18 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-50">
          {feedback}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[28px] border border-rose-300/18 bg-rose-400/10 px-5 py-4 text-sm text-rose-50">
          {error}
        </div>
      ) : null}

      <LatestResult
        latestCreative={latestCreative}
        fallbackRecord={latestRecord}
        pending={isPending}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px] 2xl:grid-cols-[minmax(0,1.28fr)_340px]">
        <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 lg:p-7">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Biblioteca viva
              </p>
              <h2 className="mt-3 font-display text-[1.9rem] font-semibold tracking-[-0.04em] text-white md:text-[2.2rem]">
                Conteudos persistidos
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por tema"
                className="h-12 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
              />
              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as ContentFormat | "all")
                }
                className="h-12 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
              >
                <option value="all">Todos os formatos</option>
                <option value="post">Posts</option>
                <option value="carousel">Carrosseis</option>
                <option value="reel">Reels</option>
              </select>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as ContentStatus | "all")
                }
                className="h-12 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
              >
                <option value="all">Todos os status</option>
                <option value="draft">Draft</option>
                <option value="planned">Planned</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          <div className="mt-8">
            {filteredContents.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {filteredContents.map((item) => (
                  <PostCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nenhum conteudo encontrado"
                copy="Ajuste os filtros ou gere um novo post para alimentar a biblioteca central da RB Site."
              />
            )}
          </div>
        </div>

        <aside className="grid gap-4">
          <section className="rounded-[30px] border border-white/10 bg-white/[0.045] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Proximas rotas
            </p>
            <div className="mt-4 grid gap-3">
              {[
                { href: "/planejamento", label: "Planner automatico" },
                { href: "/calendario", label: "Calendario editorial" },
                { href: "/agendamentos", label: "Agendamentos e fila Meta" },
                { href: "/integracoes", label: "Painel de integracoes" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/10"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[30px] border border-white/10 bg-white/[0.045] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Auditoria recente
            </p>
            <div className="mt-4 grid gap-3">
              {recentAuditLogs.length > 0 ? (
                recentAuditLogs.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4"
                  >
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                      {formatAuditEvent(entry.event)}
                    </p>
                    <p className="mt-2 text-sm font-medium text-white">
                      {entry.message}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">
                      {new Date(entry.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </article>
                ))
              ) : (
                <p className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300">
                  Ainda nao ha eventos relevantes para mostrar.
                </p>
              )}
            </div>
          </section>
        </aside>
      </section>

      {generatedPostModal ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-[#081726] p-6 shadow-[0_24px_90px_rgb(2_6_23_/_0.48)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-200">
                  Resumo do post
                </p>
                <h3 className="mt-3 max-w-xl font-display text-2xl font-semibold tracking-[-0.04em] text-white">
                  {generatedPostModal.creative.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
              >
                Fechar popup
              </button>
            </div>

            <div className="mt-5 grid gap-4 rounded-[24px] border border-white/10 bg-white/5 p-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Tema
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-200">
                  {generatedPostModal.theme}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Melhor janela sugerida
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-200">
                  {generatedPostModal.creative.generated.bestPostingTime}
                </p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-7 text-slate-300">
              {generatedPostModal.creative.content}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {generatedPostModal.creative.hashtags.slice(0, 6).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>

            {generatedPostModal.format !== "post" ? (
              <div className="mt-5 rounded-[22px] border border-sky-300/18 bg-sky-400/10 px-4 py-4 text-sm leading-7 text-sky-50">
                O popup de publicar/agendar esta pronto para post unico. Para
                carrosseis e reels, siga pelo planner para montar todos os ativos.
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handlePublication("publish")}
                disabled={publicationAction !== null || generatedPostModal.format !== "post"}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-amber-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {publicationAction === "publish" ? "Publicando..." : "Publicar"}
              </button>

              <button
                type="button"
                onClick={() => handlePublication("schedule")}
                disabled={publicationAction !== null || generatedPostModal.format !== "post"}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {publicationAction === "schedule" ? "Agendando..." : "Agendar"}
              </button>

              <button
                type="button"
                onClick={handleCloseModal}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-transparent px-5 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
              >
                Fechar popup
              </button>
            </div>

            <p className="mt-4 text-xs leading-6 text-slate-400">
              Notificacoes do painel vao informar se o post foi publicado agora ou
              agendado para a data sugerida.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
