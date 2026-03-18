# CLAUDE.md — Shopee Pricing Automation SaaS

## Visão do projeto
SaaS multi-tenant para automação de precificação e campanhas na Shopee.
Cada tenant = uma conta Shopee. Motor de regras cria campanhas automaticamente
via Shopee Open Platform API.

## Stack
- Frontend: Next.js 14 App Router + Tailwind CSS + shadcn/ui
- Backend: Node.js + Fastify + tRPC
- Database: Supabase (PostgreSQL) com Row Level Security
- ORM: Drizzle ORM
- Auth: Clerk (Organizations = tenants)
- Filas: BullMQ + Upstash Redis
- Automação: n8n self-hosted
- Monorepo: Turborepo
- Deploy: Vercel (web) + Railway (api + workers)
- Observabilidade: Sentry + BetterStack

## Estrutura do monorepo
apps/
  web/          → Next.js frontend
  api/          → Fastify + tRPC
packages/
  db/           → Drizzle schema + queries
  shopee-sdk/   → Wrapper Shopee Open Platform API
  pricing/      → Motor de cálculo de preços
  rules/        → Motor de elegibilidade
  validators/   → Schemas Zod compartilhados
  ui/           → Componentes shadcn/ui compartilhados

## Multi-tenancy
- tenant_id sempre vem do JWT do Clerk (org_id)
- NUNCA filtrar por tenant_id manualmente no backend
- Usar RLS do Supabase para isolamento automático
- Clerk Organization = uma conta Shopee / cliente

## Shopee API
- Base URL: https://partner.shopeemobile.com
- Toda chamada exige assinatura HMAC-SHA256
- Rate limiting: respeitar limites por shop_id
- Todos os erros da API devem ser logados em automation_logs
- Credenciais: partner_id e partner_key nas envs, NUNCA no código

## Convenções de código
- TypeScript strict em todos os pacotes
- Schemas Zod para validação de entrada e saída
- Erros: sempre lançar AppError com código e mensagem
- Logs: structured logging com contexto (tenant_id, shop_id, produto_id)
- Testes: Vitest. Toda função pura do pricing/ e rules/ deve ter teste
- Commits: conventional commits (feat:, fix:, chore:, docs:)

## Banco de dados
- Migrations via Drizzle Kit, NUNCA editar banco manualmente
- Toda tabela tem: id uuid, created_at, updated_at, tenant_id
- RLS ativo em TODAS as tabelas com dados de negócio
- Soft delete: deleted_at nullable (nunca DELETE físico de produto/campanha)

## Regras de negócio críticas
- Nunca criar campanha se preço < preço_minimo do produto
- Nunca criar campanha se margem_real < margem_minima da conta
- Nunca criar campanha se produto já está em campanha ativa
- Nunca criar campanha se estoque < estoque_minimo configurado
- Todo preço calculado deve ser validado ANTES de chamar a API da Shopee
- Toda ação automática DEVE gerar registro em automation_logs

## Variáveis de ambiente obrigatórias
DATABASE_URL, DIRECT_URL (Supabase)
CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
SHOPEE_PARTNER_ID, SHOPEE_PARTNER_KEY
UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
SENTRY_DSN, BETTERSTACK_TOKEN
N8N_WEBHOOK_SECRET

## O que NUNCA fazer
- NUNCA expor SHOPEE_PARTNER_KEY no frontend
- NUNCA chamar Shopee API diretamente do frontend
- NUNCA deletar fisicamente registros de campanhas ou logs
- NUNCA criar campanha sem passar pela validação de elegibilidade
- NUNCA fazer queries sem o filtro de tenant_id (o RLS protege, mas seja explícito)
- NUNCA commitar .env ou secrets