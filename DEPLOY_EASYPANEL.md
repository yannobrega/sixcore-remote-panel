# Deploy SixCore Remote v1.0.0 no EasyPanel

## Serviços

Crie três recursos no EasyPanel:

1. PostgreSQL.
2. Aplicação `sixcore-remote-gateway`.
3. Aplicação `sixcore-remote-panel`.

Para ambos os apps: **Build Path `/`**, **Dockerfile `Dockerfile`**, **porta interna `3000`**.

## DNS

- `access.sixcore.com.br` -> painel.
- `remote.sixcore.com.br` -> gateway.
- `webfig.sixcore.com.br` será usado em fase posterior; nesta v1 ele ainda não deve publicar proxy WebFig.

Ative HTTPS nos domínios antes de usar `NODE_ENV=production`.

## Segredos

Gere localmente e guarde somente nas variáveis runtime do EasyPanel. Exemplos de geração no macOS/zsh:

```bash
openssl rand -base64 32
```

Use a saída exclusivamente como `CREDENTIAL_ENCRYPTION_KEY`.

```bash
openssl rand -base64 48
```

Use a saída exclusivamente como `GATEWAY_API_KEY` e configure exatamente o mesmo valor no painel e no gateway.

A senha inicial do administrador deve ser definida manualmente em `BOOTSTRAP_ADMIN_PASSWORD` e ter pelo menos 12 caracteres.

## Gateway: variáveis runtime

```env
NODE_ENV=production
PORT=3000
GATEWAY_API_KEY=<segredo compartilhado com o painel>
ALLOWED_ORIGINS=https://access.sixcore.com.br
REAL_NETWORK_1=172.18.18.0/24
TRANSLATED_NETWORK_1=192.0.2.0/24
REAL_NETWORK_2=172.17.17.0/24
TRANSLATED_NETWORK_2=192.0.3.0/24
SSH_DEFAULT_PORT=22333
WEBFIG_DEFAULT_PORT=1080
ALLOWED_TCP_PORTS=22333,1080
TCP_CHECK_TIMEOUT_MS=5000
GATEWAY_PUBLIC_URL=https://remote.sixcore.com.br
WEBFIG_PUBLIC_URL=https://webfig.sixcore.com.br
LOG_LEVEL=info
TRUST_PROXY=true
```

Se um equipamento usar uma porta diferente, adicione-a explicitamente a `ALLOWED_TCP_PORTS`; o gateway rejeita portas não autorizadas.

## Painel: variáveis runtime

```env
NODE_ENV=production
APP_URL=https://access.sixcore.com.br
DATABASE_URL=<URL PostgreSQL completa>
BOOTSTRAP_ADMIN_EMAIL=yan.nobrega@sixcore.com.br
BOOTSTRAP_ADMIN_PASSWORD=<senha inicial forte>
CREDENTIAL_ENCRYPTION_KEY=<base64 de exatamente 32 bytes>
GATEWAY_BASE_URL=https://remote.sixcore.com.br
GATEWAY_API_KEY=<mesmo segredo do gateway>
SESSION_COOKIE_NAME=sixcore_remote_session
SESSION_TTL_SECONDS=28800
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCKOUT_SECONDS=900
TRUST_PROXY=true
LOG_LEVEL=info
```

`DATABASE_URL` precisa ser a URL completa, por exemplo no formato `postgresql://usuario:senha@host:5432/banco`. Não use apenas o hostname.

## Ordem de deploy

1. Suba o PostgreSQL e copie a URL interna completa.
2. Suba o gateway e valide `https://remote.sixcore.com.br/health`.
3. Instale as regras de rede da VPS conforme `sixcore-remote-gateway/scripts/network/README.md`.
4. Suba o painel. Na inicialização ele executará migrations e depois o bootstrap idempotente do administrador.
5. Acesse `https://access.sixcore.com.br` e entre com `yan.nobrega@sixcore.com.br` e a senha definida no EasyPanel.
6. Cadastre uma empresa e um MikroTik.
7. Copie a senha SSH gerada no cadastro; ela aparece somente nessa resposta e fica cifrada no PostgreSQL.
8. Abra o dispositivo e use `Atualizar status` para testar as portas SSH e WebFig através do gateway.

## Smoke test

Execute a partir de qualquer máquina com Node 22:

```bash
PANEL_URL=https://access.sixcore.com.br GATEWAY_URL=https://remote.sixcore.com.br node scripts/smoke.mjs
```

Para também validar a API privada, execute localmente sem salvar a chave no histórico compartilhado:

```bash
read -s GATEWAY_API_KEY; export GATEWAY_API_KEY; PANEL_URL=https://access.sixcore.com.br GATEWAY_URL=https://remote.sixcore.com.br node scripts/smoke.mjs; unset GATEWAY_API_KEY
```

## Rollback

Faça rollback da imagem/revisão da aplicação no EasyPanel. As migrations desta versão são aditivas; não execute SQL de downgrade automaticamente. Antes de qualquer rollback envolvendo schema, faça backup do PostgreSQL.

## Backup PostgreSQL

Use as credenciais fornecidas pelo EasyPanel e grave o dump fora da VPS quando possível:

```bash
pg_dump "$DATABASE_URL" --format=custom --file=sixcore-remote-$(date +%Y%m%d-%H%M%S).dump
```

Não inclua dumps contendo credenciais cifradas em repositórios Git.

## Limites desta v1.0.0

A versão é utilizável para autenticação, RBAC básico, empresas, cadastro de MikroTiks, credenciais cifradas, dashboard, verificação TCP SSH/WebFig, usuários e auditoria. Terminal SSH interativo, diagnósticos RouterOS, script de provisionamento e proxy WebFig seguro permanecem deliberadamente desabilitados até as fases seguintes.
