# Deploy de Producao em painel.rbsite.com.br

Este guia prepara o projeto para rodar em producao no subdominio:

- `https://painel.rbsite.com.br`

O fluxo abaixo foi pensado para:

- VPS Linux
- Hostinger VPS
- Node.js em processo `systemd`
- `nginx` como reverse proxy
- SSL com Let's Encrypt
- build `standalone` do Next.js

## 1. Resumo da estrategia

Arquitetura recomendada em producao:

1. DNS do subdominio aponta para o IP publico da VPS.
2. `nginx` recebe trafego HTTP/HTTPS.
3. `nginx` termina SSL e faz proxy para a aplicacao Next.js.
4. A aplicacao roda via `systemd` em `127.0.0.1:3000`.
5. O banco PostgreSQL pode estar na propria VPS ou em um host externo.

## 2. Arquivos prontos no projeto

Os seguintes arquivos ja foram adicionados para facilitar o deploy:

- [Dockerfile](</C:/Users/bruce/OneDrive/Desktop/PROJETOS/rb site/Sistema SM/Dockerfile>)
- [.dockerignore](</C:/Users/bruce/OneDrive/Desktop/PROJETOS/rb site/Sistema SM/.dockerignore>)
- [.env.production.example](</C:/Users/bruce/OneDrive/Desktop/PROJETOS/rb site/Sistema SM/.env.production.example>)
- [painel.rbsite.com.br.conf](</C:/Users/bruce/OneDrive/Desktop/PROJETOS/rb site/Sistema SM/deploy/nginx/painel.rbsite.com.br.conf>)
- [rbsite-social-automation.service](</C:/Users/bruce/OneDrive/Desktop/PROJETOS/rb site/Sistema SM/deploy/systemd/rbsite-social-automation.service>)
- [release.sh](</C:/Users/bruce/OneDrive/Desktop/PROJETOS/rb site/Sistema SM/deploy/scripts/release.sh>)

## 3. DNS do subdominio

No painel DNS da `rbsite.com.br`, crie ou ajuste:

- Tipo: `A`
- Host: `painel`
- Valor: `IP_PUBLICO_DA_VPS`
- TTL: `300` ou automatico

Se a hospedagem usar IPv6, opcionalmente adicione:

- Tipo: `AAAA`
- Host: `painel`
- Valor: `IPV6_DA_VPS`

Valide a propagacao:

```bash
nslookup painel.rbsite.com.br
```

## 4. Preparacao da VPS

Exemplo considerando Ubuntu 24.04 ou similar.

### Atualize o sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### Instale pacotes base

```bash
sudo apt install -y nginx certbot python3-certbot-nginx curl git unzip ufw
```

### Instale Node.js 22

O projeto exige Node `>=22`.

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

## 5. Firewall

Abra apenas o necessario:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

## 6. Estrutura recomendada de diretorios

```text
/var/www/rbsite-social-automation/current
/etc/rbsite-social-automation/painel.env
```

Crie o usuario e a estrutura:

```bash
sudo useradd -r -m -d /var/www/rbsite-social-automation -s /bin/bash rbsite || true
sudo mkdir -p /var/www/rbsite-social-automation/current
sudo mkdir -p /etc/rbsite-social-automation
sudo chown -R rbsite:rbsite /var/www/rbsite-social-automation
sudo chown -R rbsite:rbsite /etc/rbsite-social-automation
```

## 7. Subindo o codigo

Opcao com git:

```bash
sudo -u rbsite git clone <URL_DO_REPOSITORIO> /var/www/rbsite-social-automation/current
cd /var/www/rbsite-social-automation/current
```

Opcao por upload:

1. Envie os arquivos para `/var/www/rbsite-social-automation/current`
2. Garanta que `package.json` e `package-lock.json` foram enviados

## 8. Variaveis de ambiente de producao

Use o arquivo exemplo:

```bash
cp .env.production.example /tmp/painel.env
```

Depois mova para o caminho final:

```bash
sudo mv /tmp/painel.env /etc/rbsite-social-automation/painel.env
sudo chown rbsite:rbsite /etc/rbsite-social-automation/painel.env
sudo chmod 600 /etc/rbsite-social-automation/painel.env
```

Valores minimos importantes:

- `NODE_ENV=production`
- `PORT=3000`
- `HOSTNAME=127.0.0.1`
- `NEXT_PUBLIC_APP_URL=https://painel.rbsite.com.br`
- `NEXTAUTH_URL=https://painel.rbsite.com.br`
- `APP_CANONICAL_HOST=painel.rbsite.com.br`
- `DATABASE_URL=...`
- `AUTH_SECRET=...`
- `AUTH_ADMIN_EMAIL=admin@rbsite.com.br`
- `AUTH_ADMIN_NAME=Administrador RB Site`
- `AUTH_ADMIN_PASSWORD_HASH=...`
- `AUTH_SESSION_MAX_AGE=43200`
- `AUTH_ADMIN_2FA_ENABLED=false`
- `AUTH_ADMIN_2FA_SECRET=...` se quiser bootstrap inicial de 2FA
- `AUTH_SECURITY_DATA_DIR=/var/lib/rbsite-social-automation/security`
- `AUTH_LOGIN_MAX_FAILURES=5`
- `AUTH_LOGIN_WINDOW_MINUTES=15`
- `AUTH_LOGIN_LOCK_DURATION_MINUTES=15`
- `AUTH_RESET_TOKEN_TTL_MINUTES=60`
- `AUTH_SHOW_RESET_TOKEN_PREVIEW=false`
- `ENCRYPTION_KEY=...`
- `CRON_SECRET=...`

Se for usar IA e publicacao social:

- `OPENAI_API_KEY=...`
- `META_GRAPH_API_TOKEN=...`
- `META_FACEBOOK_PAGE_ID=...`
- `META_INSTAGRAM_BUSINESS_ID=...`

Se quiser compartilhar sessao entre subdominios do mesmo dominio raiz:

- `AUTH_COOKIE_DOMAIN=.rbsite.com.br`

Para um painel isolado somente em `painel.rbsite.com.br`, deixe `AUTH_COOKIE_DOMAIN` vazio.

Antes do primeiro deploy, gere o hash da senha administrativa localmente:

```bash
npm run auth:hash -- "SUA-SENHA-FORTE"
```

Cole a saida diretamente em `AUTH_ADMIN_PASSWORD_HASH`.

Crie tambem o diretório seguro de runtime:

```bash
sudo mkdir -p /var/lib/rbsite-social-automation/security
sudo chown -R rbsite:rbsite /var/lib/rbsite-social-automation
sudo chown -R rbsite:rbsite /var/lib/rbsite-social-automation/security
sudo chmod 700 /var/lib/rbsite-social-automation/security
```

## 9. Instalacao e build

Rode tudo como usuario da aplicacao:

```bash
sudo -u rbsite bash -lc 'cd /var/www/rbsite-social-automation/current && npm ci'
sudo -u rbsite bash -lc 'cd /var/www/rbsite-social-automation/current && npm run lint'
sudo -u rbsite bash -lc 'cd /var/www/rbsite-social-automation/current && npm run typecheck'
sudo -u rbsite bash -lc 'cd /var/www/rbsite-social-automation/current && npm run build'
```

## 10. Configurando o systemd

Copie o arquivo pronto:

```bash
sudo cp deploy/systemd/rbsite-social-automation.service /etc/systemd/system/rbsite-social-automation.service
sudo systemctl daemon-reload
sudo systemctl enable rbsite-social-automation
sudo systemctl start rbsite-social-automation
```

Valide:

```bash
sudo systemctl status rbsite-social-automation --no-pager
journalctl -u rbsite-social-automation -n 100 --no-pager
```

## 11. Configurando o nginx

Copie o template:

```bash
sudo cp deploy/nginx/painel.rbsite.com.br.conf /etc/nginx/sites-available/painel.rbsite.com.br
sudo ln -sf /etc/nginx/sites-available/painel.rbsite.com.br /etc/nginx/sites-enabled/painel.rbsite.com.br
sudo nginx -t
sudo systemctl reload nginx
```

Se houver o site padrao habilitado, remova:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 12. SSL com Let's Encrypt

Depois que o DNS estiver propagado:

```bash
sudo certbot --nginx -d painel.rbsite.com.br
```

Teste a renovacao:

```bash
sudo certbot renew --dry-run
```

## 13. Smoke tests

### Teste local na VPS

```bash
curl http://127.0.0.1:3000/api/health
```

### Teste publico

```bash
curl https://painel.rbsite.com.br/api/health
```

Voce deve receber JSON com `status: "ok"`.

## 14. Procedimento de atualizacao

No deploy seguinte:

```bash
cd /var/www/rbsite-social-automation/current
git pull
npm ci
npm run build
sudo systemctl restart rbsite-social-automation
```

Ou use o script pronto:

```bash
chmod +x deploy/scripts/release.sh
./deploy/scripts/release.sh
```

## 15. Banco de dados

Para producao, prefira:

- PostgreSQL gerenciado, ou
- PostgreSQL separado da camada web

Boas praticas:

- nao exponha o banco publicamente sem restricao de IP
- use senha forte e usuario dedicado
- habilite backups diarios
- use SSL no banco se o provedor suportar

## 16. Seguranca recomendada

- mantenha a aplicacao ouvindo em `127.0.0.1`
- exponha so `80` e `443`
- use `chmod 600` no arquivo de ambiente
- use `chmod 700` no diretório definido em `AUTH_SECURITY_DATA_DIR`
- gere segredos fortes para `AUTH_SECRET`, `ENCRYPTION_KEY` e `CRON_SECRET`
- nunca armazene senha admin em texto puro no arquivo de ambiente
- deixe `AUTH_SHOW_RESET_TOKEN_PREVIEW=false` em producao
- confira que `NEXTAUTH_URL` e `NEXT_PUBLIC_APP_URL` usam `https://`
- monitore logs do `systemd` e `nginx`
- nunca comite `.env.production`

## 16.1 Checklist rapido de endurecimento

- SSL emitido e renovacao testada
- `NEXTAUTH_URL` com HTTPS
- `AUTH_SECRET` forte e unico
- hash Argon2id gerado e salvo em `AUTH_ADMIN_PASSWORD_HASH`
- diretório `AUTH_SECURITY_DATA_DIR` com permissao restrita
- preview de reset desligado em producao
- cookies compartilhados apenas se necessario com `AUTH_COOKIE_DOMAIN`
- OpenAI e Meta tokens presentes somente no backend
- painel respondendo em `https://painel.rbsite.com.br`

## 17. Docker opcional

Se quiser usar container:

```bash
docker build -t rbsite-social-automation .
docker run -d \
  --name rbsite-social-automation \
  --restart unless-stopped \
  --env-file /etc/rbsite-social-automation/painel.env \
  -p 127.0.0.1:3000:3000 \
  rbsite-social-automation
```

Nesse caso, o `nginx` continua apontando para `127.0.0.1:3000`.

## 18. Railway ou Render

O projeto ja esta com `output: "standalone"` e tambem pode subir em plataformas como Railway ou Render.

Configuracoes recomendadas:

- comando de build: `npm run build`
- comando de start: `npm run start`
- Node.js 22
- mesmas envs do arquivo `.env.production.example`
- dominio customizado apontando para `painel.rbsite.com.br`

## 19. Checklist final

- DNS `painel.rbsite.com.br` apontando para a VPS
- Node 22 instalado
- `npm ci` executado sem erro
- `npm run build` executado sem erro
- `systemd` ativo
- `nginx` valido
- SSL emitido com sucesso
- `https://painel.rbsite.com.br/api/health` respondendo
- envs de OpenAI e Meta preenchidas se essas integracoes forem usadas
