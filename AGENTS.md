# AGENTS.md

## Fonte de verdade

- O app ativo do produto e o projeto Next.js na raiz.
- `app/`, `components/`, `services/`, `actions/`, `lib/` e `types/` formam a arquitetura principal.
- Arquivos HTML/CSS/JS na raiz existem apenas como legado operacional e nao devem receber nova logica de negocio.

## Regras de arquitetura

- Nao acessar o banco diretamente fora de `services/database/content-repository.ts`.
- Nao expor segredos no frontend.
- Toda integracao externa deve passar por `services/`.
- Toda geracao de conteudo deve passar pelo orquestrador em `services/ai/ai-orchestrator.ts`.
- Autorizacao deve acontecer no servidor para APIs, paginas privadas e Server Actions.

## Persistencia

- Supabase e a persistencia central preferencial.
- Quando `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` nao estiverem configurados, o fallback local e apenas para desenvolvimento.
- O schema legado atual da tabela `contents` ainda e minimo. Evolucoes de colunas devem ser feitas sem quebrar compatibilidade.

## Integracoes

- OpenAI: texto principal.
- Gemini: fallback textual e base multimodal.
- Stability AI: geracao de imagem.
- Canva Connect: templates e composicao futura via OAuth/token server-side.
- Meta Graph API: publicacao e agendamento.

## UX e design

- Manter identidade RB Site com navy profundo, branco e laranja como destaque.
- Priorizar aparencia premium, espacamento consistente e boa leitura.
- Evitar interfaces genéricas e repetitivas.

## Seguranca

- Senhas sempre com hash.
- Cookies de sessao seguros.
- Headers de seguranca preservados.
- Chaves apenas em variaveis de ambiente.
- Inputs sempre validados e sanitizados.
