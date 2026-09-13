# SixCore Remote Panel

Painel web da plataforma SixCore Remote. **v1.0.0 MVP implantável**.

## Funcional nesta versão

- autenticação própria por e-mail e senha com scrypt e salt individual;
- sessão opaca com somente SHA-256 do token armazenado no PostgreSQL;
- cookie HttpOnly, Secure em produção e SameSite=Strict;
- rate limit/bloqueio temporário após cinco falhas na janela configurada;
- RBAC `admin`, `operator` e `viewer`;
- empresas;
- MikroTiks com IP SSTP real e portas configuráveis;
- senha individual gerada por dispositivo e cifrada com AES-256-GCM;
- senha do MikroTik exibida somente na criação;
- dashboard e página individual do equipamento;
- consulta TCP de SSH e WebFig via gateway, sem acesso direto do navegador;
- histórico de status e auditoria essencial;
- gerenciamento inicial de usuários e troca da própria senha;
- migrations versionadas e bootstrap idempotente;
- Docker multi-stage com Next.js standalone.

O build não conecta ao PostgreSQL. Migrations/bootstrap rodam apenas no startup do container.

Veja `DEPLOY_EASYPANEL.md` para colocar a versão em produção.
