CREATE TYPE "public"."account_status" AS ENUM('active', 'inactive', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."automation_result" AS ENUM('SUCESSO', 'FALHOU', 'IGNORADO');--> statement-breakpoint
CREATE TYPE "public"."promotion_status" AS ENUM('RASCUNHO', 'ATIVA', 'ENCERRADA', 'FALHOU');--> statement-breakpoint
CREATE TYPE "public"."promotion_type" AS ENUM('DISCOUNT', 'FLASH_SALE', 'COMBO');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"nome" text NOT NULL,
	"shopee_shop_id" text NOT NULL,
	"shopee_token" text,
	"shopee_refresh_token" text,
	"shopee_token_expires_at" timestamp with time zone,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"nome" text NOT NULL,
	"custo" numeric(12, 2) NOT NULL,
	"preco_base" numeric(12, 2) NOT NULL,
	"preco_minimo" numeric(12, 2) NOT NULL,
	"estoque" integer DEFAULT 0 NOT NULL,
	"em_campanha_ativa" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"product_id" uuid NOT NULL,
	"shopee_promo" numeric(12, 2),
	"shopee_min" numeric(12, 2),
	"ml_promo" numeric(12, 2),
	"ml_min" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"tipo" "promotion_type" NOT NULL,
	"status" "promotion_status" DEFAULT 'RASCUNHO' NOT NULL,
	"shopee_promotion_id" text,
	"inicio" timestamp with time zone NOT NULL,
	"fim" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promotion_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"preco_promo" numeric(12, 2) NOT NULL,
	"preco_min" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"condicoes_json" jsonb NOT NULL,
	"acoes_json" jsonb NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "automation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"produto_id" uuid,
	"regra_id" uuid,
	"resultado" "automation_result" NOT NULL,
	"api_response" jsonb,
	"preco_calculado" numeric(12, 2),
	"motivo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_prices" ADD CONSTRAINT "campaign_prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_items" ADD CONSTRAINT "promotion_items_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_items" ADD CONSTRAINT "promotion_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_produto_id_products_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_regra_id_automation_rules_id_fk" FOREIGN KEY ("regra_id") REFERENCES "public"."automation_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_tenant_id_idx" ON "accounts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "products_tenant_id_idx" ON "products" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "products_sku_idx" ON "products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "products_em_campanha_ativa_idx" ON "products" USING btree ("em_campanha_ativa");--> statement-breakpoint
CREATE INDEX "campaign_prices_tenant_id_idx" ON "campaign_prices" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "promotions_tenant_id_idx" ON "promotions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "promotions_status_idx" ON "promotions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "promotions_inicio_idx" ON "promotions" USING btree ("inicio");--> statement-breakpoint
CREATE INDEX "promotions_fim_idx" ON "promotions" USING btree ("fim");--> statement-breakpoint
CREATE INDEX "automation_rules_tenant_id_idx" ON "automation_rules" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "automation_logs_tenant_id_idx" ON "automation_logs" USING btree ("tenant_id");