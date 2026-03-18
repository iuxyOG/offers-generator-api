-- Initial migration: create all tables, indexes, and RLS policies

-- Enums
CREATE TYPE "promotion_type" AS ENUM ('DISCOUNT', 'FLASH_SALE', 'COMBO');
CREATE TYPE "promotion_status" AS ENUM ('RASCUNHO', 'ATIVA', 'ENCERRADA', 'FALHOU');
CREATE TYPE "automation_result" AS ENUM ('SUCESSO', 'FALHOU', 'IGNORADO');
CREATE TYPE "account_status" AS ENUM ('active', 'inactive', 'suspended');

-- Accounts
CREATE TABLE "accounts" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "tenant_id" text NOT NULL,
  "nome" text NOT NULL,
  "shopee_shop_id" text NOT NULL,
  "shopee_token" text,
  "shopee_refresh_token" text,
  "shopee_token_expires_at" timestamptz,
  "status" "account_status" NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "accounts_tenant_id_idx" ON "accounts" ("tenant_id");

-- Products
CREATE TABLE "products" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "tenant_id" text NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id"),
  "sku" text NOT NULL,
  "nome" text NOT NULL,
  "custo" decimal(12,2) NOT NULL,
  "preco_base" decimal(12,2) NOT NULL,
  "preco_minimo" decimal(12,2) NOT NULL,
  "estoque" integer NOT NULL DEFAULT 0,
  "em_campanha_ativa" boolean NOT NULL DEFAULT false,
  "deleted_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "products_tenant_id_idx" ON "products" ("tenant_id");
CREATE INDEX "products_sku_idx" ON "products" ("sku");
CREATE INDEX "products_em_campanha_ativa_idx" ON "products" ("em_campanha_ativa");

-- Campaign Prices
CREATE TABLE "campaign_prices" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "tenant_id" text NOT NULL,
  "product_id" uuid NOT NULL REFERENCES "products"("id"),
  "shopee_promo" decimal(12,2),
  "shopee_min" decimal(12,2),
  "ml_promo" decimal(12,2),
  "ml_min" decimal(12,2),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "campaign_prices_tenant_id_idx" ON "campaign_prices" ("tenant_id");

-- Promotions
CREATE TABLE "promotions" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "tenant_id" text NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id"),
  "tipo" "promotion_type" NOT NULL,
  "status" "promotion_status" NOT NULL DEFAULT 'RASCUNHO',
  "shopee_promotion_id" text,
  "inicio" timestamptz NOT NULL,
  "fim" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "promotions_tenant_id_idx" ON "promotions" ("tenant_id");
CREATE INDEX "promotions_status_idx" ON "promotions" ("status");
CREATE INDEX "promotions_inicio_idx" ON "promotions" ("inicio");
CREATE INDEX "promotions_fim_idx" ON "promotions" ("fim");

-- Promotion Items
CREATE TABLE "promotion_items" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "promotion_id" uuid NOT NULL REFERENCES "promotions"("id"),
  "product_id" uuid NOT NULL REFERENCES "products"("id"),
  "preco_promo" decimal(12,2) NOT NULL,
  "preco_min" decimal(12,2) NOT NULL
);

-- Automation Rules
CREATE TABLE "automation_rules" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "tenant_id" text NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id"),
  "nome" text NOT NULL,
  "condicoes_json" jsonb NOT NULL,
  "acoes_json" jsonb NOT NULL,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "automation_rules_tenant_id_idx" ON "automation_rules" ("tenant_id");

-- Automation Logs
CREATE TABLE "automation_logs" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "tenant_id" text NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id"),
  "produto_id" uuid REFERENCES "products"("id"),
  "regra_id" uuid REFERENCES "automation_rules"("id"),
  "resultado" "automation_result" NOT NULL,
  "api_response" jsonb,
  "preco_calculado" decimal(12,2),
  "motivo" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "automation_logs_tenant_id_idx" ON "automation_logs" ("tenant_id");

-- ============================================================
-- RLS Policies (tenant isolation via Supabase)
-- Assumes app sets current_setting('app.tenant_id') per request
-- ============================================================

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
