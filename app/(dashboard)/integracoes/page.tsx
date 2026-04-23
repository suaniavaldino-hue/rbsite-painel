import { IntegrationHealthBoard } from "@/components/integrations/integration-health-board";
import { SecretStatusCard } from "@/components/integrations/secret-status-card";
import { maskSecret } from "@/lib/security/mask";
import { getSupabaseConfigurationStatus } from "@/lib/supabase/server";
import { getGeminiRuntimeConfigFromEnv } from "@/services/ai/gemini.service";

export const dynamic = "force-dynamic";

export default function IntegrationsPage() {
  const supabaseStatus = getSupabaseConfigurationStatus();
  const geminiConfig = getGeminiRuntimeConfigFromEnv();
  const providerCards = [
    {
      id: "smtp",
      title: "Email SMTP",
      description:
        "Valida o envio real de login OTP e recuperacao de senha sem expor previews quando a entrega estiver funcionando.",
      value: maskSecret(process.env.SMTP_FROM?.trim() || process.env.SMTP_HOST?.trim(), 6, 10),
      configured: Boolean(
        process.env.SMTP_HOST?.trim() &&
          process.env.SMTP_PORT?.trim() &&
          process.env.SMTP_FROM?.trim(),
      ),
      endpoint: "/api/integrations/email",
      method: "POST" as const,
      actionLabel: "Enviar email teste",
      metadata: `Preview OTP: ${process.env.AUTH_EMAIL_OTP_PREVIEW === "true" ? "ativo" : "desligado"} | Preview reset: ${process.env.AUTH_SHOW_RESET_TOKEN_PREVIEW === "true" ? "ativo" : "desligado"}`,
    },
    {
      id: "openai",
      title: "OpenAI",
      description:
        "Provedor principal de texto estruturado para titulo, descricao, legenda e hashtags.",
      value: maskSecret(process.env.OPENAI_API_KEY),
      configured: Boolean(process.env.OPENAI_API_KEY?.trim()),
      endpoint: "/api/integrations/openai",
      autoTest: true,
      metadata: `Modelo alvo: ${process.env.OPENAI_CONTENT_MODEL ?? "gpt-5.4-mini"} | Modo: ${process.env.OPENAI_GENERATION_MODE ?? "auto"}`,
    },
    {
      id: "gemini",
      title: "Google Gemini",
      description:
        "Fallback textual e camada multimodal para cenarios alternativos e futuras entradas com imagem.",
      value: maskSecret(process.env.GEMINI_API_KEY),
      configured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      endpoint: "/api/integrations/gemini",
      autoTest: true,
      metadata: `Modelo alvo: ${geminiConfig?.primaryModel ?? "gemini-2.5-flash"} | Fallbacks: ${(geminiConfig?.fallbackModels ?? ["gemini-2.5-flash-lite"]).join(", ")}`,
    },
    {
      id: "meta",
      title: "Meta Graph API",
      description:
        "Valida token, Facebook Page ID e Instagram Business ID em execucao real para publicacao e agendamento.",
      value: maskSecret(process.env.META_GRAPH_API_TOKEN),
      configured: Boolean(process.env.META_GRAPH_API_TOKEN?.trim()),
      endpoint: "/api/integrations/meta",
      autoTest: true,
      metadata: `Versao: ${process.env.META_GRAPH_API_VERSION ?? "v25.0"} | Page ID: ${maskSecret(process.env.META_FACEBOOK_PAGE_ID, 4, 4)} | IG Business ID: ${maskSecret(process.env.META_INSTAGRAM_BUSINESS_ID, 4, 4)}`,
    },
    {
      id: "stability",
      title: "Stability AI",
      description:
        "Gera imagens premium para posts com orientacao visual da marca. O teste real consome creditos.",
      value: maskSecret(process.env.STABILITY_API_KEY),
      configured: Boolean(process.env.STABILITY_API_KEY?.trim()),
      endpoint: "/api/integrations/stability",
      metadata: `Modelo alvo: ${process.env.STABILITY_IMAGE_MODEL ?? "core"}`,
    },
    {
      id: "canva",
      title: "Canva Connect",
      description:
        "Camada de templates visuais. Em producao, a conexao ideal usa OAuth com access token server-side.",
      value: maskSecret(
        process.env.CANVA_ACCESS_TOKEN?.trim() || process.env.CANVA_API_KEY?.trim(),
      ),
      configured: Boolean(
        process.env.CANVA_ACCESS_TOKEN?.trim() || process.env.CANVA_API_KEY?.trim(),
      ),
      endpoint: "/api/integrations/canva",
      autoTest: true,
      metadata:
        "Compatibilidade pronta para OAuth. CANVA_API_KEY funciona aqui apenas como alias de token legado.",
    },
  ];

  return (
    <div className="grid gap-6">
      <section className="surface-card rounded-[32px] p-6 md:p-8 lg:p-9">
        <span className="inline-flex rounded-full border border-emerald-300/18 bg-emerald-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-200">
          Integracoes seguras
        </span>
        <h1 className="mt-5 max-w-4xl font-display text-[2rem] font-semibold tracking-[-0.05em] text-white md:text-[2.75rem] md:leading-[1.02]">
          Centro operacional para validar IA, email real e Meta sem sair do painel.
        </h1>
        <p className="mt-5 max-w-3xl text-[15px] leading-7 text-slate-300 md:text-base md:leading-8">
          As credenciais continuam isoladas do frontend, e agora a tela tambem
          diferencia o que esta apenas configurado do que realmente respondeu em
          execucao no ambiente publicado.
        </p>
      </section>

      <IntegrationHealthBoard cards={providerCards} />

      <section className="grid gap-4 xl:grid-cols-3">
        <SecretStatusCard
          title="Supabase URL"
          description="Origem da persistencia central do painel e base para evolucao SaaS."
          value={maskSecret(process.env.SUPABASE_URL, 10, 12)}
          configured={supabaseStatus.urlConfigured}
          connectionLabel={supabaseStatus.configured ? "pronto" : "pendente"}
          connectionTone={supabaseStatus.configured ? "success" : "warning"}
          metadata={
            supabaseStatus.serviceRoleConfigured
              ? "Service Role presente. Escrita server-side habilitada."
              : "Configure SUPABASE_SERVICE_ROLE_KEY para escrita segura no backend."
          }
        />

        <SecretStatusCard
          title="Infraestrutura de subdominio"
          description="Parametros de dominio, cookies seguros e host canonico para operar em painel.rbsite.com.br."
          value={maskSecret(process.env.APP_CANONICAL_HOST, 10, 10)}
          configured={Boolean(process.env.APP_CANONICAL_HOST?.trim())}
          connectionLabel="subdominio pronto"
          connectionTone="success"
          metadata={`Host canonico atual: ${process.env.APP_CANONICAL_HOST ?? "painel.rbsite.com.br"}`}
        />

        <SecretStatusCard
          title="Modo de geracao"
          description="Define se o produto aceita fallback local ou exige IA real quando o usuario aciona o gerador."
          value={String(process.env.OPENAI_GENERATION_MODE ?? "auto").toUpperCase()}
          configured={true}
          connectionLabel={
            process.env.OPENAI_GENERATION_MODE === "live"
              ? "live obrigatorio"
              : "modo configuravel"
          }
          connectionTone={
            process.env.OPENAI_GENERATION_MODE === "live" ? "success" : "warning"
          }
          metadata="Os fluxos principais do dashboard e planner agora podem exigir modo live sem mascarar falhas com mock silencioso."
        />
      </section>
    </div>
  );
}
