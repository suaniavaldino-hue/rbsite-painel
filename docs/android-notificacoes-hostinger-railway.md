# Android no Painel RB Site

Este fluxo conecta o painel `https://painel.rbsite.com.br` a notificacoes push no Android via QR Code.

## O que ja esta pronto

- QR Code temporario no painel
- pagina de pareamento mobile
- Service Worker para notificacoes
- envio de alertas de `posts`, `agenda` e `system`
- listagem de aparelhos conectados

## O que precisa existir no Railway

Preencha estas variaveis no backend:

```env
PANEL_BASE_URL=https://painel.rbsite.com.br
WEB_PUSH_VAPID_PUBLIC_KEY=
WEB_PUSH_VAPID_PRIVATE_KEY=
WEB_PUSH_VAPID_SUBJECT=mailto:contato@rbsite.com.br
MOBILE_PAIRING_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_CONTENTS_TABLE=contents
```

## Como gerar as chaves VAPID

No projeto do backend, use:

```bash
npx web-push generate-vapid-keys
```

Copie a chave publica para `WEB_PUSH_VAPID_PUBLIC_KEY` e a privada para `WEB_PUSH_VAPID_PRIVATE_KEY`.

Para `MOBILE_PAIRING_SECRET`, use um segredo longo e aleatorio.

Exemplo:

```bash
openssl rand -base64 48
```

## Como validar se o backend esta pronto

Abra:

- `https://rbsite-backend-production.up.railway.app/health`
- `https://rbsite-backend-production.up.railway.app/notifications/config`

Os campos precisam ficar assim:

- `pushConfigured: true`
- `pairingConfigured: true`
- `pushAvailable: true`
- `pairingAvailable: true`

## Arquivos que devem ser enviados para a Hostinger

Publique estes arquivos do painel:

- `dashboard.html`
- `mobile-link.html`
- `manifest.webmanifest`
- `rbsite-icon.svg`
- `service-worker.js`
- `css/style.css`
- `js/api.js`
- `js/app.js`
- `js/mobile-link.js`

## Fluxo de uso no Android

1. Abrir o painel em `https://painel.rbsite.com.br/dashboard.html`
2. Clicar em `Gerar QR Seguro`
3. Escanear o QR Code com o Android
4. Abrir `mobile-link.html`
5. Permitir notificacoes
6. Tocar em `Ativar notificacoes`
7. Voltar ao painel e usar `Enviar teste`

## Observacoes de seguranca

- o frontend nunca recebe a chave privada VAPID
- o token do QR expira em poucos minutos
- o backend valida assinatura do token antes de aceitar o pareamento
- use sempre HTTPS no subdominio
- nao use `SUPABASE_ANON_KEY` se voce puder usar `SUPABASE_SERVICE_ROLE_KEY` no backend
