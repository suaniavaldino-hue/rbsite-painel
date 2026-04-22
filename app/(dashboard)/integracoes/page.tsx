import { IntegrationHealthBoard } from "@/components/integrations/integration-health-board";
import { SecretStatusCard } from "@/components/integrations/secret-status-card";
import { maskSecret } from "@/lib/security/mask";
import { getSupabaseConfigurationStatus } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default function IntegrationsPage() {
  const supabaseStatus = getSupabaseConfigurationStatus();
  const aiCards = [
    {
      id: "openai",
      title: "OpenAI",
      description:
        "Provedor principal de texto estruturado para titulo, descricao, legenda e hashtags.",
      value: maskSecret(process.env.OPENAI_API_KEY),
      configured: Boolean(process.env.OPENAI_API_KEY?.trim()),
      endpoint: "/api/integrations/openai",
      autoTest: true,
      metadata: `Modelo alvo: ${process.env.OPENAI_CONTENT_MODEL ?? "gpt-5.4-mini"}`,
    },
    {
      id: "gemini",
      title: "Google Gemini",
      description:
        "Fallback de texto e camada multimodal para cenarios alternativos e futuras entradas com imagem.",
      value: maskSecret(process.env.GEMINI_API_KEY),
      configured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      endpoint: "/api/integrations/gemini",
      autoTest: true,
      metadata: `Modelo alvo: ${process.env.GEMINI_MODEL ?? "gemini-2.5-flash"}`,
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
      <section className="surface-card rounded-[32px] p-6 md:p-8">
        <span className="inline-flex rounded-full border border-emerald-300/18 bg-emerald-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-200">
          Integracoes seguras
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">
          Central multi-IA e infraestrutura protegida.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
          As credenciais continuam isoladas do frontend, mas agora a tela
          tambem expõe a saude operacional das integracoes que sustentam o
          gerador de conteudo premium da RB Site.
        </p>
      </section>

      <IntegrationHealthBoard cards={aiCards} />

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
          title="Meta Graph API Token"
          description="Usado apenas no servidor para testes de conexao, agendamento e publicacao."
          value={maskSecret(process.env.META_GRAPH_API_TOKEN)}
          configured={Boolean(process.env.META_GRAPH_API_TOKEN?.trim())}
          connectionLabel="backend isolado"
          connectionTone="success"
          metadata="Fluxo de publicacao existente mantido e pronto para evolucao."
        />

        <SecretStatusCard
          title="Infraestrutura de subdominio"
          description="Parametros de dominio e cookies seguros para operar em painel.rbsite.com.br."
          value={maskSecret(process.env.APP_CANONICAL_HOST, 10, 10)}
          configured={Boolean(process.env.APP_CANONICAL_HOST?.trim())}
          connectionLabel="subdominio pronto"
          connectionTone="success"
          metadata={`Host canonico atual: ${process.env.APP_CANONICAL_HOST ?? "painel.rbsite.com.br"}`}
        />
      </section>
    </div>
  );
}
