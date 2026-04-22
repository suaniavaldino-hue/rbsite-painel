"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useDeferredValue,
  useState,
  useTransition,
} from "react";

import type { PlannerItem } from "@/types/planner";

type MetaPlannerWorkspaceProps = {
  initialItems: PlannerItem[];
  view: "planner" | "calendar" | "agenda";
};

type PlannerItemsResponse = {
  success: boolean;
  data?: PlannerItem[];
  error?: string;
};

type GenerateResponse = {
  success: boolean;
  data?: {
    items: PlannerItem[];
  };
  error?: string;
};

type ItemMutationResponse = {
  success: boolean;
  data?: {
    item: PlannerItem;
  } | PlannerItem;
  error?: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toDatetimeLocalValue(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const normalizedDate = new Date(date.getTime() - offset * 60 * 1000);

  return normalizedDate.toISOString().slice(0, 16);
}

function fromDatetimeLocalValue(value: string) {
  return new Date(value).toISOString();
}

function summarizePlatforms(platform: PlannerItem["platform"]) {
  if (platform === "both") {
    return "Instagram + Facebook";
  }

  return platform === "instagram" ? "Instagram" : "Facebook";
}

function summarizeFormat(format: PlannerItem["format"]) {
  if (format === "carousel") {
    return "Carrossel";
  }

  if (format === "reel") {
    return "Reel";
  }

  return "Post";
}

function statusTone(status: string) {
  if (status === "published") {
    return "border-emerald-300/20 bg-emerald-300/10 text-emerald-100";
  }

  if (status === "failed") {
    return "border-rose-300/20 bg-rose-400/10 text-rose-100";
  }

  if (status === "planned") {
    return "border-sky-300/20 bg-sky-400/10 text-sky-100";
  }

  return "border-amber-300/20 bg-amber-300/10 text-amber-100";
}

function mapItemMutationPayload(response: ItemMutationResponse) {
  if (!response.data) {
    return null;
  }

  if ("item" in response.data) {
    return response.data.item;
  }

  return response.data;
}

function groupItemsByDay(items: PlannerItem[]) {
  return items.reduce<Record<string, PlannerItem[]>>((collection, item) => {
    const key = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "short",
    }).format(new Date(item.scheduledFor));

    collection[key] = collection[key] ? [...collection[key], item] : [item];
    return collection;
  }, {});
}

export function MetaPlannerWorkspace({
  initialItems,
  view,
}: MetaPlannerWorkspaceProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [isPending, startTransition] = useTransition();
  const [generationMode, setGenerationMode] = useState<"single" | "batch">(
    "single",
  );
  const [theme, setTheme] = useState("Seu site pode estar afastando clientes");
  const [themesInput, setThemesInput] = useState(
    [
      "Seu site pode estar afastando clientes",
      "Instagram nao substitui um site profissional",
      "Landing page boa gera mais leads",
    ].join("\n"),
  );
  const [objective, setObjective] = useState("Gerar leads qualificados");
  const [format, setFormat] = useState<PlannerItem["format"]>("post");
  const [formatStrategy, setFormatStrategy] = useState<
    "single_format" | "mixed"
  >("mixed");
  const [platform, setPlatform] = useState<PlannerItem["platform"]>("both");
  const [voiceTone, setVoiceTone] = useState("Profissional e estrategico");
  const [cta, setCta] = useState("Fale com a RB Site no WhatsApp");
  const [audience, setAudience] = useState("Empresarios e negocios locais");
  const [funnelStage, setFunnelStage] = useState<"top" | "middle" | "bottom">(
    "middle",
  );
  const [quantity, setQuantity] = useState(6);
  const [extraContext, setExtraContext] = useState(
    "Priorize linguagem premium, forte apelo comercial e visual limpo no estilo SaaS de alto padrao.",
  );

  const filteredItems = items.filter((item) => {
    if (!deferredSearch.trim()) {
      return true;
    }

    const normalizedSearch = deferredSearch.toLowerCase();

    return (
      item.theme.toLowerCase().includes(normalizedSearch) ||
      item.content.title.toLowerCase().includes(normalizedSearch) ||
      item.objective.toLowerCase().includes(normalizedSearch)
    );
  });

  const groupedItems = groupItemsByDay(filteredItems);
  const scheduledCount = items.filter((item) => item.status === "scheduled").length;
  const publishedCount = items.filter((item) => item.status === "published").length;
  const carouselCount = items.filter((item) => item.format === "carousel").length;

  async function refreshItems() {
    const response = await fetch("/api/planner/items", {
      credentials: "include",
    });
    const result = (await response.json()) as PlannerItemsResponse;

    if (response.ok && result.success && result.data) {
      setItems(result.data);
    }
  }

  function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFeedback(null);

    startTransition(async () => {
      const payload =
        generationMode === "single"
          ? {
              mode: "single",
              theme,
              objective,
              format,
              formatStrategy: "single_format",
              platform,
              voiceTone,
              cta,
              audience,
              funnelStage,
              extraContext,
              providerMode: "live",
              fallbackToMock: false,
            }
          : {
              mode: "batch",
              themes: themesInput
                .split("\n")
                .map((entry) => entry.trim())
                .filter(Boolean),
              quantity,
              objective,
              format,
              formatStrategy,
              platform,
              voiceTone,
              cta,
              audience,
              funnelStage,
              extraContext,
              providerMode: "live",
              fallbackToMock: false,
            };

      const response = await fetch("/api/planner/generate", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as GenerateResponse;

      if (!response.ok || !result.success || !result.data) {
        setError(result.error ?? "Nao foi possivel gerar os itens do planner.");
        return;
      }

      await refreshItems();
      setFeedback(
        `${result.data.items.length} item(ns) gerado(s) em modo live com agenda sugerida e persistencia central no planner.`,
      );
      router.refresh();
    });
  }

  function handleSyncMeta(itemId: string) {
    setError(null);
    setFeedback(null);
    setPendingItemId(itemId);

    startTransition(async () => {
      const response = await fetch(`/api/planner/items/${itemId}/meta`, {
        method: "POST",
        credentials: "include",
      });
      const result = (await response.json()) as ItemMutationResponse;
      const nextItem = mapItemMutationPayload(result);

      if (!response.ok || !result.success || !nextItem) {
        setError(result.error ?? "Nao foi possivel sincronizar com a Meta.");
        setPendingItemId(null);
        return;
      }

      setItems((currentItems) =>
        currentItems.map((item) => (item.id === nextItem.id ? nextItem : item)),
      );
      setFeedback("Item sincronizado com o fluxo Meta e refletido no planner.");
      setPendingItemId(null);
      router.refresh();
    });
  }

  function handleReschedule(itemId: string, scheduledFor: string) {
    setError(null);
    setFeedback(null);
    setPendingItemId(itemId);

    startTransition(async () => {
      const response = await fetch(`/api/planner/items/${itemId}/schedule`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scheduledFor,
        }),
      });
      const result = (await response.json()) as ItemMutationResponse;
      const nextItem = mapItemMutationPayload(result);

      if (!response.ok || !result.success || !nextItem) {
        setError(result.error ?? "Nao foi possivel reagendar o item.");
        setPendingItemId(null);
        return;
      }

      setItems((currentItems) =>
        currentItems.map((item) => (item.id === nextItem.id ? nextItem : item)),
      );
      setFeedback("Horario atualizado e fila Meta redefinida para o novo slot.");
      setPendingItemId(null);
      router.refresh();
    });
  }

  function renderPlannerCards(showFullAgenda = false) {
    return (
      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {filteredItems.map((item) => (
          <article
            key={item.id}
            className="surface-card overflow-hidden rounded-[28px] border border-white/10"
          >
            <div className="relative aspect-square overflow-hidden border-b border-white/10 bg-slate-950/30">
              <Image
                src={item.assets.primaryUrl}
                alt={item.content.title}
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, (max-width: 1536px) 50vw, 33vw"
                className="object-cover"
              />
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/12 bg-slate-950/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white">
                  {summarizeFormat(item.format)}
                </span>
                <span className="rounded-full border border-amber-300/20 bg-amber-300/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100">
                  {summarizePlatforms(item.platform)}
                </span>
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                    {item.theme}
                  </p>
                  <h3 className="mt-3 font-display text-[1.35rem] font-semibold leading-[1.08] tracking-[-0.03em] text-white md:text-[1.5rem]">
                    {item.content.title}
                  </h3>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${statusTone(item.status)}`}
                >
                  {item.status}
                </span>
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-300">
                {item.content.subtitle}
              </p>

              <div className="mt-5 grid gap-3 rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    Melhor janela
                  </span>
                  <span className="text-sm font-semibold text-amber-100">
                    {item.content.bestPostingTime}
                  </span>
                </div>
                <p className="text-sm leading-7 text-slate-300">
                  {item.content.postingSuggestion.rationale}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {item.content.hashtags.instagram.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-6 grid gap-3 rounded-[24px] border border-white/10 bg-slate-950/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    Meta planner
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatDateTime(item.scheduledFor)}
                  </span>
                </div>

                {item.metaBoard.facebook ? (
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Facebook</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {item.metaBoard.facebook.note ??
                          "Pronto para fila nativa do Facebook."}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${statusTone(item.metaBoard.facebook.status)}`}
                    >
                      {item.metaBoard.facebook.status}
                    </span>
                  </div>
                ) : null}

                {item.metaBoard.instagram ? (
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Instagram</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {item.metaBoard.instagram.note ??
                          "Pronto para fila do Instagram."}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${statusTone(item.metaBoard.instagram.status)}`}
                    >
                      {item.metaBoard.instagram.status}
                    </span>
                  </div>
                ) : null}
              </div>

              {showFullAgenda ? (
                <div className="mt-5 grid gap-3 rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Reagendar
                    </span>
                    <input
                      type="datetime-local"
                      defaultValue={toDatetimeLocalValue(item.scheduledFor)}
                      className="h-12 rounded-2xl border border-white/10 bg-slate-950/40 px-4 text-sm text-white outline-none"
                      onBlur={(event) => {
                        const nextValue = event.currentTarget.value;

                        if (!nextValue) {
                          return;
                        }

                        const nextIsoDate = fromDatetimeLocalValue(nextValue);

                        if (nextIsoDate !== item.scheduledFor) {
                          handleReschedule(item.id, nextIsoDate);
                        }
                      }}
                    />
                  </label>
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleSyncMeta(item.id)}
                  disabled={isPending || item.format === "reel"}
                  className="inline-flex items-center justify-center rounded-full bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {item.format === "reel"
                    ? "Video automatico em breve"
                    : pendingItemId === item.id
                      ? "Sincronizando..."
                      : "Enviar ao Meta planner"}
                </button>
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-400">
                  ID {item.id.slice(0, 8)}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="surface-card rounded-[32px] p-6 md:p-8 lg:p-9">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-[50rem]">
            <span className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-200">
              Meta planner engine
            </span>
            <h1 className="mt-5 max-w-4xl font-display text-[2rem] font-semibold tracking-[-0.05em] text-white md:text-[2.75rem] md:leading-[1.02]">
              Gere conteudo e agenda com fluxo automatico, mas mantendo o modo
              live como regra para operacao real.
            </h1>
            <p className="mt-5 max-w-3xl text-[15px] leading-7 text-slate-300 md:text-base md:leading-8">
              O planner organiza titulo, descricao, hashtags, imagem premium,
              lote em massa, melhor data e horario, depois encaminha cada item
              para a fila operacional da Meta com mais clareza visual e menos
              ruido na leitura.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                Provider mode live
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                Fallback mock desligado
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                Agenda pronta para Meta
              </span>
            </div>
          </div>

          <div className="grid w-full max-w-[22rem] gap-3 rounded-[28px] border border-white/10 bg-slate-950/40 p-4 md:p-5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs uppercase tracking-[0.28em] text-slate-400">
                Estado atual
              </span>
              <span className="rounded-full border border-emerald-400/18 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-100">
                planner ativo
              </span>
            </div>

            <div className="grid gap-2 text-sm text-slate-200">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Itens no planner</span>
                <span>{items.length}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Agendados</span>
                <span>{scheduledCount}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Publicados</span>
                <span>{publishedCount}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Carrosseis</span>
                <span>{carouselCount}</span>
              </div>
            </div>
          </div>
        </div>
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

      {view === "planner" ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)]">
          <form
            onSubmit={handleGenerate}
            className="surface-card rounded-[32px] p-6 md:p-8"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Prompt central
                </p>
                <h2 className="mt-3 font-display text-[1.7rem] font-semibold tracking-[-0.03em] text-white md:text-[2rem]">
                  Gerar no automatico
                </h2>
              </div>

              <div className="flex gap-2 rounded-full border border-white/10 bg-white/5 p-1">
                {[
                  { value: "single", label: "Single" },
                  { value: "batch", label: "Em massa" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setGenerationMode(option.value as "single" | "batch")
                    }
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      generationMode === option.value
                        ? "bg-amber-500 text-slate-950"
                        : "text-slate-300"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-7 text-slate-300">
              O planner executa agora em modo live, sem esconder falhas de OpenAI,
              Gemini ou Stability com fallback local silencioso.
            </div>

            <div className="mt-8 grid gap-4">
              {generationMode === "single" ? (
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Tema principal
                  </span>
                  <input
                    value={theme}
                    onChange={(event) => setTheme(event.target.value)}
                    className="h-14 rounded-2xl border border-white/10 bg-slate-950/40 px-4 text-white outline-none"
                  />
                </label>
              ) : (
                <>
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Temas em massa
                    </span>
                    <textarea
                      value={themesInput}
                      onChange={(event) => setThemesInput(event.target.value)}
                      rows={7}
                      className="rounded-[24px] border border-white/10 bg-slate-950/40 px-4 py-4 text-white outline-none"
                    />
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Quantidade
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={quantity}
                        onChange={(event) => setQuantity(Number(event.target.value))}
                        className="h-14 rounded-2xl border border-white/10 bg-slate-950/40 px-4 text-white outline-none"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Estrategia de formato
                      </span>
                      <select
                        value={formatStrategy}
                        onChange={(event) =>
                          setFormatStrategy(
                            event.target.value as "single_format" | "mixed",
                          )
                        }
                        className="h-14 rounded-2xl border border-white/10 bg-slate-950/40 px-4 text-white outline-none"
                      >
                        <option value="mixed">Misturar post, carrossel e reel</option>
                        <option value="single_format">Usar um formato so</option>
                      </select>
                    </label>
                  </div>
                </>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Objetivo
                  </span>
                  <input
                    value={objective}
                    onChange={(event) => setObjective(event.target.value)}
                    className="h-14 rounded-2xl border border-white/10 bg-slate-950/40 px-4 text-white outline-none"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Formato base
                  </span>
                  <select
                    value={format}
                    onChange={(event) =>
                      setFormat(event.target.value as PlannerItem["format"])
                    }
                    className="h-14 rounded-2xl border border-white/10 bg-slate-950/40 px-4 text-white outline-none"
                  >
                    <option value="post">Post unico</option>
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
                      setPlatform(event.target.value as PlannerItem["platform"])
                    }
                    className="h-14 rounded-2xl border border-white/10 bg-slate-950/40 px-4 text-white outline-none"
                  >
                    <option value="both">Instagram + Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Etapa do funil
                  </span>
                  <select
                    value={funnelStage}
                    onChange={(event) =>
                      setFunnelStage(
                        event.target.value as "top" | "middle" | "bottom",
                      )
                    }
                    className="h-14 rounded-2xl border border-white/10 bg-slate-950/40 px-4 text-white outline-none"
                  >
                    <option value="top">Topo</option>
                    <option value="middle">Meio</option>
                    <option value="bottom">Fundo</option>
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Tom de voz
                  </span>
                  <input
                    value={voiceTone}
                    onChange={(event) => setVoiceTone(event.target.value)}
                    className="h-14 rounded-2xl border border-white/10 bg-slate-950/40 px-4 text-white outline-none"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Publico
                  </span>
                  <input
                    value={audience}
                    onChange={(event) => setAudience(event.target.value)}
                    className="h-14 rounded-2xl border border-white/10 bg-slate-950/40 px-4 text-white outline-none"
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  CTA
                </span>
                <input
                  value={cta}
                  onChange={(event) => setCta(event.target.value)}
                  className="h-14 rounded-2xl border border-white/10 bg-slate-950/40 px-4 text-white outline-none"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Direcao extra
                </span>
                <textarea
                  value={extraContext}
                  onChange={(event) => setExtraContext(event.target.value)}
                  rows={4}
                  className="rounded-[24px] border border-white/10 bg-slate-950/40 px-4 py-4 text-white outline-none"
                />
              </label>

              <button
                type="submit"
                disabled={isPending}
                className="mt-2 inline-flex h-14 items-center justify-center rounded-2xl bg-amber-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? "Gerando..." : "Gerar planner automatico"}
              </button>
            </div>
          </form>

          <div className="surface-card rounded-[32px] p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Saida automatica
                </p>
                <h2 className="mt-3 font-display text-[1.85rem] font-semibold tracking-[-0.03em] text-white md:text-[2.15rem]">
                  Ultimos itens gerados
                </h2>
              </div>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por tema"
                className="h-12 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
              />
            </div>

            <div className="mt-8">
              {filteredItems.length > 0 ? (
                renderPlannerCards(false)
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/14 bg-white/5 px-5 py-6 text-sm text-slate-300">
                  Nenhum item ainda. Gere um lote para o planner automatico montar
                  titulos, legendas, tags, imagens e agenda.
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {view === "calendar" ? (
        <section className="surface-card rounded-[32px] p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Calendario inteligente
              </p>
              <h2 className="mt-3 font-display text-[1.65rem] font-semibold tracking-[-0.03em] text-white md:text-[2rem]">
                Visao editorial no estilo Meta planner
              </h2>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por tema"
              className="h-12 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
            {Object.entries(groupedItems).map(([day, dayItems]) => (
              <div
                key={day}
                className="rounded-[28px] border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                      Dia
                    </p>
                    <h3 className="mt-2 font-display text-xl font-semibold text-white">
                      {day}
                    </h3>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                    {dayItems.length} item(ns)
                  </span>
                </div>

                <div className="mt-5 grid gap-3">
                  {dayItems.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-[24px] border border-white/10 bg-slate-950/30 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full border border-amber-300/16 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100">
                          {summarizeFormat(item.format)}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Intl.DateTimeFormat("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(item.scheduledFor))}
                        </span>
                      </div>

                      <h4 className="mt-4 text-lg font-semibold text-white">
                        {item.content.title}
                      </h4>
                      <p className="mt-2 text-sm leading-7 text-slate-300">
                        {item.theme}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.metaBoard.facebook ? (
                          <span
                            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${statusTone(item.metaBoard.facebook.status)}`}
                          >
                            FB {item.metaBoard.facebook.status}
                          </span>
                        ) : null}
                        {item.metaBoard.instagram ? (
                          <span
                            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${statusTone(item.metaBoard.instagram.status)}`}
                          >
                            IG {item.metaBoard.instagram.status}
                          </span>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {view === "agenda" ? (
        <section className="surface-card rounded-[32px] p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Agenda operacional
              </p>
              <h2 className="mt-3 font-display text-[1.65rem] font-semibold tracking-[-0.03em] text-white md:text-[2rem]">
                Fila pronta para Meta
              </h2>
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por tema"
              className="h-12 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
            />
          </div>

          <div className="mt-4 rounded-[24px] border border-white/10 bg-amber-300/8 px-5 py-4 text-sm leading-7 text-amber-50/90">
            Esta area mostra a visao operacional do Meta Planner dentro do painel.
            Facebook usa agendamento nativo quando a API permite; Instagram pode
            ficar como fila interna planejada ate o momento exato da publicacao.
          </div>

          <div className="mt-8">
            {filteredItems.length > 0 ? (
              renderPlannerCards(true)
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/14 bg-white/5 px-5 py-6 text-sm text-slate-300">
                Nenhum item encontrado para a busca atual.
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
