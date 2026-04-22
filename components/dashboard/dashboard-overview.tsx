"use client";

import Link from "next/link";
import { useDeferredValue, useState, useTransition } from "react";

import type { AiOrchestratorResult } from "@/types/ai";
import type { ContentRecord, ContentStatus } from "@/types/content";
import type { ContentFormat, SocialPlatform } from "@/types/content-generation";
import type { AuditLogEntry } from "@/lib/security/types";

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

  if (value === "canva") {
    return "Canva";
  }

  if (value === "mock") {
    return "Mock local";
  }

  return value;
}

export function DashboardOverview({
  initialContents,
  recentAuditLogs,
}: DashboardOverviewProps) {
  const [contents, setContents] = useState(initialContents);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ContentFormat | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "all">("all");
  const [theme, setTheme] = useState("Seu site pode estar afastando clientes");
  const [format, setFormat] = useState<ContentFormat>("post");
  const [platform, setPlatform] = useState<SocialPlatform>("both");
  const [latestCreative, setLatestCreative] = useState<AiOrchestratorResult | null>(
    null,
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);
  const [isPending, startTransition] = useTransition();

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
            "Layout premium, linguagem forte, foco em conversao e identidade visual da RB Site.",
          mode: "live",
          fallbackToMock: false,
        }),
      });

      const result = (await response.json()) as GenerateApiResponse;

      if (!response.ok || !result.success || !result.data) {
        setError(result.error ?? "Nao foi possivel gerar o conteudo.");
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
      setFeedback(
        result.data.creative.meta.usedMockFallback
          ? "Conteudo salvo, mas uma etapa ainda caiu em fallback local. Revise as integracoes antes de publicar."
          : `Conteudo gerado em modo live via ${textProvider} + ${imageProvider} e salvo na base central do painel.`,
      );
    });
  }

  return (
    <div className="grid gap-6">
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
              com OpenAI, Gemini, Stability, Canva e Meta com diagnostico claro
              quando alguma integracao nao responder em producao.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                Modo live obrigatorio
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                Fallback mock desativado
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                Planner e dashboard alinhados
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
              Se OpenAI, Gemini ou Stability falharem, o painel agora retorna o
              erro real em vez de mascarar a operacao com conteudo mock.
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
    </div>
  );
}
