"use client";

import { useEffect, useState, useTransition } from "react";

import { SecretStatusCard } from "@/components/integrations/secret-status-card";

type ProviderCard = {
  id: string;
  title: string;
  description: string;
  value: string;
  configured: boolean;
  endpoint?: string;
  autoTest?: boolean;
  metadata?: string;
};

type IntegrationHealthBoardProps = {
  cards: ProviderCard[];
};

type ProviderResult = {
  status: "idle" | "loading" | "success" | "error" | "warning";
  label: string;
  metadata?: string;
};

type ProviderApiResponse = {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
};

function resolveSuccessMetadata(data?: Record<string, unknown>) {
  if (!data) {
    return undefined;
  }

  const parts = [
    typeof data.model === "string" ? `Modelo: ${data.model}` : null,
    typeof data.message === "string" ? data.message : null,
    typeof data.appUrl === "string" ? `App: ${data.appUrl}` : null,
  ].filter(Boolean);

  return parts.join(" | ") || undefined;
}

export function IntegrationHealthBoard({
  cards,
}: IntegrationHealthBoardProps) {
  const [providerResults, setProviderResults] = useState<
    Record<string, ProviderResult>
  >({});
  const [isTesting, startTransition] = useTransition();

  async function runTest(card: ProviderCard) {
    const endpoint = card.endpoint;

    if (!endpoint || !card.configured) {
      setProviderResults((current) => ({
        ...current,
        [card.id]: {
          status: "warning",
          label: card.configured ? "sem endpoint" : "pendente",
          metadata: card.configured
            ? "Este provedor ainda nao possui endpoint de teste publicado."
            : "Configure as credenciais para habilitar o teste real.",
        },
      }));
      return;
    }

    startTransition(async () => {
      setProviderResults((current) => ({
        ...current,
        [card.id]: {
          status: "loading",
          label: "testando",
        },
      }));

      try {
        const response = await fetch(endpoint, {
          credentials: "include",
        });
        const result = (await response.json()) as ProviderApiResponse;

        if (!response.ok || !result.success) {
          setProviderResults((current) => ({
            ...current,
            [card.id]: {
              status: "error",
              label: "erro",
              metadata:
                result.error ??
                "O provedor respondeu com falha durante o healthcheck.",
            },
          }));
          return;
        }

        setProviderResults((current) => ({
          ...current,
          [card.id]: {
            status: "success",
            label: "conectado",
            metadata: resolveSuccessMetadata(result.data),
          },
        }));
      } catch (error) {
        setProviderResults((current) => ({
          ...current,
          [card.id]: {
            status: "error",
            label: "erro",
            metadata:
              error instanceof Error
                ? error.message
                : "Falha inesperada ao testar a integracao.",
          },
        }));
      }
    });
  }

  useEffect(() => {
    cards
      .filter((card) => card.autoTest && card.configured && card.endpoint)
      .forEach((card) => {
        void runTest(card);
      });
  }, [cards]);

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      {cards.map((card) => {
        const providerResult = providerResults[card.id];
        const tone =
          providerResult?.status === "success"
            ? "success"
            : providerResult?.status === "error"
              ? "error"
              : providerResult?.status === "loading"
                ? "warning"
                : "default";

        return (
          <SecretStatusCard
            key={card.id}
            title={card.title}
            description={card.description}
            value={card.value}
            configured={card.configured}
            connectionLabel={providerResult?.label ?? "aguardando teste"}
            connectionTone={tone}
            metadata={providerResult?.metadata ?? card.metadata}
            action={
              card.endpoint ? (
                <button
                  type="button"
                  onClick={() => void runTest(card)}
                  disabled={isTesting}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {providerResult?.status === "loading"
                    ? "Testando..."
                    : "Testar conexao"}
                </button>
              ) : null
            }
          />
        );
      })}
    </section>
  );
}
