# ETAPA 1 - Planejamento Tecnico e Estrutura do Projeto

## 1. Visao do Produto

Construir um SaaS interno da RB Site para planejamento, geracao, organizacao, agendamento e futura publicacao automatizada de conteudos para Instagram e Facebook, com arquitetura preparada para:

- deploy em subdominio como `painel.rbsite.com.br` ou `social.rbsite.com.br`
- operacao em VPS Hostinger com SSL e reverse proxy
- compatibilidade com Railway/Render
- integracao futura com OpenAI, Meta Graph API, Google Calendar e webhooks
- manutencao simples, segura e escalavel

## 2. Stack Definida

### Frontend

- Next.js 16+ com App Router
- TypeScript
- Tailwind CSS
- shadcn/ui como base de primitives reutilizaveis
- Lucide icons
- Motion com Framer Motion para animacoes sutis

### Backend

- Next.js Route Handlers para API interna
- Server Actions para operacoes de formularios e escrita controlada
- Services desacoplados para IA, Meta, agendamento e configuracoes da marca

### Dados e autenticacao

- PostgreSQL como banco principal
- Prisma ORM para schema, migrations e seeds
- Auth.js com provider de credenciais e sessao segura
- Senhas com hash `bcrypt`

### Producao

- Build Next.js `standalone`
- Reverse proxy com Nginx ou Caddy
- Variaveis de ambiente por ambiente
- Cron externo ou worker interno para processamento de agendamentos

## 3. Direcao Visual e de UX

Referencia principal: [rbsite.com.br](https://rbsite.com.br/)

Leituras de marca utilizadas na arquitetura visual:

- tom comercial e estrategico, sem excesso de artificio visual
- proposta de valor centrada em performance, conversao e autoridade
- linguagem premium voltada a empresas e negocios locais
- UX limpa, com forte foco em confianca, clareza e produtividade

Direcao visual prevista para o painel:

- base grafite/chumbo para profundidade premium
- acentos quentes inspirados na presenca comercial da marca
- cards com brilho sutil, bordas suaves e contraste refinado
- tipografia editorial para headlines e grotesca profissional para UI
- sidebar densa, elegante e orientada a produtividade
- topbar com busca, status e acoes rapidas
- graficos e calendarios com leitura empresarial

## 4. Arquitetura Sugerida

Arquitetura monolitica modular dentro do proprio projeto Next.js, com separacao clara entre experiencia, dominio e integracoes.

### Camadas

1. `app/`
Responsavel por rotas, layouts, paginas, loading states, error boundaries e handlers HTTP.

2. `components/`
Componentes de UI, shell, formularios, tabelas, metricas, calendario e modulos de negocio.

3. `actions/`
Server Actions orientadas a casos de uso.

4. `lib/`
Helpers, auth config, validacoes, formatadores, constants, mapeamentos e utilitarios compartilhados.

5. `services/`
Camada de integracao e orquestracao. Aqui ficam OpenAI, Meta Graph API, agenda automatica e regras de negocio compostas.

6. `database/` ou `prisma/`
Schema, migrations, seeds e acesso ao banco via Prisma.

7. `types/`
Contratos de dominio, DTOs, enums e tipos auxiliares.

8. `styles/`
Tokens, globals e variaveis de tema.

## 5. Estrutura de Pastas Planejada

```text
.
|-- app
|   |-- (auth)
|   |   `-- login
|   |-- (dashboard)
|   |   |-- dashboard
|   |   |-- planejamento
|   |   |-- calendario
|   |   |-- posts
|   |   |-- carrosseis
|   |   |-- reels
|   |   |-- legendas
|   |   |-- hashtags
|   |   |-- agendamentos
|   |   |-- historico
|   |   |-- templates
|   |   |-- integracoes
|   |   `-- configuracoes
|   |-- api
|   |   |-- auth
|   |   |-- dashboard
|   |   |-- content-plans
|   |   |-- contents
|   |   |-- schedules
|   |   |-- templates
|   |   `-- integrations
|   |-- layout.tsx
|   |-- globals.css
|   |-- loading.tsx
|   `-- not-found.tsx
|-- actions
|   |-- auth
|   |-- content-plans
|   |-- contents
|   |-- schedules
|   `-- settings
|-- components
|   |-- ui
|   |-- shell
|   |-- dashboard
|   |-- planning
|   |-- content
|   |-- captions
|   |-- hashtags
|   |-- calendar
|   |-- schedule
|   |-- history
|   |-- templates
|   |-- integrations
|   `-- settings
|-- hooks
|-- lib
|   |-- auth
|   |-- db
|   |-- validations
|   |-- constants
|   |-- utils
|   `-- brand
|-- services
|   |-- ai
|   |-- meta
|   |-- planning
|   |-- publishing
|   |-- scheduling
|   `-- analytics
|-- prisma
|   |-- schema.prisma
|   `-- seed.ts
|-- public
|   |-- brand
|   |-- demo
|   `-- icons
|-- styles
|   `-- tokens.css
|-- types
|-- proxy.ts
|-- .env.example
`-- README.md
```

## 6. Fluxo Principal do Sistema

### Fluxo operacional

1. Admin faz login no painel.
2. Configura ou revisa os dados da marca RB Site.
3. Define o planejamento editorial do mes.
4. Gera conteudos manualmente ou por automacao.
5. Revisa variantes por formato e plataforma.
6. Ajusta legendas, hashtags, CTA e ideia visual.
7. Agenda o melhor horario.
8. Futuramente publica via Meta Graph API.
9. Consulta historico, logs e reaproveita templates.

### Fluxo tecnico

1. UI envia formularios para Server Actions ou Route Handlers.
2. Validacoes com Zod impedem dados invalidos.
3. Services executam regras de negocio e integracoes.
4. Prisma persiste entidades e historico.
5. Scheduler calcula horarios e cria registros de agendamento.
6. Publicador consome os agendamentos quando habilitado.

## 7. Entidades Principais

### `users`

- id
- name
- email
- passwordHash
- role
- avatarUrl
- lastLoginAt
- createdAt
- updatedAt

### `brand_settings`

- id
- companyName
- websiteUrl
- whatsapp
- defaultCta
- voiceTone
- baseHashtags
- postingFrequency
- timezone
- primaryPanelDomain
- visualGuidelines
- createdAt
- updatedAt

### `content_plans`

- id
- month
- year
- monthlyGoal
- weeklyFrequency
- targetAudience
- platforms
- defaultCta
- contentPillars
- notes
- status
- createdBy
- createdAt
- updatedAt

### `contents`

- id
- planId
- title
- theme
- type (`post`, `carousel`, `reel`)
- objective
- platformScope
- funnelStage
- callToAction
- artText
- visualIdea
- bestPostingTime
- status
- createdBy
- createdAt
- updatedAt

### `content_variants`

- id
- contentId
- platform (`instagram`, `facebook`)
- format
- headline
- subheadline
- hook
- slidesJson
- scenesJson
- scriptText
- shortDescription
- createdAt
- updatedAt

### `captions`

- id
- contentId
- platform
- body
- tone
- cta
- createdAt
- updatedAt

### `hashtags`

- id
- contentId
- platform
- tags
- suggestedCount
- createdAt
- updatedAt

### `schedules`

- id
- contentId
- platform
- scheduledFor
- suggestedSlot
- publishedAt
- status
- retryCount
- notes
- createdAt
- updatedAt

### `templates`

- id
- name
- slug
- category
- type
- description
- structureJson
- recommendedObjective
- isSystem
- createdAt
- updatedAt

### `integrations`

- id
- provider (`openai`, `meta`)
- label
- encryptedConfig
- status
- lastCheckedAt
- createdAt
- updatedAt

### `publishing_logs`

- id
- scheduleId
- provider
- requestSummary
- responseSummary
- success
- failureReason
- externalPostId
- createdAt

## 8. Paginas Principais

- `/login`
- `/dashboard`
- `/planejamento`
- `/calendario`
- `/posts`
- `/carrosseis`
- `/reels`
- `/legendas`
- `/hashtags`
- `/agendamentos`
- `/historico`
- `/templates`
- `/integracoes`
- `/configuracoes`

## 9. Rotas Principais de API

### Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`

### Dashboard

- `GET /api/dashboard/overview`

### Planejamento

- `GET /api/content-plans`
- `POST /api/content-plans`
- `PATCH /api/content-plans/:id`
- `POST /api/content-plans/:id/generate-week`
- `POST /api/content-plans/:id/generate-month`

### Conteudo

- `GET /api/contents`
- `POST /api/contents`
- `PATCH /api/contents/:id`
- `POST /api/contents/generate`
- `POST /api/contents/:id/approve`

### Legendas e hashtags

- `POST /api/contents/:id/captions/generate`
- `POST /api/contents/:id/hashtags/generate`

### Agendamento

- `GET /api/schedules`
- `POST /api/schedules`
- `PATCH /api/schedules/:id`
- `POST /api/schedules/recommend-slot`
- `POST /api/internal/schedules/run`

### Templates e integracoes

- `GET /api/templates`
- `POST /api/templates`
- `GET /api/integrations`
- `POST /api/integrations/test`
- `PATCH /api/integrations/:id`

## 10. Componentes Principais

### Shell

- `AppShell`
- `SidebarNav`
- `Topbar`
- `WorkspaceHeader`
- `CommandPalette`
- `UserMenu`

### UI base

- `PremiumCard`
- `MetricCard`
- `DataTable`
- `StatusBadge`
- `EmptyState`
- `PageSection`
- `SkeletonBlock`

### Modulos de negocio

- `PlanningForm`
- `PillarSelector`
- `MonthlyGoalCard`
- `ContentGeneratorForm`
- `GeneratedContentPreview`
- `CarouselSlidesEditor`
- `ReelSceneTimeline`
- `CaptionPanel`
- `HashtagPanel`
- `EditorialCalendar`
- `ScheduleDrawer`
- `HistoryFilters`
- `TemplateLibraryGrid`
- `IntegrationCard`
- `BrandSettingsForm`

## 11. Servicos de Integracao

### `services/ai/openai-content-service.ts`

Responsabilidades:

- montar prompts com contexto da RB Site
- gerar posts, carrosseis, reels, legendas e hashtags
- suportar modo mock e modo API real
- registrar uso e respostas

### `services/meta/meta-publishing-service.ts`

Responsabilidades:

- validar configuracao Meta
- publicar em Instagram/Facebook no futuro
- consultar status de publicacao
- registrar logs de falha e sucesso

### `services/scheduling/schedule-recommendation-service.ts`

Responsabilidades:

- sugerir horarios com base nas regras fixas iniciais
- permitir evolucao para regras por plataforma, historico e audiencia

### `services/publishing/publishing-orchestrator.ts`

Responsabilidades:

- buscar agendamentos pendentes
- disparar publicacoes
- atualizar status
- persistir logs

### `services/planning/editorial-planner-service.ts`

Responsabilidades:

- gerar semanas ou meses editoriais
- distribuir pilares, formatos e funil
- evitar repeticao de temas

## 12. Estrategia de Compatibilidade com Subdominio

Compatibilidade com subdominio e um requisito central, nao um ajuste posterior.

### Decisoes

- a aplicacao sera independente do site institucional
- URLs absolutas serao controladas por envs como `APP_URL`
- autenticacao usara cookies seguros com configuracao compativel com subdominio alvo
- o build sera `standalone`, ideal para VPS e containers
- assets e links internos nao dependerao da raiz do site principal

### Exemplo de deploy

- site institucional: `https://rbsite.com.br`
- painel SaaS: `https://painel.rbsite.com.br`

### Regras tecnicas

- usar `NEXTAUTH_URL` apontando para o subdominio real
- definir `NEXT_PUBLIC_APP_URL` para gerar links corretos
- configurar cookies `secure` em producao
- evitar hardcode de dominio em componentes ou services
- manter `basePath` desativado inicialmente para simplificar deploy em subdominio dedicado
- reverse proxy encaminhando trafego HTTPS para a porta do app Next

### Estrategia de infraestrutura

- VPS Hostinger com Node.js + PostgreSQL remoto ou gerenciado
- Nginx/Caddy para SSL, compressao e proxy
- Railway/Render como alternativa com as mesmas envs
- cron do servidor ou job agendado do provedor chamando rota interna autenticada para processar agendamentos

## 13. Decisoes de Seguranca

- acesso restrito a administradores
- rotas privadas protegidas por middleware
- chaves sensiveis criptografadas em repouso
- validacoes de entrada com Zod
- logs de integracao sem expor tokens inteiros
- rate limiting nas rotas de auth e integracao
- cabecalhos seguros configurados no proxy e no app

## 14. Estrategia para as Proximas Etapas

### ETAPA 2

- scaffold Next.js com App Router
- Tailwind
- tokens visuais iniciais
- estrutura de pastas
- providers globais
- `.env.example`

### ETAPA 3 em diante

- shell premium primeiro
- autenticacao antes do banco real completo
- Prisma e seeds cedo para evitar telas vazias
- modulos de negocio evoluindo sobre a mesma base de componentes

## 15. Resultado da ETAPA 1

Esta etapa fecha a fundacao conceitual do projeto com:

- stack escolhida
- arquitetura modular definida
- estrutura de pastas planejada
- mapa de entidades
- mapa de paginas e rotas
- mapa de componentes
- estrategia de integracao
- direcao visual inicial
- estrategia de deploy e subdominio

Com isso, a ETAPA 2 pode ser iniciada sem retrabalho estrutural.
