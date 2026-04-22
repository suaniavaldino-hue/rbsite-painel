# RB Site Social Automation

Painel premium da RB Site para gerar conteudo com IA, organizar biblioteca editorial, operar planner e preparar publicacao para Instagram e Facebook.

## Estado atual

O repositorio foi consolidado para usar o app Next.js na raiz como fonte de verdade do produto. Nesta iteracao, a base foi refatorada para:

- limpar duplicacoes e residuos legados do workspace
- criar um repositório central de conteudos
- conectar persistencia via Supabase com fallback local de desenvolvimento
- introduzir um sistema multi-IA com OpenAI, Gemini, Stability AI e Canva Connect
- refazer o dashboard sobre a nova camada central de dados
- fechar as rotas do menu lateral que estavam faltando

## Arquitetura

```text
app/
  (auth)/
  (dashboard)/
  api/
actions/
  contents/
components/
  auth/
  dashboard/
  integrations/
  layout/
  planning/
  security/
  ui/
lib/
  auth/
  security/
  supabase/
  utils/
  validations/
services/
  ai/
  database/
  meta/
  planner/
types/
```

## Fonte de verdade

- O painel ativo e o app Next.js na raiz.
- Os arquivos HTML/CSS/JS na raiz continuam apenas como legado operacional e nao devem receber nova logica de negocio.
- Todo acesso ao banco deve passar por `services/database/content-repository.ts`.
- Toda geracao deve passar por `services/ai/ai-orchestrator.ts`.

## Camadas principais

### 1. Data layer

Arquivo central:

- [services/database/content-repository.ts](</C:/Users/bruce/OneDrive/Desktop/PROJETOS/rb site/Sistema SM/services/database/content-repository.ts>)

Funcoes expostas:

- `listContents()`
- `createContent()`
- `getContentById()`
- `updateContent()`

Fluxo:

1. Tenta usar Supabase com `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
2. Se as credenciais nao existirem, usa fallback local em `.rbsite-data/contents.json`

### 2. Sistema multi-IA

Arquivos:

- [services/ai/openai.service.ts](</C:/Users/bruce/OneDrive/Desktop/PROJETOS/rb site/Sistema SM/services/ai/openai.service.ts>)
- [services/ai/gemini.service.ts](</C:/Users/bruce/OneDrive/Desktop/PROJETOS/rb site/Sistema SM/services/ai/gemini.service.ts>)
- [services/ai/stability.service.ts](</C:/Users/bruce/OneDrive/Desktop/PROJETOS/rb site/Sistema SM/services/ai/stability.service.ts>)
- [services/ai/canva.service.ts](</C:/Users/bruce/OneDrive/Desktop/PROJETOS/rb site/Sistema SM/services/ai/canva.service.ts>)
- [services/ai/ai-orchestrator.ts](</C:/Users/bruce/OneDrive/Desktop/PROJETOS/rb site/Sistema SM/services/ai/ai-orchestrator.ts>)

Responsabilidades:

- OpenAI: geracao principal de texto estruturado
- Gemini: fallback textual e base para multimodal
- Stability AI: imagem premium
- Canva Connect: conexao para templates e composicao futura
- Orchestrator: decide o provedor, faz fallback e retorna o payload unificado

Payload central:

```json
{
  "title": "string",
  "content": "string",
  "caption": "string",
  "hashtags": ["#tag"],
  "image_url": "string"
}
```

### 3. Acao central de geracao

Arquivo:

- [actions/contents/generate-content.ts](</C:/Users/bruce/OneDrive/Desktop/PROJETOS/rb site/Sistema SM/actions/contents/generate-content.ts>)

Fluxo:

1. valida o input
2. chama o orquestrador multi-IA
3. salva no repositório central
4. devolve o payload estruturado + registro persistido

## Dashboard

O dashboard foi reconstruido para usar a camada central de dados e agora inclui:

- geracao rapida por tema
- ultimo resultado com preview da imagem
- cards de estatisticas
- filtro por busca, formato e status
- grid premium de conteudos salvos
- atalhos para planner, calendario e integracoes
- auditoria recente

Arquivos principais:

- [app/(dashboard)/dashboard/page.tsx](</C:/Users/bruce/OneDrive/Desktop/PROJETOS/rb site/Sistema SM/app/(dashboard)/dashboard/page.tsx>)
- [components/dashboard/dashboard-overview.tsx](</C:/Users/bruce/OneDrive/Desktop/PROJETOS/rb site/Sistema SM/components/dashboard/dashboard-overview.tsx>)

## Rotas principais

### App

- `/`
- `/login`
- `/dashboard`
- `/planejamento`
- `/calendario`
- `/agendamentos`
- `/posts`
- `/carrosseis`
- `/reels`
- `/historico`
- `/legendas`
- `/hashtags`
- `/templates`
- `/integracoes`
- `/configuracoes`

### APIs internas

- `GET /api/health`
- `GET /api/contents`
- `GET /api/contents/[id]`
- `PATCH /api/contents/[id]`
- `POST /api/contents/generate`
- `GET /api/integrations/openai`
- `GET /api/integrations/gemini`
- `GET /api/integrations/stability`
- `GET /api/integrations/canva`
- `GET /api/integrations/meta`
- `GET /api/planner/items`
- `POST /api/planner/generate`
- `POST /api/planner/items/[id]/schedule`
- `POST /api/planner/items/[id]/meta`

## Variaveis de ambiente

Base do app:

```bash
NEXT_PUBLIC_APP_NAME=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_COMPANY_NAME=
NEXT_PUBLIC_COMPANY_SITE=
NEXT_PUBLIC_COMPANY_WHATSAPP=
NEXT_PUBLIC_DEFAULT_TIMEZONE=
```

Autenticacao e seguranca:

```bash
AUTH_SECRET=
NEXTAUTH_URL=
AUTH_ADMIN_EMAIL=
AUTH_ADMIN_NAME=
AUTH_ADMIN_PASSWORD_HASH=
AUTH_COOKIE_DOMAIN=
AUTH_SECURITY_DATA_DIR=
```

Banco e persistencia:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
CONTENT_DATA_DIR=
```

IAs e criativos:

```bash
OPENAI_API_KEY=
OPENAI_GENERATION_MODE=
OPENAI_CONTENT_MODEL=
OPENAI_REASONING_EFFORT=
OPENAI_TEXT_VERBOSITY=

GEMINI_API_KEY=
GEMINI_MODEL=

STABILITY_API_KEY=
STABILITY_IMAGE_MODEL=

CANVA_API_KEY=
CANVA_ACCESS_TOKEN=
CANVA_CLIENT_ID=
CANVA_CLIENT_SECRET=
CANVA_REDIRECT_URI=
```

Publicacao:

```bash
META_GRAPH_API_TOKEN=
META_GRAPH_API_VERSION=
META_FACEBOOK_PAGE_ID=
META_INSTAGRAM_BUSINESS_ID=
```

## Observacao importante sobre Canva

O fluxo real do Canva Connect e baseado em OAuth/access token. O campo `CANVA_API_KEY` foi mantido como alias de compatibilidade, mas o caminho recomendado para producao e usar `CANVA_ACCESS_TOKEN` com credenciais OAuth.

## Como rodar localmente

```bash
npm install
npm run dev
```

Para validar:

```bash
npm run typecheck
npm run build
```

## Deploy em subdominio

Exemplo alvo:

- `https://painel.rbsite.com.br`

Checklist:

1. apontar DNS do subdominio para a VPS
2. configurar SSL valido
3. preencher `.env.production`
4. definir `NEXTAUTH_URL=https://painel.rbsite.com.br`
5. definir `APP_CANONICAL_HOST=painel.rbsite.com.br`
6. configurar `AUTH_COOKIE_DOMAIN=.rbsite.com.br` se quiser compartilhar cookies entre subdominios
7. garantir `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`
8. rodar `npm ci && npm run build`
9. iniciar com `npm run start` ou `npm run start:standalone`

Arquivos de deploy existentes:

- [docs/deploy-producao-painel-rbsite.md](</C:/Users/bruce/OneDrive/Desktop/PROJETOS/rb site/Sistema SM/docs/deploy-producao-painel-rbsite.md>)
- [deploy/nginx/painel.rbsite.com.br.conf](</C:/Users/bruce/OneDrive/Desktop/PROJETOS/rb site/Sistema SM/deploy/nginx/painel.rbsite.com.br.conf>)
- [deploy/systemd/rbsite-social-automation.service](</C:/Users/bruce/OneDrive/Desktop/PROJETOS/rb site/Sistema SM/deploy/systemd/rbsite-social-automation.service>)

## Seguranca

Ja coberto na base atual:

- hash de senha com Argon2id
- sessao via cookie seguro
- protecao de rotas privadas
- proxy para paginas e APIs
- rate limiting e lockout
- reset de senha
- suporte a 2FA
- headers de seguranca
- mascaramento de segredos
- logs de auditoria

## Proximos passos recomendados

1. expandir o schema do Supabase para persistir legenda, hashtags e imagem por colunas dedicadas
2. conectar Canva Connect com fluxo OAuth completo
3. mover estado do planner e seguranca para Supabase/Postgres
4. evoluir a tela de legendas/hashtags para usar o schema expandido
