# Guia de Configuração Local — Ofertas

Pré-requisitos: Node.js >= 20, pnpm 9.x instalado globalmente.

```bash
git clone <repo-url> && cd ofertas
pnpm install
```

---

## 1. Supabase — Banco de Dados

### 1.1 Criar projeto

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard) e clique em **New Project**.
2. Escolha uma organização (ou crie uma), defina o nome do projeto (ex: `ofertas-dev`) e uma senha forte para o banco.
3. Selecione a região mais próxima (ex: `South America (São Paulo)`).
4. Clique em **Create new project** e aguarde o provisionamento (~2 min).

### 1.2 Obter as connection strings

1. No dashboard do projeto, vá em **Settings > Database**.
2. Na seção **Connection string**, copie:
   - **URI** (modo `Transaction` / porta 6543) → será o `DATABASE_URL`
   - **URI** (modo `Session` / porta 5432) → será o `DIRECT_URL`
3. Em ambas as URIs, substitua `[YOUR-PASSWORD]` pela senha que você definiu ao criar o projeto.

> **Formato esperado:**
> ```
> DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
> DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
> ```

### 1.3 Desabilitar RLS temporariamente para o service role

O Drizzle ORM conecta como `postgres` (service role), que tem bypass de RLS por padrão. As policies que criaremos protegem somente conexões via client/anon key.

---

## 2. Clerk — Autenticação e Organizations

### 2.1 Criar aplicação

1. Acesse [dashboard.clerk.com](https://dashboard.clerk.com) e clique em **Create application**.
2. Nomeie como `Ofertas Dev`.
3. Habilite os métodos de login desejados (Email + Google é o mínimo recomendado).
4. Clique em **Create application**.

### 2.2 Habilitar Organizations

1. No dashboard do Clerk, vá em **Organizations** no menu lateral.
2. Clique em **Enable Organizations**.
3. Em **Settings**, marque:
   - [x] Allow users to create organizations
   - [x] Allow users to delete organizations
4. Salve.

> Cada Organization no Clerk = um tenant no Ofertas. O `org_id` do JWT vira o `tenant_id` no banco.

### 2.3 Obter as keys

1. Vá em **API Keys** no menu lateral.
2. Copie:
   - **Publishable key** (começa com `pk_test_...`) → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Secret key** (começa com `sk_test_...`) → `CLERK_SECRET_KEY`

---

## 3. Configurar o .env

Copie o arquivo de exemplo e preencha com os valores obtidos nos passos anteriores:

```bash
cp .env.example .env
```

Edite o `.env`:

```env
# Supabase (passo 1.2)
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres

# Clerk (passo 2.3)
CLERK_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx

# Shopee — preencha quando tiver credenciais do Partner Portal
SHOPEE_PARTNER_ID=000000
SHOPEE_PARTNER_KEY=your_partner_key_here

# Upstash Redis (passo 7)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Observabilidade — opcionais para dev local
SENTRY_DSN=
BETTERSTACK_TOKEN=

# n8n — opcional para dev local
N8N_WEBHOOK_SECRET=dev-secret
```

O `.env` é carregado por ambos os apps (web e api). Garanta que o arquivo está na **raiz do monorepo**.

> **IMPORTANTE:** O arquivo `.env` já está no `.gitignore`. NUNCA faça commit dele.

---

## 4. Criar as tabelas com Drizzle Kit

O Drizzle Kit usa o schema TypeScript em `packages/db/src/schema/` como fonte de verdade e sincroniza com o banco.

```bash
cd packages/db
pnpm db:push
```

O comando `drizzle-kit push` vai:
- Ler todas as definições de tabelas, indexes e enums do schema Drizzle
- Comparar com o estado atual do banco (que está vazio)
- Criar todas as 7 tabelas, indexes e enums automaticamente

Se preferir gerar o SQL sem executar, use:
```bash
pnpm db:generate   # gera migration SQL em packages/db/drizzle/
```

Para visualizar o banco em uma UI:
```bash
pnpm db:studio     # abre Drizzle Studio no navegador
```

---

## 5. Aplicar as RLS Policies

O `drizzle-kit push` **NÃO** aplica RLS policies (elas são SQL puro, fora do schema Drizzle). Você precisa executá-las manualmente:

### Opção A — Via Supabase SQL Editor (recomendado)

1. No dashboard do Supabase, vá em **SQL Editor**.
2. Clique em **New query**.
3. Copie e cole o conteúdo do arquivo `packages/db/drizzle/0000_initial.sql`, **somente a seção de RLS** (a partir da linha `-- RLS Policies`):

```sql
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounts_tenant_isolation" ON "accounts"
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_tenant_isolation" ON "products"
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE "campaign_prices" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaign_prices_tenant_isolation" ON "campaign_prices"
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE "promotions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promotions_tenant_isolation" ON "promotions"
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE "automation_rules" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automation_rules_tenant_isolation" ON "automation_rules"
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE "automation_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automation_logs_tenant_isolation" ON "automation_logs"
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
```

4. Clique em **Run**.

### Opção B — Via psql

```bash
psql "$DIRECT_URL" -f packages/db/drizzle/0000_initial.sql
```

> Nota: se as tabelas já existirem (criadas pelo `drizzle-kit push`), os `CREATE TABLE` vão falhar mas os `ALTER TABLE` e `CREATE POLICY` ao final serão aplicados. Você pode extrair só a seção RLS se preferir.

---

## 6. Iniciar o projeto localmente

Na raiz do monorepo:

```bash
pnpm dev
```

O Turborepo inicia todos os serviços em paralelo:

| Serviço         | URL                         | Descrição                |
|-----------------|-----------------------------|--------------------------|
| `@ofertas/web`  | http://localhost:3000        | Frontend Next.js         |
| `@ofertas/api`  | http://localhost:3001        | API Fastify + tRPC       |
| `@ofertas/api`  | http://localhost:3001/health | Health check             |
| `@ofertas/api`  | http://localhost:3001/trpc   | Endpoint tRPC            |

### Verificar que está funcionando

1. Acesse http://localhost:3000 — deve redirecionar para `/login` (Clerk).
2. Faça login e crie uma Organization (será seu tenant).
3. Acesse http://localhost:3001/health — deve retornar `{"status":"ok"}`.

### Troubleshooting

- **"CLERK_SECRET_KEY is not set"**: verifique se o `.env` está na raiz e se o valor não tem espaços.
- **"connection refused" no banco**: verifique se o `DATABASE_URL` usa a porta correta (6543 para pooler).
- **Páginas em branco**: verifique o console do navegador — pode ser CORS. A API já aceita todas as origins em dev.

---

## 7. Upstash Redis — BullMQ

O BullMQ precisa de uma instância Redis para gerenciar filas de jobs (sync de catálogo, automação).

### 7.1 Criar banco no Upstash

1. Acesse [console.upstash.com](https://console.upstash.com) e clique em **Create Database**.
2. Nomeie como `ofertas-dev`.
3. Selecione a região mais próxima (ex: `sa-east-1`).
4. Em **Type**, selecione **Regional** (é gratuito no free tier).
5. Clique em **Create**.

### 7.2 Obter as credenciais

1. Na página do banco criado, vá na aba **Details**.
2. Copie:
   - **Endpoint** → `UPSTASH_REDIS_REST_URL` (formato: `rediss://default:xxx@xxx.upstash.io:6379`)
   - **Password** → `UPSTASH_REDIS_REST_TOKEN`

> **Atenção:** O BullMQ usa a conexão Redis nativa (não a REST API). O `UPSTASH_REDIS_REST_URL` deve ser a URL completa `rediss://...` (com TLS).

### 7.3 Atualizar o .env

```env
UPSTASH_REDIS_REST_URL=rediss://default:xxxxx@xxxxx.upstash.io:6379
UPSTASH_REDIS_REST_TOKEN=xxxxx
```

### 7.4 Alternativa: Redis local com Docker

Se preferir não usar Upstash para dev, rode um Redis local:

```bash
docker run -d --name ofertas-redis -p 6379:6379 redis:7-alpine
```

E no `.env`:
```env
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
# deixe UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN vazios
```

O código em `apps/api/src/jobs/redis.ts` detecta automaticamente: se as variáveis do Upstash existem, usa Upstash; senão, conecta em `localhost:6379`.

### 7.5 Verificar conexão

Após iniciar o projeto com `pnpm dev`, verifique os logs da API. Deve aparecer:
```
[workers] Starting BullMQ workers...
[workers] Workers started
```

Se houver erro de conexão Redis, verifique as credenciais no `.env`.
